"""Star-rating scoring engine — port of the frontend logic (src/lib/scoring.ts)
so ratings are computed once on the backend and identical across list/detail
views. Pure with respect to its Worker argument: never touches the store,
only fields already set on `w` (see assembly.py for how those get set)."""

from models import Worker
from .labels import detect_style, age_prefix, is_banged_up, usage_label


def _compute_star_scores(w: Worker):
    s = w.skills
    if not s:
        w.current_score = 0; w.potential_score = 0
        w.current_stars = 0.5; w.potential_stars = 0.5
        return

    def _pct(k): return (getattr(s, k).pct if hasattr(getattr(s, k, None), 'pct') else 0) or 0

    is_wrestler = 'Wrestler' in (w.positions or []) or 'Occasional' in (w.positions or [])
    if not is_wrestler:
        pop = w.pop.pct if w.pop else 0
        pos = w.positions or []
        if 'Referee' in pos:
            skills = [_pct('refereeing'), _pct('respect'), pop]
        elif 'Announcer' in pos:
            skills = [_pct('announcing'), _calc_perf(s), pop]
        elif 'Colour' in pos:
            skills = [_pct('colour'), _calc_perf(s), pop]
        elif 'Manager' in pos or 'Personality' in pos:
            skills = [_calc_perf(s), pop]
        elif 'Road Agent' in pos:
            skills = [_pct('psych') * 0.85 + _pct('experience') * 0.03 + _pct('respect') * 0.12]
        else:
            skills = []
        if not skills:
            w.current_score = 0; w.potential_score = 0
            w.current_stars = 0.5; w.potential_stars = 0.5
            return
        avg = sum(skills) / len(skills)
        w.current_score = round(max(0, min(100, avg)))
        w.potential_score = w.current_score
        w.current_stars = _stars_from_score(w.current_score)
        w.potential_stars = w.current_stars
        return

    rv = [_pct(k) for k in ('brawl', 'puroresu', 'hardcore', 'technical', 'air')]
    fl = _pct('flash')
    primary = max(rv)
    perf = _calc_perf(s)
    pop = w.pop.pct if w.pop else 0
    fund = (_pct('psych') + _pct('basics') + _pct('selling') + _pct('consistency') + _pct('safety')) / 5
    stamina = _pct('stamina')
    psych = _pct('psych')
    best_skill = max(primary, perf)
    worst_skill = min(primary, perf)
    secondary = (psych + fund + stamina) / 3
    worker_level = pop * 0.50 + best_skill * 0.25 + worst_skill * 0.15 + secondary * 0.10

    core85 = sum(1 for k in ('charisma', 'mic', 'acting') if _pct(k) >= 85)
    core90 = sum(1 for k in ('charisma', 'mic', 'acting') if _pct(k) >= 90)
    best_vis85 = max(_pct('star'), _pct('looks'), _pct('menace')) >= 85
    if core85 >= 3: worker_level += 10
    elif core90 >= 2: worker_level += 10
    elif core85 >= 2: worker_level += 5
    if best_vis85 and core85 >= 2: worker_level += 5
    worker_level += max(-10, min(10, _attr_modifier(w)))

    company_pop = w.company_area_pop or 0
    roster_avg_pop = w.roster_avg_pop or 0
    company_level = max(company_pop, roster_avg_pop) * 0.65 + min(company_pop, roster_avg_pop) * 0.35 if roster_avg_pop > 0 else company_pop
    delta = worker_level - company_level
    score = 60 + delta * 1.5
    pop_gap_current = max(0, company_level - pop)
    if pop_gap_current > 10:
        score -= pop_gap_current * 0.6

    if stamina < 60:
        score -= (60 - stamina) * 0.4

    flash_buff = min(5, max(0, (fl - 50) * 0.1))
    score += flash_buff

    phys = w.physical
    if phys:
        lowest = min(phys.condition1, phys.condition2, phys.condition3, phys.condition4)
        if lowest < 55:
            score -= (55 - lowest) * 0.35

    if delta < 0:
        rp = w.roster_avg_primary or 0
        re = w.roster_avg_ent or 0
        if rp > 0 or re > 0:
            roster_level = rp * 0.35 + re * 0.35 + (w.roster_avg_psych or 0) * 0.10 + (w.roster_avg_fund or 0) * 0.07
            roster_delta = worker_level - roster_level
            if roster_delta > 0:
                score += min((roster_delta / max(company_pop, 1)) * 15, 15)

    score = max(0, min(100, score))
    w.current_score = round(score)
    w.current_stars = _stars_from_score(score)

    skill_level = best_skill * 0.50 + worst_skill * 0.35 + secondary * 0.15 + max(-10, min(10, _attr_modifier(w)))
    skill_level = max(0, min(100, skill_level))
    skill_delta = skill_level - company_level
    potential = max(score + _age_growth(w.age), min(100, 60 + skill_delta * 1.5))
    potential = max(80 if core85 >= 2 and w.age <= 30 else 0, min(100, potential))
    if w.age > 42:
        potential = min(potential, score)
    w.potential_score = round(potential)
    w.potential_stars = _stars_from_score(potential)

    # Derived fields for frontend consumption (no more frontend computation)
    w.is_wrestler = is_wrestler
    w.pillar_primary = round(primary)
    w.pillar_perf = round(perf)
    w.pillar_pop = pop
    w.perf_score = round(_calc_perf(s))
    w.worker_type = detect_style(w)
    w.age_prefix = age_prefix(w.age)
    w.is_banged_up = is_banged_up(w)
    w.usage_label = usage_label(w, w.current_stars, w.current_score)
    w.potential_usage_label = usage_label(w, w.potential_stars, w.potential_score, is_potential=True)


