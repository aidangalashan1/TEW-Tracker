"""The shared "build one Worker" primitive — skills, physical, age,
overness/pop, business data, bio, and computed scores/labels. Used by both
the roster list and worker-detail builders."""

from datetime import datetime
from models import Worker, WorkerSkills, WorkerPhysical, RatingDisplay
from models.base import scale_to_pct
from core.regions import AREAS, REGION_TO_AREA
from domains.company.relative import get_player_fed_uid, _compute_fed_averages
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
                       "worker_business", "feds", "fed_over", "contracts", "game_info",
                       "belts", "belt_history", "pacts")
_ROSTER_EXTRA_GROUPS = ("attributes", "belts", "storylines", "match_log",
                        "match_types", "chemistry", "away", "injured", "goals",
                        "past_cards", "morale", "teams", "stables")


def _lightweight_dump(w: Worker) -> dict:
    """Serialize a Worker for list views, excluding bulky fields the table
    never renders (overness per region, belt_history, moves). Cuts JSON
    payload size by ~70% for large rosters."""
    d = w.model_dump(exclude={"overness", "belt_history", "moves", "storylines"})
    return d


def _compute_pop_pillars(w: Worker, store, over_row: dict, *,
                          area_region_ids: list[int] = None, home_area: str = "",
                          company_fed_uid: int = None) -> None:
    """Sets pillar_local_pop, pillar_max_region_pop, and pillar_max_region_is_home
    — the inputs usage_label() uses to decide the International label — from a
    worker's per-region overness row and the viewing fed's home area (found via
    tblFed's Based_In). All on the 0-100 pct scale (Over{i} itself is 0-1000 raw
    — see models.base.scale_to_pct); previously these were left as raw sums,
    which made the >=70/<40 thresholds meaningless.

    Callers that already resolved the home area (get_roster) pass
    area_region_ids/home_area directly; callers that only have a fed uid
    (get_all_workers, get_worker_detail) pass company_fed_uid and this looks
    the home area up itself — one shared computation either way, so the
    Roster tab and the worker-detail/AgentReport tab can no longer disagree
    about the same worker's label."""
    resolved_home_area = home_area
    resolved_region_ids = area_region_ids
    if not resolved_region_ids and company_fed_uid:
        fed_row = store.feds.get(company_fed_uid)
        if fed_row:
            resolved_home_area = REGION_TO_AREA.get(fed_row.get("Based_In", 0), "")
            resolved_region_ids = AREAS.get(resolved_home_area, [])

    if resolved_region_ids:
        local_vals = [over_row.get(f"Over{i}", 0) for i in resolved_region_ids if 1 <= i <= 57]
        w.pillar_local_pop = scale_to_pct(sum(local_vals) / len(local_vals)) if local_vals else 0

    area_max = 0
    area_max_name = None
    for area_name, area_rids in AREAS.items():
        avals = [over_row.get(f"Over{i}", 0) for i in area_rids if 1 <= i <= 57]
        if avals:
            aavg = scale_to_pct(sum(avals) / len(avals))
            if aavg > area_max:
                area_max = aavg
                area_max_name = area_name
    w.pillar_max_region_pop = area_max
    w.pillar_max_region_is_home = bool(resolved_home_area) and area_max_name == resolved_home_area


# tblBeltHistory indexed by holder, cached per store version — built once
# and reused across every worker in a roster/all-workers build instead of
# rescanning the whole table per worker. Same pattern as roster.py's
# _response_cache; deliberately keeps only the latest version's entry.
_belt_history_index_cache: dict[int, dict[int, list[dict]]] = {}


def _belt_history_by_worker(store) -> dict[int, list[dict]]:
    cached = _belt_history_index_cache.get(store.version)
    if cached is not None:
        return cached
    index: dict[int, list[dict]] = {}
    for br in store.belt_history:
        for holder_key in ("Holder1", "Holder2", "Holder3"):
            uid = br.get(holder_key)
            if uid and uid > 0:
                index.setdefault(uid, []).append(br)
    _belt_history_index_cache.clear()
    _belt_history_index_cache[store.version] = index
    return index


def _is_primary_belt(store, belt_uid: int) -> bool:
    belt = store.belts.get(belt_uid)
    return bool(belt) and (belt.get("BeltLevel", 1) or 1) == 1


def _parse_belt_date(value) -> "datetime | None":
    if not value:
        return None
    if isinstance(value, datetime):
        return value
    try:
        return datetime.fromisoformat(str(value)[:19])
    except ValueError:
        return None


def _reign_days(br: dict, game_date_val) -> int:
    start = _parse_belt_date(br.get("BeltCaptured"))
    if not start:
        return 0
    end = _parse_belt_date(br.get("BeltLost")) or game_date_val
    if not end:
        return 0
    return max(0, (end - start).days)


