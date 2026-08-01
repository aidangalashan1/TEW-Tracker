from fastapi import APIRouter, Query
from datetime import datetime, timedelta, date
from typing import Optional
from core.datastore import get_store, register_warm_hook
from core.response_utils import fast_json
from services.company_service import get_controlled_fed_uids

router = APIRouter(prefix="/api/schedule", tags=["schedule"])

# Groups get_schedule needs — each is a separate lazy-loaded table, so on a
# cold store (first visit after connect/reload) accessing them one at a time
# means several sequential ~200-400ms DB round trips. preload_groups loads
# them concurrently instead (measured: ~1.25s sequential -> ~0.4s parallel).
_SCHEDULE_GROUPS = ("tv_shows", "cards", "broadcaster_slots", "feds", "game_info")


def _warm_schedule() -> None:
    """Registered as a datastore warm hook (see domains.worker.roster.warm_cache
    for the same pattern) so the Schedule tab's groups are pre-loaded in the
    background on connect/reload, not paid for on the first click in."""
    store = get_store()
    if store:
        store.preload_groups(*_SCHEDULE_GROUPS)


register_warm_hook(_warm_schedule)

DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
TEW_TO_PYTHON = {0: 6, 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5}


def tew_showday_to_date(today: date, tew_showday: int) -> date:
    target = TEW_TO_PYTHON.get(tew_showday, 0)
    delta = (target - today.weekday()) % 7
    d = today + timedelta(days=delta)
    if d < today:
        d += timedelta(days=7)
    return d


@router.get("")
def get_schedule(fed_uid: Optional[int] = Query(None), weeks: int = Query(13)):
    store = get_store()
    if not store:
        return {"upcoming": [], "currentDate": datetime.now().date().isoformat()}
    store.preload_groups(*_SCHEDULE_GROUPS)

    current_date = store.game_info.get("CurrentGameDate") if store.game_info else datetime.now()
    today = current_date.date() if hasattr(current_date, 'date') else datetime.now().date()

    controlled = get_controlled_fed_uids()
    if not controlled:
        return {"upcoming": [], "currentDate": today.isoformat()}

    fed_ids = controlled
    if fed_uid not in fed_ids:
        fed_uid = fed_ids[0]

    tv_rows = [tv for tv in store.tv_shows.values() if tv.get("Fed") == fed_uid and not tv.get("Dormant")]
    event_rows = [ev for ev in store.cards.values() if ev.get("Fed") == fed_uid and not ev.get("Dormant")]
    event_rows.sort(key=lambda e: e.get("NextEventDate") or datetime.min)
    slot_rows = [s for s in store.broadcaster_slots if s.get("FedUID") == fed_uid and s.get("Active")]

    slots_by_tv = {}
    for s in slot_rows:
        slots_by_tv.setdefault(s["TVShow"], []).append(s)

    upcoming = []

    for tv in tv_rows:
        slot_list = slots_by_tv.get(tv["UID"], [])
        if not slot_list:
            continue
        days_left = max(s.get("DaysLeft") or 0 for s in slot_list)
        if days_left <= 0:
            continue

        show_date = tew_showday_to_date(today, tv.get("Showday") or 0)
        max_date = today + timedelta(days=days_left + 7)
        year_end = date(today.year, 12, 31)
        cutoff = min(max_date, year_end)
        while show_date <= cutoff:
            upcoming.append({
                "type": "tv",
                "name": tv.get("Name", ""),
                "date": show_date.isoformat(),
                "showday": tv.get("Showday"),
                "dayLabel": DAY_NAMES[tv.get("Showday", 0)],
                "length": tv.get("Length"),
                "lengthMin": (tv.get("Length") or 0) * 30,
                "bShow": tv.get("B_Show"),
                "tvUid": tv["UID"],
                "logo": tv.get("Logo") or "",
            })
            show_date += timedelta(days=7)

    for ev in event_rows:
        nd = ev.get("NextEventDate")
        if nd:
            event_date = nd.date() if hasattr(nd, "date") else nd
            upcoming.append({
                "type": "event",
                "name": ev.get("Name", ""),
                "date": event_date.isoformat(),
                "importance": ev.get("Importance"),
                "length": ev.get("Length"),
                "lengthMin": (ev.get("Length") or 0) * 30,
                "cardUid": ev["UID"],
                "logo": ev.get("Logo") or "",
                "showIntent": ev.get("ShowIntent") or 1,
                "finale": ev.get("Finale") or False,
            })

    upcoming.sort(key=lambda x: x["date"])

    # tvShows/events/slots (the full, unfiltered store tables) used to be
    # returned here too but nothing in the frontend reads them — ScheduleData
    # only ever uses `upcoming`/`currentDate`. Dropping them cut this
    # response from ~977KB to a fraction of that.
    return fast_json({
        "upcoming": upcoming,
        "currentDate": today.isoformat(),
    })