def _calc_perf(skills) -> float:
    def p(k): return (getattr(skills, k).pct if hasattr(getattr(skills, k, None), 'pct') else 0) or 0
    cha, mic, act = p('charisma'), p('mic'), p('acting')
    best_vis = max(p('star'), p('looks'), p('menace'))
    return (cha + mic + act + best_vis) / 4


def _attr_modifier(w: Worker) -> float:
    attrs = (w.attributes or []) if hasattr(w, 'attributes') else (getattr(w, 'attributes', None) or [])
    if not attrs:
        attrs = []
    has = lambda i: i in attrs
    mod = 0.0
    age = w.age or 0
    if age <= 20: mod -= 2
    elif age <= 22: mod -= 1
    elif age <= 25: mod += 1
    elif age <= 28: mod += 2
    elif age <= 31: mod += 2
    elif age <= 34: mod += 1
    elif age <= 37: mod += 0
    elif age <= 40: mod -= 1
    elif age <= 43: mod -= 3
    else: mod -= 5
    if has(507): mod += 2
    if has(509): mod += 1
    if has(510): mod -= 2
    pos_pers = {1: 3, 3: 2, 4: 2, 5: 3, 8: 4, 9: 5, 11: 1}
    neg_pers = {12: -2, 13: -1, 14: -1, 15: -4, 16: -1, 17: -5, 18: -2, 19: -1, 20: -1, 21: -3, 22: -2, 23: -2, 24: -1, 25: -1, 26: -5, 27: -3, 28: -5}
    pers = next((id for id in attrs if 1 <= id <= 28), None)
    if pers and pers in pos_pers: mod += pos_pers[pers]
    elif pers and pers in neg_pers: mod += neg_pers[pers]
    if has(548): mod += 3
    elif has(547): mod += 2
    elif any(has(i) for i in [225, 226, 227, 228, 229, 231, 232, 233, 535, 550]): mod += 1
    if has(314) or has(315): mod += 2
    if has(310) or has(313): mod -= 2
    if any(has(i) for i in [125, 131, 134]): mod += 1
    if has(346): mod += 1
    if has(345): mod += 1
    if has(348): mod += 1
    if has(352): mod += 1
    if has(502): mod += 1
    if has(103): mod += 2
    if has(104) or has(105): mod += 1
    if has(122): mod += 1
    if has(106): mod += 1
    if has(347): mod -= 2
    if has(344): mod -= 1
    if has(118): mod -= 2
    if has(119): mod -= 1
    if has(351): mod -= 2
    if any(has(i) for i in [340, 341, 374, 375]): mod -= 1
    if has(545): mod -= 2
    if has(546): mod -= 1
    if has(543): mod -= 5
    if has(544): mod -= 1
    if has(349): mod -= 1
    if has(353): mod -= 1
    danger = [197, 198, 199, 201, 202, 203, 204, 205, 206, 207, 208, 209, 210, 211, 212, 213, 214, 215, 216, 217, 218, 27, 563]
    danger_count = sum(1 for i in danger if has(i))
    if danger_count: mod -= danger_count * 2
    if any(has(i) for i in [520, 521, 522, 523, 524]): mod -= 2
    if has(552): mod -= 2
    perception = getattr(getattr(w, 'contract', None), 'perception', 0) or 0
    if perception == 1: mod += 4
    elif perception == 2: mod += 2
    return max(-35, min(45, round(mod * 0.5)))


def _stars_from_score(score: float) -> float:
    if score >= 90: return 5
    if score >= 80: return 4.5
    if score >= 70: return 4
    if score >= 60: return 3.5
    if score >= 50: return 3
    if score >= 40: return 2.5
    if score >= 30: return 2
    if score >= 20: return 1.5
    if score >= 10: return 1
    return 0.5


def _age_growth(age: int) -> float:
    if age <= 20: return 15
    if age <= 22: return 12
    if age <= 25: return 10
    if age <= 28: return 7
    if age <= 31: return 5
    if age <= 34: return 3
    if age <= 37: return 0
    if age <= 40: return -3
    if age <= 43: return -5
    return -8
