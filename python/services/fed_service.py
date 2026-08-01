from core.datastore import get_store
from models import Federation, Storyline


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
