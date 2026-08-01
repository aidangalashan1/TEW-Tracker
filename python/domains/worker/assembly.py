"""The shared "build one Worker" primitive — skills, physical, age,
overness/pop, business data, bio, and computed scores/labels. Used by both
the roster list and worker-detail builders."""

from datetime import datetime
from models import Worker, WorkerSkills, WorkerPhysical, RatingDisplay
from core.regions import AREAS
from services.company_service import get_player_fed_uid, _compute_fed_averages
from .aggregate import _compute_age
from .scoring import _compute_star_scores

# Datastore groups these builders touch, passed to store.preload_groups() so
# the ~10-20 short-lived connections load concurrently instead of one at a
# time (see DataStore.preload_groups — this is a wall-clock optimization
# only: preload_groups() is a superset hint, and any group not listed here
# still lazy-loads correctly, just sequentially, on first access via the
# normal __getattr__ path — so an out-of-date list can't cause a bug, only a
# missed speedup).
_CORE_WORKER_GROUPS = ("workers", "worker_bio", "skills", "physical", "overness",
                       "worker_business", "feds", "fed_over", "contracts", "game_info")
_ROSTER_EXTRA_GROUPS = ("attributes", "belts", "storylines", "match_log",
                        "match_types", "chemistry", "away", "injured", "goals",
                        "past_cards", "morale", "teams", "stables")


def _lightweight_dump(w: Worker) -> dict:
    """Serialize a Worker for list views, excluding bulky fields the table
    never renders (overness per region, belt_history, moves). Cuts JSON
    payload size by ~70% for large rosters."""
    d = w.model_dump(exclude={"overness", "belt_history", "moves", "storylines"})
    return d


def _set_company_data(w: Worker, store, game_date_val, fed_uid: int = None):
    if fed_uid is None:
        fed_uid = getattr(getattr(w, 'contract', None), 'fed_uid', None)
    if not fed_uid:
        fed_uid = get_player_fed_uid() or None
    if fed_uid and game_date_val:
        avg = _compute_fed_averages(fed_uid, store, game_date_val)
        w.company_area_pop = avg["company_area_pop"]
        w.roster_avg_primary = avg["roster_avg_primary"]
        w.roster_avg_ent = avg["roster_avg_ent"]
        w.roster_avg_psych = avg["roster_avg_psych"]
        w.roster_avg_fund = avg["roster_avg_fund"]
        w.roster_avg_stamina = avg["roster_avg_stamina"]
        w.roster_avg_pop = avg["roster_avg_pop"]
    _compute_star_scores(w)


def _build_worker(uid: int, store, game_date_val, *,
                  area_region_ids: list[int] = None, home_area: str = "",
                  company_fed_uid: int = None) -> Worker:
    """Create a Worker with skills, physical, age, overness/pop, business data,
    bio, and computed scores/labels.  Shared by get_all_workers and get_roster.

    *area_region_ids* — when provided, pop is averaged over that area (fed
    home-area); otherwise pop is the global average of all 57 regions.

    *company_fed_uid* — when provided, company_area_pop is based on this fed's
    home area rather than the worker's contract fed (needed for all-workers view
    where we compare against the player's home market).
    """
    w_row = store.workers.get(uid)
    if not w_row:
        return None
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
        if area_region_ids:
            vals = [over_row.get(f"Over{i}", 0) for i in area_region_ids]
            w.pop = RatingDisplay.from_raw(round(sum(vals) / len(vals)) if vals else 0)
            w.home_area = home_area
        else:
            all_vals = [over_row.get(f"Over{i}", 0) for i in range(1, 58)]
            w.pop = RatingDisplay.from_raw(round(sum(all_vals) / len(all_vals)))
        # Highest pop in any top-level region (for International label)
        area_max = 0
        for area_rids in AREAS.values():
            avals = [over_row.get(f"Over{i}", 0) for i in area_rids if 1 <= i <= 57]
            if avals:
                aavg = round(sum(avals) / len(avals))
                if aavg > area_max:
                    area_max = aavg
        w.pillar_max_region_pop = area_max
        # Worker's own pop in the player's fed home area
        if company_fed_uid:
            fed_row = store.feds.get(company_fed_uid)
            if fed_row:
                based_in = fed_row.get("Based_In", 0)
                for area_name, area_rids in AREAS.items():
                    if based_in in area_rids:
                        local_vals = [over_row.get(f"Over{i}", 0) for i in area_rids if 1 <= i <= 57]
                        w.pillar_local_pop = round(sum(local_vals) / len(local_vals)) if local_vals else 0
                        break
    biz = store.worker_business.get(uid)
    if biz:
        for k in ("Business", "Booking_Reputation", "Booking_Skill"):
            v = biz.get(k)
            if v is not None:
                setattr(w, k, v)
    _set_company_data(w, store, game_date_val, fed_uid=company_fed_uid)
    return w
