from datastore import get_store
from models import Worker


def _build_match_dict(store, ml: dict, competitors_by_match: dict) -> dict:
    comps = []
    for mc in competitors_by_match.get(ml["UID"], []):
        w_row = store.workers.get(mc["Worker"])
        comps.append({
            "worker_uid": mc["Worker"],
            "name": w_row.get("Name", "") if w_row else "",
            "picture": w_row.get("Picture", "") if w_row else "",
            "side": mc["Side"],
            "performance": round((mc.get("Performance") or 0) / 10),
            "limited": bool(mc.get("Limited")),
        })
    return {
        "uid": ml["UID"],
        "log_entry": ml.get("LogEntry", ""),
        "rating": round((ml.get("Rating") or 0) / 10),
        "match_type": ml.get("Match_Type", 0),
        "victor": ml.get("Victor", 0),
        "title1": ml.get("Title1", 0),
        "title2": ml.get("Title2", 0),
        "extra_notes": ml.get("Extra_Notes", ""),
        "pre_show": bool(ml.get("PreShow")),
        "post_show": bool(ml.get("PostShow")),
        "competitors": comps,
    }


def _build_show_dict(c: dict, matches: list[dict]) -> dict:
    raw_date = c.get("PastCardWhen")
    date_str = str(raw_date)[:10] if raw_date else ""
    return {
        "uid": c["UID"],
        "name": c.get("CardName", ""),
        "fed_uid": c.get("Fed", 0),
        "is_tv": bool(c.get("TV")),
        "date": date_str,
        "overall_rating": round((c.get("Overall_Rating") or 0) / 10),
        "attendance": c.get("Attendance", 0),
        "ppv_rating": round((c.get("PPV_Rating") or 0) / 10),
        "tv_rating": round((c.get("TV_Rating") or 0) / 10),
        "viewers": c.get("Viewers", 0),
        "sell_out": bool(c.get("SellOut")),
        "highlights": bool(c.get("Highlights")),
        "cancelled": bool(c.get("Cancelled")),
        "logo": c.get("Logo", ""),
        "matches": matches,
    }


def get_past_shows(fed_uid: int, limit: int = 50):
    store = get_store()
    if not store:
        return {"shows": [], "count": 0}

    cards = [c for c in store.past_cards.values() if c.get("Fed") == fed_uid]
    cards.sort(key=lambda c: c.get("PastCardWhen") or "", reverse=True)
    cards = cards[:limit]

    match_logs_by_card = {}
    for ml in store.match_log:
        match_logs_by_card.setdefault(ml["CardUID"], []).append(ml)

    competitors_by_match = store.match_log_competitors_by_ml

    result = []
    for c in cards:
        matches = [_build_match_dict(store, ml, competitors_by_match) for ml in match_logs_by_card.get(c["UID"], [])]
        result.append(_build_show_dict(c, matches))

    return {"shows": result, "count": len(result)}


def get_past_show_detail(past_card_uid: int) -> dict | None:
    store = get_store()
    if not store:
        return None

    c = store.past_cards.get(past_card_uid)
    if not c:
        return None

    match_logs = [ml for ml in store.match_log if ml["CardUID"] == past_card_uid]
    competitors_by_match = store.match_log_competitors_by_ml
    matches = [_build_match_dict(store, ml, competitors_by_match) for ml in match_logs]

    return _build_show_dict(c, matches)
