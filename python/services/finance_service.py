"""Company finances, split into focused slices so each frontend module fetches
only what it renders (and, since DataStore groups load lazily, only touches the
tables it actually needs):

  get_finance_summary   — balance, profit/loss, and lightweight wage/standing KPIs
  get_finance_history   — income/expense/net/balance per period, over time
  get_finance_breakdown — current-period income & expense lines with drill-down
  get_wage_bill          — the wage bill total and top earners from contracts
  get_finance_standing   — rank vs other promotions by revenue, with a peer list

tblFinance holds one cumulative row per fed for the current period; each top-level
Inc_/Exp_ column is the category total and its _sub columns are components.
tblFinanceHistory holds the same lines per past period (Howlong = periods ago,
FinalMoney = balance at period end) — empty until the game accrues history.
"""
from core.datastore import get_store, register_warm_hook
from models import get_positions

INCOME_LINES = [
    ("Inc_Ticket", "Ticket Sales"),
    ("Inc_Merchandise", "Merchandise"),
    ("Inc_Sponsor", "Sponsorship"),
    ("Inc_PPVRev", "Events / PPV"),
    ("Inc_Broadcast", "Broadcasting"),
    ("Inc_Media", "Media"),
    ("Inc_Alliance", "Alliance"),
    ("Inc_Dev", "Development"),
    ("Inc_Misc", "Miscellaneous"),
]

EXPENSE_LINES = [
    ("Exp_Worker", "Worker Pay"),
    ("Exp_Production", "Production"),
    ("Exp_Showcosts", "Show Costs"),
    ("Exp_Marketing", "Marketing"),
    ("Exp_Dojo", "Dojo"),
    ("Exp_Merchandise", "Merchandise"),
    ("Exp_Media", "Media"),
    ("Exp_Alliance", "Alliance"),
    ("Exp_Tax", "Tax"),
    ("Exp_Dev", "Development"),
    ("Exp_Misc", "Miscellaneous"),
]

# Parent line -> component sub-lines, for drill-down.
SUB_LINES = {
    "Inc_Merchandise": [("Inc_Merchandise_Live", "Live Sales"), ("Inc_Merchandise_Mail", "Mail Order")],
    "Inc_Broadcast": [("Inc_Broadcast_Ad", "Advertising"), ("Inc_Broadcast_Caster", "Broadcaster")],
    "Inc_Misc": [("Inc_Misc_Trade", "Trade"), ("Inc_Misc_Sale", "Sale"), ("Inc_Misc_Narrative", "Narrative")],
    "Exp_Worker": [
        ("Exp_Worker_Pay", "Pay"), ("Exp_Worker_Bonus", "Bonuses"), ("Exp_Worker_Sign", "Signing Fees"),
        ("Exp_Worker_Release", "Releases"), ("Exp_Worker_Drug", "Drug Testing"), ("Exp_Worker_Lawsuit", "Lawsuits"),
    ],
    "Exp_Showcosts": [
        ("Exp_Showcosts_Hire", "Venue Hire"), ("Exp_Showcosts_General", "General"),
        ("Exp_Showcosts_Special", "Special"), ("Exp_Showcosts_Fine", "Fines"), ("Exp_Showcosts_Misc", "Misc"),
    ],
    "Exp_Marketing": [("Exp_Marketing_General", "General"), ("Exp_Marketing_Show", "Per-Show")],
    "Exp_Merchandise": [("Exp_Merchandise_Running", "Running"), ("Exp_Merchandise_Upgrade", "Upgrades")],
    "Exp_Production": [("Exp_Production_Running", "Running"), ("Exp_Production_Upgrade", "Upgrades")],
    "Exp_Dojo": [("Exp_Dojo_Running", "Running"), ("Exp_Dojo_Upgrade", "Upgrades"), ("Exp_Dojo_Create", "Creation")],
    "Exp_Media": [
        ("Exp_Media_Running", "Running"), ("Exp_Media_Buy", "Buy"),
        ("Exp_Media_PerShow", "Per-Show"), ("Exp_Media_Fine", "Fines"),
    ],
    "Exp_Misc": [
        ("Exp_Misc_Admin", "Admin"), ("Exp_Misc_General", "General"), ("Exp_Misc_Invest", "Investment"),
        ("Exp_Misc_Legal", "Legal"), ("Exp_Misc_Trade", "Trade"), ("Exp_Misc_Narrative", "Narrative"),
        ("Exp_Misc_Scandal", "Scandal"),
    ],
    "Exp_Alliance": [("Exp_Alliance_Admin", "Admin")],
}


