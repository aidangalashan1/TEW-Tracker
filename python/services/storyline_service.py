from datastore import get_store
from datetime import datetime, timedelta, date

DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
TEW_TO_PYTHON = {0: 6, 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5}


def tew_showday_to_date(today: date, tew_showday: int) -> date:
    target = TEW_TO_PYTHON.get(tew_showday, 0)
    delta = (target - today.weekday()) % 7
    d = today + timedelta(days=delta)
    if d < today:
        d += timedelta(days=7)
    return d


def get_storylines_cross(fed_uid: int):
    store = get_store()
    if not store:
        return {"storylines": [], "shows": []}

    # Gather storylines
    sl_rows = store.fed_storylines.get(fed_uid, [])
    active_sls = [sl for sl in sl_rows if not sl.get("ToDelete")]
    involved_by_sl = {}
    for inv in store.storyline_involved:
        involved_by_sl.setdefault(inv["StorylineUID"], []).append(inv)

    storylines = []
    sl_uids = set()
    for sl in active_sls:
        sl_uid = sl["UID"]
        sl_uids.add(sl_uid)
        workers = []
        for inv in involved_by_sl.get(sl_uid, []):
            w_row = store.workers.get(inv["WorkerUID"])
            contract = next((c for c in store.contracts_by_worker.get(inv["WorkerUID"], []) if c.get("FedUID") == fed_uid), None)
            workers.append({
                "uid": inv["WorkerUID"],
                "name": w_row.get("Name", "") if w_row else "",
                "picture": w_row.get("Picture", "") if w_row else "",
                "major": bool(inv.get("MajorRole")),
                "alignment": inv.get("Alignment", 0),
                "face": bool(contract.get("Face")) if contract else True,
            })
        storylines.append({
            "uid": sl_uid,
            "name": sl.get("Name", ""),
            "heat": round((sl.get("Heat") or 0) / 10),
            "description": sl.get("Description", ""),
            "furthered": bool(sl.get("Furthered")),
            "workers": workers,
        })

    # Worker -> storyline mapping
    worker_sls: dict[int, list[int]] = {}
    for inv in store.storyline_involved:
        if inv["StorylineUID"] in sl_uids:
            worker_sls.setdefault(inv["WorkerUID"], []).append(inv["StorylineUID"])

    # Gather shows: upcoming + past
    current_date = store.game_info.get("CurrentGameDate") if store.game_info else datetime.now()
    today = current_date.date() if hasattr(current_date, 'date') else datetime.now().date()

    shows = []

    # Upcoming TV shows (next 13 weeks)
    tv_rows = [tv for tv in store.tv_shows.values() if tv.get("Fed") == fed_uid and not tv.get("Dormant")]
    slot_rows = [s for s in store.broadcaster_slots if s.get("FedUID") == fed_uid and s.get("Active")]
    slots_by_tv = {}
    for s in slot_rows:
        slots_by_tv.setdefault(s["TVShow"], []).append(s)

    max_date = today + timedelta(days=90)

    # Find the latest past show date to avoid overlapping
    latest_past = date.min
    for pc in store.past_cards.values():
        if pc.get("Fed") == fed_uid:
            raw = pc.get("PastCardWhen")
            if raw and hasattr(raw, 'date'):
                d = raw.date()
                if d > latest_past:
                    latest_past = d

    for tv in tv_rows:
        slot_list = slots_by_tv.get(tv["UID"], [])
        if not slot_list:
            continue
        days_left = max(s.get("DaysLeft") or 0 for s in slot_list)
        if days_left <= 0:
            continue
        show_date = tew_showday_to_date(today, tv.get("Showday") or 0)
        cutoff = min(today + timedelta(days=days_left), max_date)
        while show_date <= cutoff:
            if show_date > latest_past:
                shows.append({
                    "uid": f"tv_{tv['UID']}",
                    "type": "tv",
                    "show_uid": tv["UID"],
                    "name": tv.get("Name", ""),
                    "date": show_date.isoformat(),
                    "logo": tv.get("Logo", ""),
                    "is_upcoming": show_date >= today,
                })
            show_date += timedelta(days=7)

    # Upcoming events
    event_rows = [ev for ev in store.cards.values() if ev.get("Fed") == fed_uid and not ev.get("Dormant")]
    for ev in event_rows:
        nd = ev.get("NextEventDate")
        if nd and hasattr(nd, 'date'):
            event_date = nd.date()
        else:
            continue
        if event_date > latest_past and event_date <= max_date:
            shows.append({
                "uid": f"event_{ev['UID']}",
                "type": "event",
                "show_uid": ev["UID"],
                "name": ev.get("Name", ""),
                "date": event_date.isoformat(),
                "logo": ev.get("Logo", ""),
                "is_upcoming": True,
            })

    # Past shows with storyline-relevant segments
    past_cards = [c for c in store.past_cards.values() if c.get("Fed") == fed_uid]
    past_cards.sort(key=lambda c: c.get("PastCardWhen") or "", reverse=True)
    past_cards = past_cards[:30]  # limit

    match_logs_by_card = {}
    for ml in store.match_log:
        match_logs_by_card.setdefault(ml["CardUID"], []).append(ml)

    competitors_by_match = {}
    for mc in store.match_log_competitors:
        competitors_by_match.setdefault(mc["MatchLogUID"], []).append(mc)

    for pc in past_cards:
        card_date = pc.get("PastCardWhen")
        date_str = str(card_date)[:10] if card_date else ""
        segments = []
        for ml in match_logs_by_card.get(pc["UID"], []):
            worker_uids = [mc["Worker"] for mc in competitors_by_match.get(ml["UID"], [])]
            matched_sls = set()
            for wuid in worker_uids:
                for sl_uid in worker_sls.get(wuid, []):
                    matched_sls.add(sl_uid)
            if matched_sls:
                segments.append({
                    "uid": ml["UID"],
                    "log_entry": ml.get("LogEntry", ""),
                    "rating": round((ml.get("Rating") or 0) / 10),
                    "match_type": ml.get("Match_Type", 0),
                    "worker_uids": worker_uids,
                    "storyline_uids": list(matched_sls),
                    "pre_show": bool(ml.get("PreShow")),
                })
        if segments:
            shows.append({
                "uid": f"past_{pc['UID']}",
                "type": "past",
                "name": pc.get("CardName", ""),
                "date": date_str,
                "logo": pc.get("Logo", ""),
                "is_tv": bool(pc.get("TV")),
                "is_upcoming": False,
                "overall_rating": round((pc.get("Overall_Rating") or 0) / 10),
                "segments": segments,
            })

    shows.sort(key=lambda s: s["date"], reverse=False)

    return {"storylines": storylines, "shows": shows}


def get_storyline_detail(storyline_uid: int, fed_uid: int) -> dict | None:
    store = get_store()
    if not store:
        return None
    sl = next((s for s in store.storylines if s.get("UID") == storyline_uid), None)
    if not sl:
        return None

    workers = []
    for inv in store.storyline_involved:
        if inv["StorylineUID"] == storyline_uid:
            w_row = store.workers.get(inv["WorkerUID"])
            contract = next((c for c in store.contracts_by_worker.get(inv["WorkerUID"], []) if c.get("FedUID") == fed_uid), None)
            workers.append({
                "uid": inv["WorkerUID"],
                "name": w_row.get("Name", "") if w_row else "",
                "picture": w_row.get("Picture", "") if w_row else "",
                "major": bool(inv.get("MajorRole")),
                "alignment": inv.get("Alignment", 0),
                "face": bool(contract.get("Face")) if contract else True,
            })

    return {
        "uid": sl["UID"],
        "name": sl.get("Name", ""),
        "heat": round((sl.get("Heat") or 0) / 10),
        "description": sl.get("Description", ""),
        "furthered": bool(sl.get("Furthered")),
        "workers": workers,
    }
