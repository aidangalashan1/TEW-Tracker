"""Characterization tests for the star-rating scoring engine in worker_service
(src/lib/scoring.ts's backend port) — the highest-value, most magic-number-heavy
logic in the app, previously untested. These lock in *current* output for
representative worker profiles so a refactor can't silently reshuffle every
worker's star rating; they don't assert the formula is "correct" against some
external spec, only that it doesn't drift.

`_compute_star_scores` is pure with respect to its `Worker` argument — it never
touches the datastore, only fields already set on `w` — so these fixtures are
constructed directly, with no live save file or ODBC driver required. The module
import chain still pulls in `datastore` (which imports pyodbc) at module scope,
so the whole file is skipped when the ODBC layer isn't installed, matching
test_roster_calculations.py's guard.

Expected values below were captured by running _compute_star_scores against
each fixture and reading back the actual output (a golden-master approach),
not hand-derived from the formula — the formula has enough interacting terms
(clamps, conditional bonuses, a `max()` of two potential-score floors) that
hand arithmetic is more error-prone than just characterizing what the code
does today.
"""
import pytest

pytest.importorskip("pyodbc", reason="worker_service imports the pyodbc-backed datastore")

from models import Worker, WorkerSkills, WorkerPhysical, WorkerContract, RatingDisplay  # noqa: E402
from services.worker_service import (  # noqa: E402
    _compute_star_scores,
    _calc_perf,
    _attr_modifier,
    _stars_from_score,
    _age_growth,
)


def _pct(v: int) -> RatingDisplay:
    return RatingDisplay.from_raw(v * 10)


def _worker(**overrides) -> Worker:
    base = dict(uid=1, name="Test", short_name="T", age=25, positions=["Wrestler"])
    base.update(overrides)
    return Worker(**base)


_SKILL_ALIASES = {"acting": "act", "selling": "sell", "toughness": "tough"}


def _skills(**vals) -> WorkerSkills:
    # WorkerSkills aliases 3 fields (acting/selling/toughness -> act/sell/tough);
    # without populate_by_name enabled, constructing with the friendly name
    # silently lands in the extra='allow' bucket instead of the real field, so
    # those three inputs would be dropped entirely at score-time. Route through
    # the alias so this fixture builder actually sets what it claims to.
    return WorkerSkills(**{_SKILL_ALIASES.get(k, k): _pct(v) for k, v in vals.items()})


MID_SKILLS = dict(
    brawl=50, puroresu=50, hardcore=50, technical=50, air=50, flash=50,
    charisma=50, mic=50, acting=50, star=50, looks=50, menace=50,
    psych=50, basics=50, selling=50, consistency=50, safety=50, stamina=50,
)
# A "typical" wrestler needs company/roster averages populated to avoid the
# saturation described in TestComputeStarScoresWrestler.test_missing_company_context_saturates_score —
# these numbers make the mid-skill baseline land mid-scale instead of clamping at 100.
MID_CONTEXT = dict(
    company_area_pop=50, roster_avg_pop=45,
    roster_avg_primary=50, roster_avg_ent=50, roster_avg_psych=50, roster_avg_fund=50,
)


class TestStarsFromScore:
    def test_thresholds(self):
        # Each bracket's floor produces a half-star bump; one below the floor
        # stays in the previous bracket.
        cases = [
            (0, 0.5), (9, 0.5), (10, 1), (19, 1), (20, 1.5), (29, 1.5),
            (30, 2), (39, 2), (40, 2.5), (49, 2.5), (50, 3), (59, 3),
            (60, 3.5), (69, 3.5), (70, 4), (79, 4), (80, 4.5), (89, 4.5),
            (90, 5), (100, 5),
        ]
        for score, expected in cases:
            assert _stars_from_score(score) == expected, f"score={score}"


class TestAgeGrowth:
    def test_thresholds(self):
        cases = [
            (18, 15), (20, 15), (21, 12), (22, 12), (23, 10), (25, 10),
            (26, 7), (28, 7), (29, 5), (31, 5), (32, 3), (34, 3),
            (35, 0), (37, 0), (38, -3), (40, -3), (41, -5), (43, -5),
            (44, -8), (50, -8),
        ]
        for age, expected in cases:
            assert _age_growth(age) == expected, f"age={age}"


class TestCalcPerf:
    def test_averages_charisma_mic_acting_and_best_of_visual_trio(self):
        # (charisma + mic + acting + max(star, looks, menace)) / 4
        s = _skills(charisma=80, mic=60, acting=40, star=90, looks=20, menace=10)
        assert _calc_perf(s) == (80 + 60 + 40 + 90) / 4  # 67.5