def _pct(part: int, whole: int) -> float:
    return round(part / whole * 100, 1) if whole else 0.0


def _line(row: dict, key: str, label: str, total: int) -> dict:
    value = int(row.get(key) or 0)
    children = [
        {"key": ck, "label": clabel, "value": int(row.get(ck) or 0)}
        for ck, clabel in SUB_LINES.get(key, [])
        if int(row.get(ck) or 0)
    ]
    children.sort(key=lambda c: c["value"], reverse=True)
    return {"key": key, "label": label, "value": value, "pct": _pct(value, total), "children": children}


def _lines(row: dict, defs, total: int) -> list[dict]:
    out = [_line(row, k, label, total) for k, label in defs]
    return sorted([line for line in out if line["value"] != 0], key=lambda line: line["value"], reverse=True)


def _totals(row: dict) -> tuple[int, int]:
    income = sum(int(row.get(k) or 0) for k, _ in INCOME_LINES)
    expense = sum(int(row.get(k) or 0) for k, _ in EXPENSE_LINES)
    return income, expense


def _fin_row(store, fed_uid: int) -> dict | None:
    return next((r for r in store.finance if r.get("Fed") == fed_uid), None)


def _balance(store, fed_uid: int) -> int:
    fed_row = store.feds.get(fed_uid)
    return int(fed_row.get("Money") or 0) if fed_row else 0


def _current_totals(store, fed_uid: int) -> tuple[int, int]:
    fin_row = _fin_row(store, fed_uid)
    return _totals(fin_row) if fin_row else (0, 0)


def _wage_earners(store, fed_uid: int) -> tuple[list[dict], int]:
    total = 0
    earners = []
    for c in store.contracts_by_fed.get(fed_uid, []):
        amount = int(c.get("Amount") or 0)
        if amount <= 0:
            continue
        total += amount
        w = store.workers.get(c.get("WorkerUID"))
        name = (c.get("Name") or (w.get("Name") if w else "") or "").strip() or "Unknown"
        picture = c.get("Picture") or (w.get("Picture") if w else "") or ""
        positions = get_positions(c)
        earners.append({
            "uid": c.get("WorkerUID"), "name": name, "amount": amount, "picture": picture,
            "position": positions[0] if positions else "",
            "days_left": int(c.get("Daysleft") or 0),
        })
    earners.sort(key=lambda e: e["amount"], reverse=True)
    return earners, total


def _revenue_ranking(store) -> list[tuple[int, int]]:
    # Rank by revenue (income) among promotions with any financial activity —
    # i.e. "how big are we vs everyone else", FM's division-standing view.
    ranked = []
    for r in store.finance:
        inc, exp = _totals(r)
        if inc == 0 and exp == 0:
            continue
        ranked.append((r.get("Fed"), inc))
    ranked.sort(key=lambda x: x[1], reverse=True)
    return ranked


# ── public getters, one per frontend module ──