def _compute_title_pillars(w: Worker, store, uid: int, game_date_val=None) -> None:
    """Sets is_champion, title_reign_count, max_title_defences,
    total_title_reign_count, longest_primary_reign_days, and is_fed_ace —
    usage_label()'s championship-flavor inputs (Face of the Company, Living
    Legend, Legendary, ...). title_reign_count/max_title_defences are
    Primary-level only (tblBelt.BeltLevel == 1, i.e. the main-event/world
    title tier) — a worker with a few runs with a secondary title (an
    Intercontinental-style belt) shouldn't read as a "Living Legend" or
    "Legendary" main eventer on that alone. total_title_reign_count counts
    every level, for the "long, decorated career" Legendary path that
    doesn't require 3 world titles specifically. is_fed_ace is a second,
    independent route into "Face of the Company": tblFed.Ace is the fed's
    designated on-screen figurehead, which isn't always the current
    champion. None of this is fed-scoped (same as store.champ_set used to
    be): a primary title held/won, or an Ace slot held, in any fed counts."""
    w.is_champion = any(
        (belt.get("BeltLevel", 1) or 1) == 1 and uid in (belt.get("Holder1", 0), belt.get("Holder2", 0))
        for belt in store.belts.values()
    )
    all_reigns = _belt_history_by_worker(store).get(uid, [])
    reigns = [r for r in all_reigns if _is_primary_belt(store, r.get("BeltUID"))]
    w.title_reign_count = len(reigns)
    w.max_title_defences = max((r.get("Defences", 0) or 0 for r in reigns), default=0)
    w.total_title_reign_count = len(all_reigns)
    w.longest_primary_reign_days = max((_reign_days(r, game_date_val) for r in reigns), default=0)
    w.is_fed_ace = any(fed.get("Ace") == uid for fed in store.feds.values())

    player_fed_uid = get_player_fed_uid()
    w.is_signed_to_player_fed = bool(player_fed_uid) and any(
        cr.get("FedUID") == player_fed_uid for cr in store.contracts_by_worker.get(uid, [])
    )


def _set_company_data(w: Worker, store, game_date_val, fed_uid: int = None):
    if fed_uid is None:
        contract = getattr(w, 'contract', None)
        # A developmental deal's FedUID points at the small feeder territory
        # itself (near-empty roster, a fraction of the parent's popularity),
        # not the actual company that owns the worker — ParentFedUID (or
        # tblPact's fed_parent, when the contract row's own field is blank)
        # is the real employer for rating purposes. See _build_worker's
        # docstring; this mirrors the same resolution used for
        # get_worker_detail's fallback.
        contract_fed_uid = getattr(contract, 'fed_uid', None)
        fed_uid = (getattr(contract, 'parent_fed_uid', None)
                   or (store.fed_parent.get(contract_fed_uid) if contract_fed_uid else None)
                   or contract_fed_uid)
    if not fed_uid:
        fed_uid = get_player_fed_uid() or None
    if fed_uid and game_date_val:
        avg = _compute_fed_averages(fed_uid, store, game_date_val)
        if not any(avg.values()):
            # fed_uid resolved to nothing usable (an unrecognized fed, or
            # one with no fed_over/roster data at all) — comparing
            # worker_level against a company_level of 0 doesn't mean "this
            # company is worthless", it blows the score formula's delta
            # straight to the ceiling, so every affected worker reads as a
            # flat 5*/5* regardless of their actual skill. Fall back to
            # the player's own fed as a sane baseline instead of silently
            # scoring against nothing.
            player_fed_uid = get_player_fed_uid()
            if player_fed_uid and player_fed_uid != fed_uid:
                avg = _compute_fed_averages(player_fed_uid, store, game_date_val)
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
                  company_fed_uid: int = None, score_fed_uid: int = None) -> Worker:
    """Create a Worker with skills, physical, age, overness/pop, business data,
    bio, and computed scores/labels.  Shared by get_all_workers and get_roster.

    *area_region_ids* — when provided, pop is averaged over that area (fed
    home-area); otherwise pop is the global average of all 57 regions.

    *company_fed_uid* — the fed whose home area anchors pop-pillar/
    International-vs-home comparisons (always the player's fed for the
    all-workers view — "home market" has to mean something even for workers
    with no contract at all).

    *score_fed_uid* — the fed whose roster average the star-score/label is
    compared against. Deliberately separate from company_fed_uid: a worker's
    star rating must be the same wherever it's shown (Worker List, Roster,
    Agent Report), so this should always be the worker's OWN contracted fed
    (falling back to the player's fed only for true free agents) — never
    "whichever fed is currently viewing them". Defaults to company_fed_uid
    when not given, for callers that don't need the two to differ.
    """
    if score_fed_uid is None:
        score_fed_uid = company_fed_uid
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
        _compute_pop_pillars(w, store, over_row, area_region_ids=area_region_ids, home_area=home_area, company_fed_uid=company_fed_uid)
    _compute_title_pillars(w, store, uid, game_date_val)
    biz = store.worker_business.get(uid)
    if biz:
        for k in ("Business", "Booking_Reputation", "Booking_Skill"):
            v = biz.get(k)
            if v is not None:
                setattr(w, k, v)
    _set_company_data(w, store, game_date_val, fed_uid=score_fed_uid)
    return w
