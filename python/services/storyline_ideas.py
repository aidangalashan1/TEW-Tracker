from datastore import get_store
from datetime import datetime, timedelta


def get_storyline_ideas(fed_uid: int, worker_uid: int | None = None) -> list[dict]:
    store = get_store()
    if not store:
        return []

    contract_uids = {c["WorkerUID"] for c in store.contracts_by_fed.get(fed_uid, [])}
    workers_list = [store.workers.get(uid) for uid in contract_uids if store.workers.get(uid)]
    worker_names = {r["UID"]: r.get("Name", "") for r in workers_list}
    worker_pics = {r["UID"]: r.get("Picture", "") for r in workers_list}

    # Worker contracts for perception/disposition
    contracts_by_worker = {}
    for c in store.contracts:
        uid = c["WorkerUID"]
        if uid in contract_uids:
            contracts_by_worker[uid] = c

    # Current active storyline workers
    sl_rows = store.fed_storylines.get(fed_uid, [])
    active_sl_uids = {sl["UID"] for sl in sl_rows if not sl.get("ToDelete") and sl.get("Furthered")}
    involved_workers = set()
    involved_alignments = {}
    for inv in store.storyline_involved:
        if inv["StorylineUID"] in active_sl_uids:
            involved_workers.add(inv["WorkerUID"])
            involved_alignments[inv["WorkerUID"]] = inv.get("Alignment", 0)

    if worker_uid is None or worker_uid not in contract_uids:
        return []

    # Get selected worker's data
    w_contract = contracts_by_worker.get(worker_uid, {})
    w_face = w_contract.get("face") or w_contract.get("Face") or False
    w_perception = w_contract.get("Perception", 3) or 3
    w_in_storyline = worker_uid in involved_workers
    w_alignment = involved_alignments.get(worker_uid, 0 if w_face else 1)

    # Past match opponents
    past_opponents = set()
    for mc in store.match_log_competitors:
        if mc["Worker"] == worker_uid:
            ml = store.match_log_by_uid.get(mc["MatchLogUID"])
            if ml:
                for mc2 in store.match_log_competitors_by_ml.get(ml["UID"], []):
                    if mc2["Worker"] != worker_uid:
                        past_opponents.add(mc2["Worker"])

    candidates = []
    for uid in contract_uids:
        if uid == worker_uid:
            continue
        score = 0
        reasons = []

        c_contract = contracts_by_worker.get(uid, {})
        c_face = c_contract.get("face") or c_contract.get("Face") or False
        c_perception = c_contract.get("Perception", 3) or 3
        c_in_storyline = uid in involved_workers
        c_alignment = involved_alignments.get(uid, 0 if c_face else 1)

        # Opposite disposition is best for feuds
        if w_face != c_face:
            score += 60
            reasons.append("Opposite disposition")
        elif w_face == c_face:
            score += 10
            reasons.append("Same disposition")

        # Chemistry
        for cr in store.chemistry:
            w1 = cr.get("worker1") or cr.get("worker")
            w2 = cr.get("worker2")
            chem = cr.get("chem") or cr.get("chemistry") or 0
            if {w1, w2} == {worker_uid, uid}:
                if chem < 0:
                    score += chem * -12
                    reasons.append("Negative chemistry")
                elif chem > 0:
                    score += chem * 3
                    reasons.append("Positive chemistry")

        # Same stable
        for s in store.stables:
            if s.get("Fed") != fed_uid:
                continue
            members = s.get("members", []) if isinstance(s.get("members"), list) else []
            member_uids = {m["uid"] for m in members if m.get("uid") in contract_uids}
            if worker_uid in member_uids and uid in member_uids:
                score += 50
                reasons.append("Same stable member")

        # Tag team partners
        for t in store.teams:
            if t.get("Fed") != fed_uid:
                continue
            team_uids = {t.get("Worker1"), t.get("Worker2")}
            if worker_uid in team_uids and uid in team_uids:
                score += 40
                reasons.append("Tag team partner")

        # Past opponents (have history)
        if uid in past_opponents:
            score += 25
            reasons.append("Past opponent")

        # Not currently in a storyline (available)
        if not c_in_storyline:
            score += 30
            reasons.append("Available")
        elif c_in_storyline and c_alignment != w_alignment:
            score += 15
            reasons.append("Cross-storyline feud")

        # Perception comparison (similar perception = better match)
        perception_diff = abs(w_perception - c_perception)
        if perception_diff <= 1:
            score += 25
            reasons.append("Similar star power")
        elif perception_diff <= 2:
            score += 10

        # Worker star power
        ws = _worker_score(store, uid)
        wws = _worker_score(store, worker_uid)
        if ws >= wws * 0.7:
            score += 15

        # Recent match history bonus
        recent_match = False
        for ml_uid in store.match_log_by_uid:
            ml = store.match_log_by_uid[ml_uid]
            for mc in store.match_log_competitors_by_ml.get(ml_uid, []):
                if mc["Worker"] == uid:
                    card = store.past_cards.get(ml["CardUID"])
                    if card:
                        recent_match = True
                        break
            if recent_match:
                break
        if recent_match:
            score += 10

        candidates.append({
            "worker_uid": uid,
            "name": worker_names.get(uid, ""),
            "picture": worker_pics.get(uid, ""),
            "score": score,
            "reasons": reasons[:3],
        })

    candidates.sort(key=lambda x: -x["score"])
    return candidates[:5]


def _worker_score(store, uid: int) -> int:
    w_row = store.workers.get(uid)
    if not w_row:
        return 0
    skills = store.skills.get(uid, {})
    total = 0
    for k in ("Brawling", "Technical", "Aerial", "Charisma", "Microphone", "Acting", "StarQuality"):
        total += skills.get(k, 0) or 0
    return total // 7