@router.get("/tv/{tv_uid}")
def tv_detail(tv_uid: int):
    store = get_store()
    if not store:
        return {"error": "No data"}, 500
    tv = store.tv_shows.get(tv_uid)
    if not tv:
        return {"error": "TV show not found"}, 404

    current_date = store.game_info.get("CurrentGameDate") if store.game_info else datetime.now()
    today = current_date.date() if hasattr(current_date, 'date') else datetime.now().date()

    past_eps = []
    for pc in store.past_cards.values():
        if pc.get("CardName") == tv.get("Name") and pc.get("TV") and pc.get("Fed") == tv.get("Fed"):
            past_eps.append({
                "uid": pc["UID"],
                "date": str(pc.get("PastCardWhen")) if pc.get("PastCardWhen") else "",
                "rating": pc.get("Overall_Rating", 0),
                "attendance": pc.get("Attendance", 0),
                "tv_rating": pc.get("TV_Rating", 0),
                "viewers": pc.get("Viewers", 0),
                "sellout": bool(pc.get("SellOut")),
            })
    past_eps.sort(key=lambda e: e["date"], reverse=True)

    return {
        "uid": tv["UID"],
        "name": tv.get("Name", ""),
        "type": "tv",
        "showday": tv.get("Showday", 0),
        "dayLabel": ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][tv.get("Showday", 0)],
        "length": tv.get("Length", 0),
        "lengthMin": (tv.get("Length") or 0) * 30,
        "bShow": bool(tv.get("B_Show")),
        "logo": tv.get("Logo", "") or "",
        "pastEpisodes": past_eps,
        "currentDate": today.isoformat(),
    }


@router.get("/event/{card_uid}")
def event_detail(card_uid: int):
    store = get_store()
    if not store:
        return {"error": "No data"}, 500
    ev = store.cards.get(card_uid)
    if not ev:
        return {"error": "Event not found"}, 404

    current_date = store.game_info.get("CurrentGameDate") if store.game_info else datetime.now()
    today = current_date.date() if hasattr(current_date, 'date') else datetime.now().date()

    nd = ev.get("NextEventDate")
    event_date = nd.date() if hasattr(nd, "date") else nd if nd else None

    past_eps = []
    for pc in store.past_cards.values():
        if pc.get("CardName") == ev.get("Name") and not pc.get("TV") and pc.get("Fed") == ev.get("Fed"):
            past_eps.append({
                "uid": pc["UID"],
                "date": str(pc.get("PastCardWhen")) if pc.get("PastCardWhen") else "",
                "rating": pc.get("Overall_Rating", 0),
                "attendance": pc.get("Attendance", 0),
                "sellout": bool(pc.get("SellOut")),
            })
    past_eps.sort(key=lambda e: e["date"], reverse=True)

    return {
        "uid": ev["UID"],
        "name": ev.get("Name", ""),
        "type": "event",
        "nextDate": event_date.isoformat() if event_date else None,
        "importance": ev.get("Importance", 1),
        "length": ev.get("Length", 0),
        "lengthMin": (ev.get("Length") or 0) * 30,
        "logo": ev.get("Logo", "") or "",
        "showIntent": ev.get("ShowIntent", 1),
        "finale": bool(ev.get("Finale")),
        "pastEpisodes": past_eps,
        "currentDate": today.isoformat(),
    }
