"""Single-worker profile assembly: full career performance, belt history,
moveset, agent report — deliberately unscoped by fed or time window, unlike
the roster list's 12-month/current-fed snapshot (this is the worker's own
profile page, not a roster comparison)."""

from datetime import datetime
from core.datastore import get_store
from core.regions import REGION_TO_AREA, AREAS
from models import (
    Worker, WorkerSkills, WorkerPhysical, WorkerContract,
    OvernessEntry, RatingDisplay, WinLoss,
)
from domains.company.relative import get_player_fed_uid
from .aggregate import _compute_age, _build_performance
from .assembly import _set_company_data, _compute_pop_pillars, _compute_title_pillars
from .form import _get_worker_segments


def get_worker_detail(worker_uid: int, fed_uid: int = None) -> Worker | None:
    store = get_store()
    if not store:
        return None

    w_row = store.workers.get(worker_uid)
    if not w_row:
        return None

    w = Worker.from_db_row(w_row)
    try:
        w.bio = store.worker_bio.get(worker_uid, "")
    except Exception:
        w.bio = ""

    skill_row = store.skills.get(worker_uid)
    if skill_row:
        w.skills = WorkerSkills.from_db_row(skill_row)

    phys_row = store.physical.get(worker_uid)
    if phys_row:
        w.physical = WorkerPhysical.from_db_row(phys_row)

    contract_rows = store.contracts_by_worker.get(worker_uid, [])
    if contract_rows:
        w.contract = WorkerContract.from_db_row(contract_rows[0])
        fed_ids = set()
        for cr in contract_rows:
            fed = cr.get("FedUID")
            if fed and fed > 0:
                fed_ids.add(fed)
            parent = cr.get("ParentFedUID")
            if parent and parent > 0:
                fed_ids.add(parent)
        if fed_ids:
            w.all_fed_ids = list(fed_ids)

    over_row = store.overness.get(worker_uid)
    if over_row:
        w.overness = [
            OvernessEntry(region=i, value=RatingDisplay.from_raw(over_row.get(f"Over{i}", 0)))
            for i in range(1, 58)
        ]
        if fed_uid is None:
            fed_uid = get_player_fed_uid() or None
        if fed_uid:
            fed_row = store.feds.get(fed_uid)
            if fed_row:
                home_area = REGION_TO_AREA.get(fed_row["Based_In"], "")
                area_region_ids = AREAS.get(home_area, [])
                if area_region_ids:
                    vals = [over_row.get(f"Over{i}", 0) for i in area_region_ids]
                    avg = round(sum(vals) / len(vals)) if vals else 0
                    w.pop = RatingDisplay.from_raw(avg)
        if w.pop.pct == 0:
            all_vals = [over_row.get(f"Over{i}", 0) for i in range(1, 58)]
            w.pop = RatingDisplay.from_raw(round(sum(all_vals) / len(all_vals)))
        # Same pillar computation the Roster tab's _build_worker uses — this
        # page used to skip it entirely, so usage_label()'s International/
        # Hidden detection silently never fired here, disagreeing with
        # whatever the Roster tab showed for the same worker.
        _compute_pop_pillars(w, store, over_row, company_fed_uid=fed_uid)

    game_date_val = store.game_date_val
    w.age = _compute_age(w_row.get("Birthday"), game_date_val)
    bday_raw = w_row.get("Birthday")
    if isinstance(bday_raw, datetime):
        setattr(w, "Birthday", bday_raw.strftime("%Y-%m-%d"))

    biz = store.worker_business.get(worker_uid)
    if biz:
        for k in ("Business", "Booking_Reputation", "Booking_Skill"):
            v = biz.get(k)
            if v is not None:
                setattr(w, k, v)

    w.attributes = [r["Attribute"] for r in store.attributes if r["WorkerUID"] == worker_uid and not r.get("Hidden")]
    w.injury_count = sum(1 for r in store.injury_history if r["WorkerUID"] == worker_uid)

    # Performance — deliberately the worker's full career (every fed, all time),
    # not the roster list's 12-month/current-fed snapshot: this is their own
    # profile page, not a roster comparison.
    raw_segments = _get_worker_segments(store, worker_uid)
    if raw_segments:
        matches = [s for s in raw_segments if not s["is_angle"]]
        angles = [s for s in raw_segments if s["is_angle"]]
        w.performance = _build_performance(matches, angles, raw_segments)

    w.contract_status = "none"
    w.contract_expiry_days = 0
    if contract_rows:
        main = contract_rows[0]
        for cr in contract_rows:
            if cr.get("WrittenContract") and cr.get("ExclusiveContract"):
                main = cr
                break
            elif cr.get("WrittenContract") and not main.get("WrittenContract"):
                main = cr
        w.contract_status = "written"
        if main.get("ExclusiveContract"):
            w.contract_status = "exclusive_written"
        if main.get("OnLoan"):
            w.contract_status = "loan"
        if main.get("Developmental"):
            w.contract_status = "developmental"
        w.contract_expiry_days = main.get("Daysleft", 0) or 0

    _compute_title_pillars(w, store, worker_uid, game_date_val)
    _set_company_data(w, store, game_date_val)

    # Agent report (strengths / weaknesses / usage narrative / best role) —
    # derived here so the profile tab only has to render it.
    from .agent_report import build_agent_report
    player_fed = get_player_fed_uid()
    report_fed = fed_uid if fed_uid else player_fed
    fed_row = store.feds.get(report_fed) if report_fed else None
    w.agent_report = build_agent_report(w, fed_row, player_fed)

    # Career win/loss from match log
    wl_rec = {"wins": 0, "losses": 0, "draws": 0}
    for mc in store.match_log_competitors:
        if mc["Worker"] == worker_uid:
            ml = store.match_log_by_uid.get(mc["MatchLogUID"])
            if ml and ml.get("Victor", 0) > 0:
                if mc["Side"] == ml["Victor"]:
                    wl_rec["wins"] += 1
                else:
                    wl_rec["losses"] += 1
    w.win_loss = WinLoss(**wl_rec)

    # Belt history (in-game + pre-game)
    w.belt_history = []
    for br in list(store.belt_history) + list(getattr(store, 'belt_pre_history', []) or []):
        if br.get("Holder1") == worker_uid or br.get("Holder2") == worker_uid or br.get("Holder3") == worker_uid:
            belt = store.belts.get(br["BeltUID"])
            w.belt_history.append({
                "belt_uid": br["BeltUID"],
                "belt_name": belt.get("Name", "") if belt else "",
                "belt_picture": belt.get("Picture", "") if belt else "",
                "captured": str(br["BeltCaptured"]) if br.get("BeltCaptured") else "",
                "lost": str(br["BeltLost"]) if br.get("BeltLost") else "",
                "defences": br.get("Defences", 0) or 0,
            })

    # Moveset
    w.moves = []
    moveset_id = w_row.get("Moveset", 0) or 0
    if moveset_id > 0:
        for ar in store.moveset_arsenal:
            if ar["MoveSetUID"] == moveset_id:
                move = store.wrestling_moves.get(ar["Move"])
                w.moves.append({
                    "name": move.get("MoveName", "") if move else "",
                    "desc": move.get("MoveDesc", "") if move else "",
                    "level": ar.get("MoveLevel", 1) or 1,
                })
        w.moves.sort(key=lambda m: (-m["level"], m["name"]))

    return w
