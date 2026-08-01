"""The two list-shaped worker queries — get_all_workers (unscoped, paginated)
and get_roster (fed-scoped, with win/loss/performance/storylines/tag-teams/
stables/chemistry) — plus their shared response cache and warm hook."""

from datetime import datetime, timedelta
from core.datastore import get_store, register_warm_hook
from core.regions import REGION_TO_AREA, AREAS
from core.morale_types import NEGATIVE_MORALE
from models import (
    WorkerContract, OvernessEntry, RatingDisplay, WinLoss,
    StorylineAssignment, TagTeamInfo, StableInfo, ChemistryInfo,
)
from services.company_service import get_player_fed_uid, get_fed_home_area, clear_fed_avg_cache
from .aggregate import MATCH_TYPE_NAMES, _build_performance
from .assembly import _build_worker, _lightweight_dump, _CORE_WORKER_GROUPS, _ROSTER_EXTRA_GROUPS

_response_cache: dict[str, list] = {}  # keys: "all:{version}", "roster:{fed_uid}:{version}"


def _evict_stale_cache(current_version: int) -> None:
    """Drop cached responses from older store versions. Every reload adds new
    "all:{version}" / "roster:{fed}:{version}" entries; without this the dict
    would grow unboundedly over a long session with many game saves — more so
    now that the warm hook (see warm_cache below) rebuilds it on every reload,
    not just when a user happens to visit a page that needs it."""
    suffix = f":{current_version}"
    for k in [k for k in _response_cache if not k.endswith(suffix)]:
        del _response_cache[k]


def get_all_workers(page: int = 1, limit: int = 200) -> tuple[list[dict], int]:
    """Return every non-retired, non-dead worker in the DB with skills,
    physical, overness/pop, and computed scores. No contract/fed scoping.
    Returns (pre-serialized dicts, total_count) with server-side pagination."""
    global _response_cache
    store = get_store()
    if not store:
        return [], 0
    _evict_stale_cache(store.version)
    cache_key = f"all:{store.version}"
    if cache_key not in _response_cache:
        clear_fed_avg_cache()
        store.preload_groups(*_CORE_WORKER_GROUPS)
        game_date_val = store.game_date_val

        all_uids = [uid for uid, w_row in store.workers.items() if not w_row.get("Retired") and not w_row.get("Dead")]
        player_fed_uid = get_player_fed_uid()
        raw = []
        for uid in all_uids:
            w = _build_worker(uid, store, game_date_val, company_fed_uid=player_fed_uid)
            if w is None:
                continue
            # Contract status for filtering
            contracts = store.contracts_by_worker.get(uid, [])
            w.contract_status = "none"
            w.contract_expiry_days = 0
            w.player_fed_uid = 0
            for cr in contracts:
                if cr.get("ExclusiveContract") and cr.get("WrittenContract"):
                    w.contract_status = "exclusive_written"
                    w.contract_expiry_days = cr.get("Daysleft", 0) or 0
                    w.player_fed_uid = cr.get("FedUID", 0)
                    break
                elif cr.get("WrittenContract") and w.contract_status == "none":
                    w.contract_status = "written"
                    w.contract_expiry_days = cr.get("Daysleft", 0) or 0
                    w.player_fed_uid = cr.get("FedUID", 0)
            raw.append(w)
        serialized = [_lightweight_dump(w) for w in raw]
        _response_cache[cache_key] = serialized

    all_dicts = _response_cache[cache_key]
    total = len(all_dicts)
    start = (page - 1) * limit
    return all_dicts[start:start + limit], total


