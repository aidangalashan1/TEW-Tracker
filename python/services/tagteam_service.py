from datastore import get_store
from models import TagTeam


def get_tag_teams(fed_uid: int) -> list[TagTeam]:
    store = get_store()
    if not store:
        return []
    rows = [r for r in store.teams if r.get("Fed") == fed_uid]
    rows.sort(key=lambda r: -(r.get("Experience", 0) or 0))

    all_uids = set()
    for r in rows:
        u1 = r.get("Worker1", 0)
        u2 = r.get("Worker2", 0)
        if u1: all_uids.add(u1)
        if u2: all_uids.add(u2)

    worker_names = {}
    worker_pics = {}
    for uid in all_uids:
        w = store.workers.get(uid)
        if w:
            worker_names[uid] = w.get("Name", "") or ""
            worker_pics[uid] = w.get("Picture", "") or ""
        for cr in store.contracts_by_worker.get(uid, []):
            if cr.get("FedUID") == fed_uid and cr.get("Picture"):
                worker_pics[uid] = cr["Picture"]

    result = []
    for r in rows:
        uid1 = r.get("Worker1", 0)
        uid2 = r.get("Worker2", 0)
        tt = TagTeam.from_db_row(r)
        tt.worker1_name = worker_names.get(uid1, "")
        tt.worker2_name = worker_names.get(uid2, "")
        tt.worker1_picture = worker_pics.get(uid1, "")
        tt.worker2_picture = worker_pics.get(uid2, "")
        tt.active = r.get("Type", 0) <= 3
        result.append(tt)
    return result
