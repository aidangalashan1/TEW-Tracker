"""Federation-relative computation: which fed the player controls, a fed's home
area, and roster averages used to score a worker against their company. Reads
only raw store data (no Worker assembly), so it never depends on worker_service.
"""
from core.datastore import get_store
from core.regions import REGION_TO_AREA, AREAS

# Roster averages are expensive to recompute, so cache per fed for the duration
# of a roster/all-workers build; the builders reset it (clear_fed_avg_cache).
_fed_avg_cache: dict[int, dict] = {}


def clear_fed_avg_cache():
    _fed_avg_cache.clear()


def get_controlled_fed_uids() -> list[int]:
    store = get_store()
    if not store:
        return []
    return [uid for uid, f in store.feds.items() if f.get("User_Controlled") == 1]


def get_player_fed_uid() -> int:
    controlled = get_controlled_fed_uids()
    return controlled[0] if controlled else 0


def get_fed_home_area(fed_uid: int) -> str:
    store = get_store()
    if not store:
        return ""
    row = store.feds.get(fed_uid)
    return REGION_TO_AREA.get(row["Based_In"], "") if row else ""


def _compute_fed_averages(fed_uid: int, store, game_date_val) -> dict:
    key = fed_uid
    if key in _fed_avg_cache:
        return _fed_avg_cache[key]
    result = {
        "company_area_pop": 0,
        "roster_avg_primary": 0, "roster_avg_ent": 0, "roster_avg_psych": 0,
        "roster_avg_fund": 0, "roster_avg_stamina": 0, "roster_avg_pop": 0,
    }
    if not game_date_val:
        _fed_avg_cache[key] = result
        return result
    fed_row = store.feds.get(fed_uid)
    if not fed_row:
        _fed_avg_cache[key] = result
        return result
    based_in = fed_row.get("Based_In", 0)
    from_area = next((a for a, rs in AREAS.items() if based_in in rs), None)
    if from_area:
        area_regions = AREAS.get(from_area, [])
        over_row = store.fed_over.get(fed_uid)
        if over_row and area_regions:
            vals = [over_row.get(f"Over{i}", 0) for i in area_regions if 1 <= i <= 57]
            if vals:
                result["company_area_pop"] = round(sum(vals) / len(vals) / 10)
    roster_ids = [cr["WorkerUID"] for cr in store.contracts_by_fed.get(fed_uid, []) if cr.get("Position_Wrestler") or cr.get("Position_Occasional")]
    if roster_ids:
        skill_vals = [store.skills.get(uid) for uid in roster_ids if uid in store.skills]
        if skill_vals:
            def r10(v): return round((v or 0) / 10)
            b_avg = r10(sum(s.get("Brawl", 0) or 0 for s in skill_vals) / len(skill_vals))
            p_avg = r10(sum(s.get("Puroresu", 0) or 0 for s in skill_vals) / len(skill_vals))
            h_avg = r10(sum(s.get("Hardcore", 0) or 0 for s in skill_vals) / len(skill_vals))
            t_avg = r10(sum(s.get("Technical", 0) or 0 for s in skill_vals) / len(skill_vals))
            a_avg = r10(sum(s.get("Air", 0) or 0 for s in skill_vals) / len(skill_vals))
            ring = sorted([b_avg, p_avg, h_avg, t_avg, a_avg], reverse=True)
            result["roster_avg_primary"] = round(ring[0] * 0.50 + ring[1] * 0.25 + ring[2] * 0.15 + ring[3] * 0.07 + ring[4] * 0.03)
            result["roster_avg_psych"] = r10(sum(s.get("Psych", 0) or 0 for s in skill_vals) / len(skill_vals))
            ba = r10(sum(s.get("Basics", 0) or 0 for s in skill_vals) / len(skill_vals))
            se = r10(sum(s.get("Sell", 0) or 0 for s in skill_vals) / len(skill_vals))
            co = r10(sum(s.get("Consistency", 0) or 0 for s in skill_vals) / len(skill_vals))
            sa = r10(sum(s.get("Safety", 0) or 0 for s in skill_vals) / len(skill_vals))
            result["roster_avg_fund"] = round((ba + se + co + sa) / 4)
            result["roster_avg_stamina"] = r10(sum(s.get("Stamina", 0) or 0 for s in skill_vals) / len(skill_vals))
            c_list = [
                r10(sum(s.get("Charisma", 0) or 0 for s in skill_vals) / len(skill_vals)),
                r10(sum(s.get("Mic", 0) or 0 for s in skill_vals) / len(skill_vals)),
                r10(sum(s.get("Act", 0) or 0 for s in skill_vals) / len(skill_vals)),
                r10(sum(s.get("Star", 0) or 0 for s in skill_vals) / len(skill_vals)),
                r10(sum(s.get("Looks", 0) or 0 for s in skill_vals) / len(skill_vals)),
                r10(sum(s.get("Menace", 0) or 0 for s in skill_vals) / len(skill_vals)),
            ]
            c_sorted = sorted(c_list, reverse=True)
            result["roster_avg_ent"] = round(sum(c_list[:5]) / 5) if c_list[5] < c_sorted[2] else round(sum(c_list) / 6)
        if from_area and area_regions:
            pop_vals = []
            for uid in roster_ids:
                ov = store.overness.get(uid)
                if ov:
                    vals = [ov.get(f"Over{r}", 0) or 0 for r in area_regions]
                    pop_vals.append(sum(vals) / len(vals))
            if pop_vals:
                result["roster_avg_pop"] = round(sum(pop_vals) / len(pop_vals) / 10)
    _fed_avg_cache[key] = result
    return result
