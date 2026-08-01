"""Form guide: full-career match/angle history for a worker, or for a whole
roster's worth of workers — deliberately unscoped by fed or time window,
unlike the roster list's 12-month/current-fed performance snapshot."""

from core.datastore import get_store
from .aggregate import _avg_rating, _best_rating, _worst_rating, MATCH_TYPE_NAMES


def _get_worker_segments(store, worker_uid: int) -> list[dict]:
    """Every match/angle a worker has ever competed in, across every fed and
    card in the save — not scoped to a fed or a time window. `rating` is the
    RAW (pre-/10) value, matching _avg_rating/_best_rating/_best_info's
    convention; get_worker_form() converts to a display percentage.
    """
    segments = []
    for mc in store.match_log_competitors_by_worker.get(worker_uid, []):
        ml = store.match_log_by_uid.get(mc["MatchLogUID"])
        if not ml:
            continue
        card = store.past_cards.get(ml["CardUID"])
        if not card:
            continue
        mt = ml.get("Match_Type", 0)
        is_angle = mt == 0
        rating = ml["Rating"] if is_angle else (mc.get("Performance") or ml.get("Rating") or 0)
        if not rating:
            continue

        fed_uid = card.get("Fed", 0)
        fed_row = store.feds.get(fed_uid)
        my_side = mc.get("Side")
        victor = ml.get("Victor", 0)

        allies, opponents = [], []
        for o in store.match_log_competitors_by_ml.get(mc["MatchLogUID"], []):
            if o["Worker"] == worker_uid:
                continue
            w_row = store.workers.get(o["Worker"])
            entry = {
                "uid": o["Worker"],
                "name": (w_row.get("Name") if w_row else "") or "",
                "picture": (w_row.get("Picture") if w_row else "") or "",
            }
            (allies if o.get("Side") == my_side else opponents).append(entry)

        raw_date = card.get("PastCardWhen")
        length = None
        ts = ml.get("TimeStampText")
        if ts:
            try:
                parts = str(ts).strip().split(":")
                if len(parts) == 3:
                    length = int(parts[0]) * 3600 + int(parts[1]) * 60 + int(parts[2])
                elif len(parts) == 2:
                    length = int(parts[0]) * 60 + int(parts[1])
            except (ValueError, IndexError):
                pass

        segments.append({
            "match_log_uid": mc["MatchLogUID"],
            "date": str(raw_date)[:10] if raw_date else "",
            "length": length,
            "fed_uid": fed_uid,
            "fed_name": (fed_row.get("Name") if fed_row else "") or "",
            "card_uid": card.get("UID"),
            "card": (card.get("CardName") or "").strip(),
            "card_logo": card.get("Logo", "") or "",
            "card_logo_tv": bool(card.get("TVLogo")),
            "card_logo_event": bool(card.get("EventLogo")),
            "is_tv": bool(card.get("TV")),
            "is_angle": is_angle,
            "rating": rating,
            "label": MATCH_TYPE_NAMES.get(mt) or store.match_types.get(mt) or f"Type {mt}",
            "log_entry": (ml.get("LogEntry") or "").strip(),
            "is_title_match": bool(ml.get("Title1") or ml.get("Title2")),
            "title1": ml.get("Title1", 0),
            "title2": ml.get("Title2", 0),
            "won": bool(victor and my_side == victor),
            "lost": bool(victor and my_side != victor),
            "allies": allies,
            "opponents": opponents,
        })

    segments.sort(key=lambda s: s["date"], reverse=True)
    return segments


def _pct(v: int) -> int:
    return round(v / 10)


def _avg_pct(vals: list[dict]) -> int:
    return _pct(_avg_rating(vals)) if vals else 0


def _summarize_segments(raw_segments: list[dict]) -> dict:
    matches = [s for s in raw_segments if not s["is_angle"]]
    angles = [s for s in raw_segments if s["is_angle"]]
    return {
        "total_segments": len(raw_segments),
        "total_matches": len(matches),
        "total_angles": len(angles),
        "avg_rating": _avg_pct(raw_segments),
        "avg_match_rating": _avg_pct(matches),
        "avg_angle_rating": _avg_pct(angles),
        "best_rating": _pct(_best_rating(raw_segments)),
        "worst_rating": _pct(_worst_rating(raw_segments)) if raw_segments else 0,
        "wins": sum(1 for s in matches if s["won"]),
        "losses": sum(1 for s in matches if s["lost"]),
        "title_matches": sum(1 for s in raw_segments if s["is_title_match"]),
    }


def get_worker_form(worker_uid: int) -> dict:
    """The 'Form' tab: full career match/angle history for one worker, with
    summary stats — deliberately unscoped by fed or time window, unlike the
    roster list's 12-month/current-fed performance snapshot."""
    store = get_store()
    if not store:
        return {"summary": None, "segments": []}

    raw_segments = _get_worker_segments(store, worker_uid)
    summary = _summarize_segments(raw_segments)
    segments = [{**s, "rating": _pct(s["rating"])} for s in raw_segments]
    return {"summary": summary, "segments": segments}


def get_roster_form(fed_uid: int) -> dict:
    """Roster-wide form guide: every current roster member's full-career
    performance summary + a recent-form trend strip, for the standalone
    Form module (as opposed to one worker's tab on their own profile)."""
    store = get_store()
    if not store:
        return {"fed_uid": fed_uid, "workers": []}

    contracts = store.contracts_by_fed.get(fed_uid, [])
    result = []
    for c in contracts:
        uid = c["WorkerUID"]
        w_row = store.workers.get(uid)
        if not w_row:
            continue
        raw_segments = _get_worker_segments(store, uid)
        summary = _summarize_segments(raw_segments)
        name = (c.get("Name") or w_row.get("Name") or "").strip()
        picture = c.get("Picture") or w_row.get("Picture") or ""
        recent = [_pct(s["rating"]) for s in raw_segments[:10]]
        result.append({
            "uid": uid,
            "name": name,
            "picture": picture,
            "face": bool(c.get("Face", True)),
            "summary": summary,
            "recent_ratings": recent,
        })

    return {"fed_uid": fed_uid, "workers": result}
