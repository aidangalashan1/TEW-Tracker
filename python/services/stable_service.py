from datastore import get_store
from models import Stable


def get_stables(fed_uid: int) -> list[Stable]:
    store = get_store()
    if not store:
        return []
    rows = [r for r in store.stables if r.get("Fed") == fed_uid]
    rows.sort(key=lambda r: r.get("Name", "") or "")

    all_uids = set()
    member_map = {}
    for ri, r in enumerate(rows):
        members = []
        for i in range(1, 19):
            muid = r.get(f"Member{i}")
            if muid and muid > 0:
                all_uids.add(muid)
                role = r.get(f"Role{i}", 0)
                members.append((muid, role))
        member_map[ri] = members

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
    for ri, r in enumerate(rows):
        s = Stable.from_db_row(r)
        members = []
        for muid, role in member_map.get(ri, []):
            members.append({
                "uid": muid,
                "name": worker_names.get(muid, ""),
                "picture": worker_pics.get(muid, ""),
                "leader": role == 1,
            })
        s.members = members
        result.append(s)
    return result