def get_finance_summary(fed_uid: int) -> dict:
    store = get_store()
    if not store:
        return {
            "balance": 0,
            "current": {"total_income": 0, "total_expense": 0, "net": 0, "margin": 0.0},
            "wage_bill": {"total": 0, "count": 0, "pct_of_income": 0.0},
            "standing": {"rank": 0, "total": 0},
        }

    total_income, total_expense = _current_totals(store, fed_uid)
    net = total_income - total_expense
    _earners, wage_total = _wage_earners(store, fed_uid)
    ranked = _revenue_ranking(store)
    rank = next((i + 1 for i, (f, _inc) in enumerate(ranked) if f == fed_uid), 0)

    return {
        "balance": _balance(store, fed_uid),
        "current": {
            "total_income": total_income,
            "total_expense": total_expense,
            "net": net,
            "margin": _pct(net, total_income),
        },
        "wage_bill": {
            "total": wage_total,
            "count": sum(1 for c in store.contracts_by_fed.get(fed_uid, []) if int(c.get("Amount") or 0) > 0),
            "pct_of_income": _pct(wage_total, total_income),
        },
        "standing": {"rank": rank, "total": len(ranked)},
    }


def get_finance_history(fed_uid: int) -> dict:
    store = get_store()
    if not store:
        return {"history": []}

    history = []
    for r in store.finance_history:
        if r.get("Fed") != fed_uid:
            continue
        inc, exp = _totals(r)
        history.append({
            "period": int(r.get("Howlong") or 0),
            "income": inc,
            "expense": exp,
            "net": inc - exp,
            "balance": int(r.get("FinalMoney") or 0),
        })
    # Howlong counts periods-ago, so descending puts oldest first → newest last.
    history.sort(key=lambda h: h["period"], reverse=True)
    return {"history": history}


def get_finance_breakdown(fed_uid: int) -> dict:
    store = get_store()
    if not store:
        return {"income": [], "expense": []}

    fin_row = _fin_row(store, fed_uid)
    if not fin_row:
        return {"income": [], "expense": []}

    total_income, total_expense = _totals(fin_row)
    return {
        "income": _lines(fin_row, INCOME_LINES, total_income),
        "expense": _lines(fin_row, EXPENSE_LINES, total_expense),
    }


def get_wage_bill(fed_uid: int) -> dict:
    store = get_store()
    if not store:
        return {"total": 0, "count": 0, "top": [], "pct_of_income": 0.0}

    total_income, _total_expense = _current_totals(store, fed_uid)
    earners, total = _wage_earners(store, fed_uid)
    return {
        "total": total,
        "count": len(earners),
        "top": earners[:12],
        "pct_of_income": _pct(total, total_income),
        "avg_wage": round(total / len(earners)) if earners else 0,
    }


def get_finance_standing(fed_uid: int, limit: int = 10) -> dict:
    store = get_store()
    if not store:
        return {"rank": 0, "total": 0, "metric": "revenue", "peers": []}

    ranked = _revenue_ranking(store)
    total = len(ranked)
    rank = next((i + 1 for i, (f, _inc) in enumerate(ranked) if f == fed_uid), 0)

    def _peer(rank_i: int, fed: int, income: int) -> dict:
        fed_row = store.feds.get(fed)
        name = (fed_row.get("Name") if fed_row else "") or f"Fed {fed}"
        logo = (fed_row.get("Logo") if fed_row else "") or ""
        return {"rank": rank_i, "fed_uid": fed, "name": name, "logo": logo, "income": income, "is_player": fed == fed_uid}

    peers = [_peer(i + 1, f, inc) for i, (f, inc) in enumerate(ranked[:limit])]
    if rank and rank > limit:
        player_income = next(inc for f, inc in ranked if f == fed_uid)
        peers.append(_peer(rank, fed_uid, player_income))

    return {"rank": rank, "total": total, "metric": "revenue", "peers": peers}


def _warm_finance() -> None:
    """Registered as a datastore warm hook (see domains.worker.roster.warm_cache /
    routers.schedule._warm_schedule for the same pattern). workers/contracts/
    feds — the other groups these getters touch — are already covered by the
    worker warm-up; this only needs to additionally warm the finance-specific
    tables so the Finance module is instant once background warming settles."""
    store = get_store()
    if store:
        store.preload_groups("finance", "finance_history")


register_warm_hook(_warm_finance)