class TestAttrModifier:
    def test_age_brackets_with_no_other_attributes(self):
        cases = [
            (18, -1), (21, 0), (24, 0), (27, 1), (30, 1),
            (33, 0), (36, 0), (39, 0), (42, -2), (45, -2),
        ]
        for age, expected in cases:
            w = _worker(age=age, attributes=[])
            assert _attr_modifier(w) == expected, f"age={age}"

    def test_positive_personality_attribute(self):
        # Irrepressible (9) is the strongest positive personality bucket (+5 raw).
        w = _worker(age=25, attributes=[9])
        assert _attr_modifier(w) == 3

    def test_negative_personality_attribute(self):
        # Gloomy (17) is the strongest negative personality bucket (-5 raw).
        w = _worker(age=25, attributes=[17])
        assert _attr_modifier(w) == -2

    def test_perception_bonus_only_applies_to_top_two_tiers(self):
        cases = [(1, 2), (2, 2), (3, 0)]
        for perception, expected in cases:
            c = WorkerContract(uid=1, worker_uid=1, name="", fed_uid=1, amount=0, perception=perception)
            w = _worker(age=25, attributes=[], contract=c)
            assert _attr_modifier(w) == expected, f"perception={perception}"

    def test_vice_attributes_stack_a_flat_penalty_each(self):
        # Smoker (202) + Drinker (205) + Steroid User (214) = 3 danger flags.
        w = _worker(age=25, attributes=[202, 205, 214])
        assert _attr_modifier(w) == -2

    def test_stacking_many_positive_attributes(self):
        # Note: even this heavily-stacked combination (10 positive flags at
        # once, which wouldn't all co-occur on a real TEW worker) lands well
        # inside the function's [-35, 45] clamp — the clamp exists as a
        # defensive bound, not one ordinary attribute combinations reach.
        w = _worker(age=27, attributes=[9, 507, 548, 314, 346, 345, 348, 352, 502, 103])
        assert _attr_modifier(w) == 10


class TestComputeStarScoresNonWrestler:
    def test_no_skills_at_all_defaults_to_baseline(self):
        w = _worker(skills=None)
        _compute_star_scores(w)
        assert (w.current_score, w.potential_score, w.current_stars, w.potential_stars) == (0, 0, 0.5, 0.5)

    def test_unmatched_position_defaults_to_baseline(self):
        # positions=[] matches none of Referee/Announcer/Colour/Manager/
        # Personality/Road Agent, and the code doesn't fall back to a generic
        # score for that case — it's the same zero baseline as no skills.
        w = _worker(positions=[], skills=_skills())
        _compute_star_scores(w)
        assert (w.current_score, w.potential_score) == (0, 0)

    def test_referee_scores_from_refereeing_respect_and_pop(self):
        w = _worker(positions=["Referee"], skills=_skills(refereeing=70, respect=60), pop=_pct(50))
        _compute_star_scores(w)
        assert (w.current_score, w.potential_score, w.current_stars, w.potential_stars) == (60, 60, 3.5, 3.5)

    def test_announcer_scores_from_announcing_calc_perf_and_pop(self):
        w = _worker(positions=["Announcer"], skills=_skills(announcing=80, charisma=60, mic=70, acting=50, star=40, looks=30, menace=20), pop=_pct(40))
        _compute_star_scores(w)
        assert (w.current_score, w.potential_score, w.current_stars, w.potential_stars) == (58, 58, 3, 3)

    def test_manager_scores_from_calc_perf_and_pop_only(self):
        w = _worker(positions=["Manager"], skills=_skills(charisma=70, mic=80, acting=60, star=50, looks=40, menace=30), pop=_pct(60))
        _compute_star_scores(w)
        assert (w.current_score, w.potential_score, w.current_stars, w.potential_stars) == (62, 62, 3.5, 3.5)

    def test_road_agent_scores_from_a_weighted_psych_blend(self):
        w = _worker(positions=["Road Agent"], skills=_skills(psych=80, experience=50, respect=70))
        _compute_star_scores(w)
        assert (w.current_score, w.potential_score, w.current_stars, w.potential_stars) == (78, 78, 4, 4)

    def test_non_wrestler_current_and_potential_are_always_equal(self):
        # Unlike wrestlers, non-wrestler roles have no separate potential
        # calculation — potential is just a copy of current.
        w = _worker(positions=["Manager"], skills=_skills(charisma=70, mic=80, acting=60), pop=_pct(60))
        _compute_star_scores(w)
        assert w.current_score == w.potential_score
        assert w.current_stars == w.potential_stars


