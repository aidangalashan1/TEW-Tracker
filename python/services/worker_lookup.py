"""Shared worker name/picture resolution for group rosters (stables, tag
teams) — a fed-scoped contract picture takes priority over the worker's
default one, since a promotion may dress the same worker differently.
"""


def resolve_worker_names_pics(store, uids, fed_uid: int) -> tuple[dict, dict]:
    names = {}
    pics = {}
    for uid in uids:
        w = store.workers.get(uid)
        if w:
            names[uid] = w.get("Name", "") or ""
            pics[uid] = w.get("Picture", "") or ""
        for cr in store.contracts_by_worker.get(uid, []):
            if cr.get("FedUID") == fed_uid and cr.get("Picture"):
                pics[uid] = cr["Picture"]
    return names, pics