def get_roster(fed_uid: int = None) -> list[dict]:
    global _response_cache
    store = get_store()
    if not store:
        return []

    if fed_uid is None:
        fed_uid = get_player_fed_uid()

    _evict_stale_cache(store.version)
    cache_key = f"roster:{fed_uid}:{store.version}"
    if cache_key in _response_cache:
        return _response_cache[cache_key]
    clear_fed_avg_cache()
    store.preload_groups(*_CORE_WORKER_GROUPS, *_ROSTER_EXTRA_GROUPS)

    home_area = get_fed_home_area(fed_uid)
    area_region_ids = AREAS.get(home_area, [])
    game_date_val = store.game_date_val

    contracts = store.contracts_by_fed.get(fed_uid, [])
    if not contracts:
        return []

    uids = [c["WorkerUID"] for c in contracts]
    uids_set = set(uids)
    attrs_by_uid: dict[int, list[int]] = {}
    for r in store.attributes:
        if r["WorkerUID"] in uids_set and not r.get("Hidden"):
            attrs_by_uid.setdefault(r["WorkerUID"], []).append(r["Attribute"])
    twelve_months_ago = (game_date_val - timedelta(days=365)) if game_date_val else (datetime.now() - timedelta(days=365))

    # ── Win/loss from match log ──
    wl_map: dict[int, dict[str, int]] = {}
    match_log_by_card = {}
    for ml in store.match_log:
        card = store.past_cards.get(ml["CardUID"])
        if card and card.get("Fed") == fed_uid and card.get("PastCardWhen", datetime.min) >= twelve_months_ago:
            match_log_by_card[ml["UID"]] = ml
    for mc in store.match_log_competitors:
        ml = match_log_by_card.get(mc["MatchLogUID"])
        if ml and mc["Worker"] in uids_set and ml["Victor"] > 0:
            rec = wl_map.setdefault(mc["Worker"], {"wins": 0, "losses": 0, "draws": 0})
            if mc["Side"] == ml["Victor"]:
                rec["wins"] += 1
            else:
                rec["losses"] += 1

    # ── Performance from match log ──
    perf_by_worker: dict[int, dict] = {}
    for ml_uid, ml in match_log_by_card.items():
        for mc in store.match_log_competitors_by_ml.get(ml_uid, []):
            worker = mc["Worker"]
            if worker not in uids_set:
                continue
            if worker not in perf_by_worker:
                perf_by_worker[worker] = {"match": [], "angle": [], "segment": []}
            mt = ml["Match_Type"]
            entry = ml["Rating"] if mt == 0 else (mc["Performance"] or ml["Rating"] or 0)
            if not entry:
                continue
            label = MATCH_TYPE_NAMES.get(mt) or store.match_types.get(mt) or f"Type {mt}"
            card_name = (store.past_cards.get(ml["CardUID"], {}).get("CardName") or "").strip()
            seg = {"rating": entry, "label": label, "card": card_name, "log_entry": (ml.get("LogEntry") or "").strip()}
            ts = ml.get("TimeStampText")
            if ts:
                try:
                    parts = str(ts).strip().split(":")
                    if len(parts) == 3:
                        seg["length"] = int(parts[0]) * 3600 + int(parts[1]) * 60 + int(parts[2])
                    elif len(parts) == 2:
                        seg["length"] = int(parts[0]) * 60 + int(parts[1])
                except (ValueError, IndexError):
                    pass
            perf_by_worker[worker]["segment"].append(seg)
            if mt == 0:
                perf_by_worker[worker]["angle"].append(seg)
            else:
                perf_by_worker[worker]["match"].append(seg)

    # ── Unhappy map from morale ──
    unhappy_map = {}
    latest_morale = {}
    for r in store.morale:
        if r["MoraleType"] >= 100:
            continue
        uid = r["WorkerUID"]
        dt = r.get("MoraleDate")
        if dt and (uid not in latest_morale or dt > latest_morale[uid]):
            latest_morale[uid] = dt
            reason = NEGATIVE_MORALE.get(r["MoraleType"], f"MoraleType {r['MoraleType']}")
            ctx = (r.get("ShowName") or "").strip()
            if ctx:
                reason = f"{reason}: {ctx}"
            for lvl_name, col in [("Furious", "Level1"), ("Angry", "Level2"), ("Annoyed", "Level3")]:
                val = r.get(col)
                if val and val > 0:
                    intensity = f"{lvl_name} ({val}w)"
                    break
            else:
                val = r.get("Level4") or 0
                intensity = f"Irritated ({val}w)"
            unhappy_map[uid] = f"{reason} - {intensity}"

    # ── Assemble workers ──
    result = []
    for c in contracts:
        uid = c["WorkerUID"]
        w = _build_worker(uid, store, game_date_val, area_region_ids=area_region_ids, home_area=home_area)
        if w is None:
            continue

        w.contract = WorkerContract.from_db_row(c)
        cname = c.get("Name", "").strip()
        if cname:
            w.name = cname

        over_row = store.overness.get(uid)
        if over_row:
            w.overness = [
                OvernessEntry(region=i, value=RatingDisplay.from_raw(over_row.get(f"Over{i}", 0)))
                for i in range(1, 58)
            ]
            w.home_region = REGION_TO_AREA.get(w.based_in, "")
            raw_home = over_row.get(f"Over{w.based_in}", 0)
            w.home_region_pop = RatingDisplay.from_raw(raw_home)

        wl = wl_map.get(uid)
        if wl:
            w.win_loss = WinLoss(**wl)

        flags = []
        if uid in store.injured_set:
            flags.append("injured")
        if uid in unhappy_map:
            flags.append(f"unhappy:{unhappy_map[uid]}")
        if uid in store.away_set:
            flags.append("absent")
        if uid in store.goal_set:
            flags.append("promise")
        if uid in store.champ_set:
            flags.append("champion")
        w.status = flags

        # Storylines
        sl_uids_for_worker = store.storyline_workers.get(uid, [])
        assignments = []
        for sl in store.fed_storylines.get(fed_uid, []):
            if sl["UID"] not in sl_uids_for_worker:
                continue
            involved = store.storyline_involved_by_sl.get(sl["UID"], [])
            involved_with = [
                {"uid": i["uid"], "name": i["name"], "alignment": i["alignment"], "major_role": i["major_role"]}
                for i in ({"uid": r["WorkerUID"], "name": (next(iter(store.contracts_by_worker.get(r["WorkerUID"], [])), {})).get("Name", "") or store.workers.get(r["WorkerUID"], {}).get("Name", "") or "", "alignment": r.get("Alignment", 0) or 0, "major_role": bool(r.get("MajorRole"))} for r in involved) if i["uid"] != uid
            ]
            major = uid in store.storyline_major.get(sl["UID"], set())
            assignments.append(StorylineAssignment(
                storyline_uid=sl["UID"],
                storyline_name=sl.get("Name") or "",
                heat=RatingDisplay.from_raw(sl.get("Heat") or 0),
                major_role=major,
                involved_with=involved_with,
            ))
        if assignments:
            w.storylines = assignments

        # Performance
        perf = perf_by_worker.get(uid)
        if perf:
            w.performance = _build_performance(perf["match"], perf["angle"], perf["segment"])

        # Tag teams
        tags = []
        for r in store.teams:
            if r.get("Fed") not in (fed_uid, 0):
                continue
            if r.get("Worker1") == uid:
                partner = r["Worker2"]
                tags.append({"name": r.get("Name") or "", "partner": partner, "exp": r.get("Experience", 0)})
            elif r.get("Worker2") == uid:
                partner = r["Worker1"]
                tags.append({"name": r.get("Name") or "", "partner": partner, "exp": r.get("Experience", 0)})
        if tags:
            w.tag_teams = [
                TagTeamInfo(name=t["name"], partner_name=store.workers.get(t["partner"], {}).get("Name", "") or "" if t["partner"] in store.workers else "", partner_uid=t["partner"], experience=t["exp"])
                for t in tags
            ]

        # Stables
        stabs = []
        for sr in store.stables:
            if sr.get("Fed") != fed_uid:
                continue
            for i in range(1, 19):
                if sr.get(f"Member{i}") == uid:
                    stabs.append({"name": sr.get("Name") or "", "leader": sr.get(f"Role{i}", 0) == 1})
        if stabs:
            w.stables = [StableInfo(name=s["name"], leader=s["leader"]) for s in stabs]

        # Chemistry
        chems = []
        for cr in store.chemistry:
            if cr.get("Player") != 1:
                continue
            if cr.get("IgnoreChem"):
                continue  # pairing the player has muted in-game — not a live signal
            # Preserve the real signed magnitude (TEW stores strength in Chem,
            # sign = good/bad) instead of collapsing to ±1 — the frontend still
            # groups by sign, but the magnitude is now available to surface.
            cval = cr["Chem"]
            if cr["Person1"] == uid:
                chems.append({"worker": cr["Person2"], "chem": cval})
            elif cr["Person2"] == uid:
                chems.append({"worker": cr["Person1"], "chem": cval})
        if chems:
            w.chemistry = [
                ChemistryInfo(worker_name=store.workers.get(c["worker"], {}).get("Name", "") or "" if c["worker"] in store.workers else "", worker_uid=c["worker"], chemistry=c["chem"])
                for c in chems
            ]

        w.attributes = attrs_by_uid.get(uid, [])
        result.append(w)

    serialized = [_lightweight_dump(w) for w in result]
    _response_cache[cache_key] = serialized
    return serialized


def warm_cache() -> None:
    """Pre-build and cache the worker-search "all workers" list and the
    player's roster, off the request path. Registered below as datastore's
    warm hook, so both an initial connect and an automatic reload after a
    game save are already warm by the time a page asks for them — instead of
    whoever opens Worker Search (or Roster) next paying the full build cost."""
    if not get_store():
        return
    try:
        get_all_workers(1, 1)
    except Exception as e:
        print(f"[worker/roster] Warm-cache (all workers) failed: {e}")
    try:
        get_roster()
    except Exception as e:
        print(f"[worker/roster] Warm-cache (roster) failed: {e}")


register_warm_hook(warm_cache)