class TestComputeStarScoresWrestler:
    def test_zero_skills_still_produces_a_potential_score_floor(self):
        # Surprising: current=34 but potential=60. The potential formula is
        # max(score + age_growth, min(100, 60 + skill_delta*1.5)) — with
        # skill_delta==0 (no skills, no company context) the 60-floor term
        # wins over score+growth (34+15=49), so a zero-skill young worker
        # still gets a mid potential rating.
        w = _worker(age=0, skills=_skills())
        _compute_star_scores(w)
        assert (w.current_score, w.potential_score, w.current_stars, w.potential_stars) == (34, 60, 2, 3.5)

    def test_missing_company_context_saturates_score(self):
        # With company_area_pop/roster_avg_pop left at their 0 defaults,
        # company_level collapses to 0, so `delta = worker_level - 0` is
        # large and `score = 60 + delta*1.5` blows past the 100 clamp for
        # any decent worker_level — even plain 50-across-the-board skills.
        # This only doesn't happen in production because _set_company_data
        # always populates these fields before calling _compute_star_scores;
        # documented here so a caller who skips that step doesn't get a
        # silently-wrong "everyone is a 5-star" result mistaken for a feature.
        w = _worker(age=25, skills=_skills(**MID_SKILLS), pop=_pct(50))
        _compute_star_scores(w)
        assert (w.current_score, w.current_stars) == (100, 5)

    def test_mid_skills_with_realistic_company_context(self):
        w = _worker(age=25, skills=_skills(**MID_SKILLS), pop=_pct(50), **MID_CONTEXT)
        _compute_star_scores(w)
        assert (w.current_score, w.potential_score, w.current_stars, w.potential_stars) == (59, 69, 3, 3.5)

    def test_above_average_primary_and_charisma_score_higher_than_mid_baseline(self):
        above = dict(MID_SKILLS)
        for k in ("brawl", "puroresu", "hardcore", "technical", "air"):
            above[k] = 70
        above["charisma"] = 75
        w = _worker(age=25, skills=_skills(**above), pop=_pct(55), **MID_CONTEXT)
        _compute_star_scores(w)
        assert (w.current_score, w.potential_score, w.current_stars, w.potential_stars) == (71, 81, 4, 4.5)

    def test_core_entertainment_skills_at_90_earn_a_worker_level_bonus(self):
        # charisma/mic/acting all >= 90 triggers the core90>=2 -> +10 bonus
        # (checked before the milder core85>=2 -> +5 bonus).
        bonus = dict(MID_SKILLS)
        bonus["charisma"] = bonus["mic"] = bonus["acting"] = 90
        w = _worker(age=25, skills=_skills(**bonus), pop=_pct(50), **MID_CONTEXT)
        _compute_star_scores(w)
        assert (w.current_score, w.potential_score, w.current_stars, w.potential_stars) == (85, 95, 4.5, 5)

    def test_potential_is_capped_at_current_score_past_age_42(self):
        w = _worker(age=45, skills=_skills(**MID_SKILLS), pop=_pct(50), **MID_CONTEXT)
        _compute_star_scores(w)
        assert w.potential_score <= w.current_score
        assert (w.current_score, w.potential_score, w.current_stars, w.potential_stars) == (57, 57, 3, 3)

    def test_poor_physical_condition_lowers_current_score_below_baseline(self):
        w = _worker(age=25, skills=_skills(**MID_SKILLS), pop=_pct(50), **MID_CONTEXT,
                     physical=WorkerPhysical(condition1=20, condition2=90, condition3=90, condition4=90))
        _compute_star_scores(w)
        assert (w.current_score, w.potential_score, w.current_stars, w.potential_stars) == (46, 63, 2.5, 3.5)
        assert w.current_score < 59  # below the mid-skill baseline with full condition

    def test_low_stamina_lowers_current_score_below_baseline(self):
        low_stam = dict(MID_SKILLS)
        low_stam["stamina"] = 30
        w = _worker(age=25, skills=_skills(**low_stam), pop=_pct(50), **MID_CONTEXT)
        _compute_star_scores(w)
        assert (w.current_score, w.potential_score, w.current_stars, w.potential_stars) == (50, 61, 2.5, 3.5)
        assert w.current_score < 59  # below the mid-skill baseline with full stamina

    def test_derived_fields_are_populated(self):
        # _compute_star_scores also sets a handful of frontend-facing derived
        # fields as a side effect — lock in that it still does so.
        w = _worker(age=25, skills=_skills(**MID_SKILLS), pop=_pct(50), **MID_CONTEXT)
        _compute_star_scores(w)
        assert w.is_wrestler is True
        assert w.pillar_primary == 50
        assert w.perf_score == 50
