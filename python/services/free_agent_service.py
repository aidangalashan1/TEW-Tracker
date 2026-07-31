"""Free agents: workers with zero rows in tblContract — not signed to any
promotion. TEW9's own free-agent browsing is a small filtered list; this
mirrors get_roster()'s level of detail (a browsable list, not the full
worker-detail payload) so the frontend can filter/sort/shortlist at a glance.
"""
from datetime import datetime
from datastore import get_store
from models import Worker, WorkerSkills, WorkerPhysical, RatingDisplay, OvernessEntry
from regions import REGION_TO_AREA, AREAS
from services.worker_service import _compute_age, _get_worker_segments, _summarize_segments
from services.company_service import get_player_fed_uid


def get_free_agents(fed_uid: int = None) -> list[Worker]:
    """`fed_uid` only affects which area's popularity is shown (defaults to the
    player's fed's home area) — free agents aren't scoped to a fed, since by
    definition they aren't signed to one."""
    store = get_store()
    if not store:
        return []
    store.preload_groups(
        "workers", "worker_bio", "skills", "physical", "overness",
        "worker_business", "feds", "contracts", "injured", "away",
        "belts", "match_log",
    )
    if fed_uid is None:
        fed_uid = get_player_fed_uid()

    fed_row = store.feds.get(fed_uid)
    home_area = REGION_TO_AREA.get(fed_row["Based_In"], "") if fed_row else ""
    area_region_ids = AREAS.get(home_area, [])
    game_date_val = store.game_date_val

    contracted_uids = {c["WorkerUID"] for c in store.contracts}

    result = []
    for uid, w_row in store.workers.items():
        if uid in contracted_uids:
            continue
        if w_row.get("Retired") or w_row.get("Dead"):
            continue

        w = Worker.from_db_row(w_row)
        try:
            w.bio = store.worker_bio.get(uid, "")
        except Exception:
            w.bio = ""
        w.skills = WorkerSkills.from_db_row(store.skills.get(uid, {})) if uid in store.skills else None
        w.physical = WorkerPhysical.from_db_row(store.physical.get(uid, {})) if uid in store.physical else None
        w.age = _compute_age(w_row.get("Birthday"), game_date_val)
        bday_raw = w_row.get("Birthday")
        if isinstance(bday_raw, datetime):
            setattr(w, "Birthday", bday_raw.strftime("%Y-%m-%d"))

        over_row = store.overness.get(uid)
        if over_row:
            w.overness = [
                OvernessEntry(region=i, value=RatingDisplay.from_raw(over_row.get(f"Over{i}", 0)))
                for i in range(1, 58)
            ]
            if area_region_ids:
                vals = [over_row.get(f"Over{i}", 0) for i in area_region_ids]
                avg = round(sum(vals) / len(vals)) if vals else 0
                w.pop = RatingDisplay.from_raw(avg)
            w.home_area = home_area

        flags = []
        if uid in store.injured_set:
            flags.append("injured")
        if uid in store.away_set:
            flags.append("absent")
        if uid in store.champ_set:
            flags.append("champion")
        w.status = flags

        biz = store.worker_business.get(uid)
        if biz:
            for k in ("Business", "Booking_Reputation", "Booking_Skill"):
                v = biz.get(k)
                if v is not None:
                    setattr(w, k, v)

        # Real, derived signal (not invented): their own match/angle history,
        # wherever they last worked — reuses the exact same aggregation as the
        # Form tab/Form Guide module. Skip the (relatively expensive) segment
        # build entirely for the majority who have never appeared in a logged
        # match/angle at all — cuts this from ~1.1s to a few ms on this save.
        if uid in store.match_log_competitors_by_worker:
            raw_segments = _get_worker_segments(store, uid)
            if raw_segments:
                setattr(w, "form_summary", _summarize_segments(raw_segments))

        result.append(w)

    result.sort(key=lambda w: w.pop.pct, reverse=True)
    return result
