from core.datastore import get_store
from models import Federation, Belt, Storyline


def get_fed(fed_uid: int) -> Federation | None:
    store = get_store()
    if not store:
        return None
    row = store.feds.get(fed_uid)
    if not row:
        return None
    fed = Federation.from_db_row(row)
    fed.worker_count = len(store.contracts_by_fed.get(fed_uid, []))
    return fed


def get_all_feds() -> list[Federation]:
    store = get_store()
    if not store:
        return []
    rows = sorted(
        [r for r in store.feds.values() if r.get("Trading")],
        key=lambda r: (r.get("Based_In", 0), -(r.get("Size", 1) or 1)),
    )
    return [Federation.from_db_row(r) for r in rows]


def get_belts(fed_uid: int) -> list[Belt]:
    store = get_store()
    if not store:
        return []
    belts = [b for b in store.belts.values() if b.get("Fed") == fed_uid]
    belts.sort(key=lambda b: (b.get("BeltLevel", 1) or 1, -(b.get("Prestige", 0) or 0)))
    return [Belt.from_db_row(b) for b in belts]


def get_storylines(fed_uid: int) -> list[Storyline]:
    store = get_store()
    if not store:
        return []
    sls = store.fed_storylines.get(fed_uid, [])
    sls.sort(key=lambda s: -(s.get("Heat", 0) or 0))
    return [Storyline.from_db_row(s) for s in sls]


def get_fed_finances(fed_uid: int) -> dict:
    store = get_store()
    if not store:
        return {}
    for r in store.finance:
        if r.get("Fed") == fed_uid:
            return dict(r)
    return {}


def fmt_belt_date(d: object) -> str:
    """Convert a belt history date (datetime or ISO string) to dd/mm/yy."""
    import re
    s = str(d)
    m = re.match(r'(\d{4})-(\d{2})-(\d{2})', s)
    if m:
        return f"{m.group(3)}/{m.group(2)}/{m.group(1)[2:]}"
    return s


def get_belt_history(fed_uid: int, limit: int = 5) -> list[dict]:
    store = get_store()
    if not store:
        return []
    fed_belt_uids = {uid for uid, b in store.belts.items() if b.get("Fed") == fed_uid}
    by_belt: dict[int, list[dict]] = {}
    pre_belt_history = getattr(store, 'belt_pre_history', []) or []

    def _is_pre(br: dict) -> bool:
        return any(br is p for p in pre_belt_history)

    teams_list = getattr(store, 'teams', []) or []
    all_reigns = list(store.belt_history) + list(pre_belt_history)
    for br in all_reigns:
        belt_uid = br.get("BeltUID")
        if belt_uid not in fed_belt_uids:
            continue
        is_pre = _is_pre(br)
        holders = []
        for h_key in ("Holder1", "Holder2", "Holder3"):
            uid = br.get(h_key, 0)
            if uid:
                w_row = store.workers.get(uid)
                contracts = store.contracts_by_worker.get(uid, [])
                c_pic = contracts[0].get("Picture", "") if contracts else ""
                name = contracts[0].get("Name", "") if contracts else ""
                if not name:
                    name = w_row.get("Name", "") if w_row else ""
                pic = c_pic or (w_row.get("Picture", "") if w_row else "")
                holders.append({"uid": uid, "name": name, "picture": pic})
        raw_captured = str(br["BeltCaptured"]) if br.get("BeltCaptured") else ""
        raw_lost_raw = br.get("BeltLost")
        raw_lost = str(raw_lost_raw) if raw_lost_raw and str(raw_lost_raw).strip().lower() not in ("none", "", "null") else ""
        entry: dict = {
            "holders": holders,
            "_sort": raw_captured,
            "captured": fmt_belt_date(raw_captured) if raw_captured else "",
            "lost": fmt_belt_date(raw_lost) if raw_lost else "",
        }
        if not is_pre:
            entry["defences"] = br.get("Defences", 0) or 0
        # For tag team belts, try to resolve the tag team name
        if len(holders) >= 2:
            belt_row = store.belts.get(belt_uid)
            if belt_row and belt_row.get("Style") == 2:  # Tag Team
                uids = {h["uid"] for h in holders[:2]}
                for t in teams_list:
                    if {t.get("Worker1"), t.get("Worker2")} == uids:
                        entry["team_name"] = t.get("Name", "")
                        break
        if belt_uid not in by_belt:
            by_belt[belt_uid] = []
        by_belt[belt_uid].append(entry)
    result = []
    for belt_uid in fed_belt_uids:
        entries = by_belt.get(belt_uid)
        if not entries:
            continue
        belt = store.belts.get(belt_uid)
        entries.sort(key=lambda e: e.pop("_sort", "") or "", reverse=True)
        result.append({
            "belt_uid": belt_uid,
            "belt_name": belt.get("Name", "") if belt else "",
            "belt_picture": belt.get("Picture", "") if belt else "",
            "entries": entries[:limit],
        })
    return result
