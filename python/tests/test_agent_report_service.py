"""Characterization tests for domains.worker.agent_report — the scouting-
report narrative generator, previously untested despite being almost as
magic-number-heavy as the scoring engine. These lock in *current* output for
representative worker profiles so a refactor can't silently drop a pro/con
rule or reorder the report.

This module never imports datastore/pyodbc — it's pure end to end, operating
only on an already-populated Worker plus a plain fed dict — so no ODBC
driver or importorskip guard is needed here.

Expected values were captured by running build_agent_report/_summary against
each fixture and reading back the actual output (golden-master style), not
hand-derived — the pro/con list has ~80 independent conditional rules, so
characterizing what the code does today is far more reliable than re-deriving
it by eye.
"""
from models import Worker, WorkerSkills, WorkerContract, RatingDisplay
from domains.worker.agent_report import (
    build_agent_report,
    _best_role,
    _summary,
    _rel_tier,
    _pro_impact,
    _con_severity,
    _is_elite,
    _world_class2,
    _is_wrestler,
)

_SKILL_ALIASES = {"acting": "act", "selling": "sell", "toughness": "tough"}


def _pct(v: int) -> RatingDisplay:
    return RatingDisplay.from_raw(v * 10)


def _skills(**vals) -> WorkerSkills:
    return WorkerSkills(**{_SKILL_ALIASES.get(k, k): _pct(v) for k, v in vals.items()})


def _worker(**overrides) -> Worker:
    base = dict(uid=1, name="Test Worker", short_name="Test", age=25, positions=["Wrestler"], attributes=[])
    base.update(overrides)
    return Worker(**base)


class TestRelTier:
    def test_scales_off_company_popularity(self):
        assert _rel_tier(60) == {"elite": 85, "strong": 75, "solid": 65, "weak": 50, "poor": 40}

    def test_floors_company_pop_at_ten(self):
        # A near-zero company popularity would otherwise push "poor" negative
        # in an unhelpful way — floored at 10 first.
        assert _rel_tier(5) == {"elite": 35, "strong": 25, "solid": 15, "weak": 0, "poor": -10}


class TestImpactSeverity:
    def test_pro_impact_scales_with_margin_above_threshold(self):
        assert _pro_impact(90, 75, 60) == 1 + (90 - 75) / max(60 * 0.12, 5)

    def test_con_severity_scales_with_margin_below_threshold(self):
        assert _con_severity(40, 50, 60) == 1 + (50 - 40) / max(60 * 0.12, 5)

    def test_both_are_clamped_to_0_05_5_range(self):
        assert _pro_impact(100, 0, 60) == 5
        assert _pro_impact(0, 100, 60) == 0.05
        assert _con_severity(0, 100, 60) == 5
        assert _con_severity(100, 0, 60) == 0.05


class TestSmallPredicates:
    def test_is_elite_threshold(self):
        assert _is_elite(90) is True
        assert _is_elite(89) is False

    def test_world_class2_needs_two_stats_at_90_plus(self):
        assert _world_class2(95, 92, 50, 50) is True
        assert _world_class2(95, 50, 50, 50) is False

    def test_is_wrestler_checks_wrestler_or_occasional_position(self):
        assert _is_wrestler(_worker(positions=["Wrestler"])) is True
        assert _is_wrestler(_worker(positions=["Occasional"])) is True
        assert _is_wrestler(_worker(positions=["Manager"])) is False


class TestBestRole:
    def test_wrestler_with_in_ring_skill_stays_wrestler(self):
        w = _worker(positions=["Wrestler"], skills=_skills(brawl=70))
        assert _best_role(w) == "Wrestler"

    def test_occasional_promotes_to_wrestler_above_60_in_ring(self):
        w = _worker(positions=["Occasional"], skills=_skills(technical=65))
        assert _best_role(w) == "Wrestler"

    def test_occasional_stays_occasional_below_60_in_ring(self):
        w = _worker(positions=["Occasional"], skills=_skills(technical=40))
        assert _best_role(w) == "Occasional"

    def test_manager_position_wins_with_high_charisma(self):
        w = _worker(positions=["Wrestler", "Manager"], skills=_skills(charisma=70))
        assert _best_role(w) == "Manager"

    def test_no_matching_position_returns_empty_string(self):
        w = _worker(positions=[], skills=_skills())
        assert _best_role(w) == ""


class TestBuildAgentReportStrongWrestler:
    """A well-rounded, above-company-average wrestler with a prominent
    perception and no current contract — many pro rules should fire."""

    @staticmethod
    def _report():
        w = _worker(
            uid=42, name="Ace Wrestler", age=28, positions=["Wrestler"],
            skills=_skills(charisma=88, mic=85, star=80, psych=80, experience=80,
                            basics=80, selling=80, stamina=80, athletic=80, power=80,
                            injury=80, consistency=80, safety=80, toughness=80, acting=80),
            contract=WorkerContract(uid=1, worker_uid=42, name="", fed_uid=5, amount=1000, perception=2, face=True),
            company_area_pop=60, roster_avg_pop=50,
            pillar_primary=50, pillar_perf=70, pillar_pop=60,
            current_stars=4, potential_stars=4.5,
            usage_label="Star", potential_usage_label="Major Star",
        )
        return build_agent_report(w, {"Name": "Test Fed", "Based_In": 3}, player_fed_uid=5)

    def test_pros_sorted_by_impact_descending(self):
        report = self._report()
        impacts = [p["impact"] for p in report["pros"]]
        assert impacts == sorted(impacts, reverse=True)

    def test_cons_sorted_by_impact_descending(self):
        report = self._report()
        impacts = [c["impact"] for c in report["cons"]]
        assert impacts == sorted(impacts, reverse=True)

    def test_expected_pro_texts_present(self):
        texts = {p["text"] for p in self._report()["pros"]}
        assert "A prominent face in Test Fed." in texts
        assert "Available to sign with Test Fed." in texts
        assert "Dripping with star quality." in texts
        assert "Excellent on the microphone." in texts

    def test_pop_zero_area_penalty_still_fires_despite_good_skills(self):
        # No overness was set on this fixture, so area_pop computes to 0 —
        # this correctly still produces "unknown in this market" cons even
        # for an otherwise strong worker, since popularity is orthogonal to
        # skill level in this model.
        texts = {c["text"] for c in self._report()["cons"]}
        assert "Unknown in USA." in texts
        assert "Less popular than the Test Fed average." in texts

    def test_pro_and_con_counts(self):
        report = self._report()
        assert len(report["pros"]) == 6
        assert len(report["cons"]) == 3

    def test_best_role_and_summary(self):
        report = self._report()
        assert report["best_role"] == "Wrestler"
        assert report["summary"] == (
            "Ace Wrestler profiles as a star within Test Fed. "
            "Their charisma and presence is their strongest attribute. "
            "Their ring work could use improvement. "
            "At 28, they are entering their prime years. "
            "Near their ceiling, but still room to refine their game. "
            "Could develop into a major star with the right opportunities."
        )


class TestBuildAgentReportWeakRookie:
    """A green, low-skill free agent — many con rules should fire, few pros."""

    @staticmethod
    def _report():
        w = _worker(
            uid=7, name="Rookie Worker", age=19, positions=["Wrestler"],
            skills=_skills(charisma=20, mic=25, star=15, psych=20, experience=10,
                            basics=25, selling=20, stamina=40, athletic=45, power=30,
                            injury=50, consistency=25, safety=30, toughness=40, acting=20),
            contract=None, freelance=True,
            company_area_pop=60, roster_avg_pop=50,
            pillar_primary=20, pillar_perf=20, pillar_pop=10,
            current_stars=1, potential_stars=3,
            usage_label="Enhancement Talent", potential_usage_label="Mid-Carder",
        )
        return build_agent_report(w, {"Name": "Test Fed", "Based_In": 3}, player_fed_uid=5)

    def test_free_agent_pro_fires(self):
        texts = {p["text"] for p in self._report()["pros"]}
        assert "Available to sign with Test Fed." in texts

    def test_low_skill_cons_fire(self):
        texts = {c["text"] for c in self._report()["cons"]}
        assert "Lacks the charisma to really perform at the top of the card." in texts
        assert "Lacks the star presence to really be a top-level worker." in texts
        assert "Green around the edges. Needs more ring time to develop." in texts

    def test_far_more_cons_than_pros(self):
        report = self._report()
        assert len(report["pros"]) == 3
        assert len(report["cons"]) == 16

    def test_summary_reflects_youth_and_growth_ceiling(self):
        summary = self._report()["summary"]
        assert "just 19" in summary
        assert "sky is the limit" in summary.lower()


class TestSummaryAgeBrackets:
    """_summary's age-flavor sentence is a straight bracket lookup — lock in
    the boundary between each bracket's phrasing."""

    @staticmethod
    def _age_line(age: int) -> str:
        w = _worker(uid=1, name="Ager", age=age, skills=_skills(brawl=60),
                     pillar_primary=60, pillar_perf=40, pillar_pop=40,
                     usage_label="Mid-Carder", potential_usage_label="Star",
                     current_stars=3, potential_stars=3,
                     roster_avg_primary=0, roster_avg_ent=0, roster_avg_pop=0)
        return _summary(w, "Test Fed", "USA")

    def test_boundaries(self):
        cases = {
            18: "they have their entire career ahead of them",
            21: "Still early in their career at 21",
            24: "still developing and finding their footing",
            27: "entering their prime years",
            32: "squarely in their prime",
            36: "still have plenty of good years left",
            39: "in the veteran stage of their career",
            42: "the clock is ticking on their in-ring career",
            50: "every year could be their last between the ropes",
        }
        for age, expected_fragment in cases.items():
            assert expected_fragment in self._age_line(age), f"age={age}"


class TestSummaryPotentialGapPhrasing:
    @staticmethod
    def _gap_tail(current_stars: float, potential_stars: float) -> str:
        w = _worker(uid=1, name="Gapper", age=25, skills=_skills(brawl=60),
                     pillar_primary=60, pillar_perf=40, pillar_pop=40,
                     usage_label="Mid-Carder", potential_usage_label="Star",
                     current_stars=current_stars, potential_stars=potential_stars,
                     roster_avg_primary=0, roster_avg_ent=0, roster_avg_pop=0)
        return _summary(w, "Test Fed", "USA")

    def test_no_gap_has_no_growth_sentence(self):
        tail = self._gap_tail(2, 2)
        assert "develop into" not in tail
        assert "ceiling" not in tail

    def test_small_gap_uses_near_ceiling_phrasing(self):
        tail = self._gap_tail(2, 2.5)
        assert "Near their ceiling" in tail
        assert "Could develop into a star" in tail

    def test_large_gap_uses_boundless_potential_phrasing(self):
        tail = self._gap_tail(2, 3.5)
        assert "room to grow and develop further" in tail
        assert "Could develop into a star" in tail

    def test_negative_gap_notes_past_peak(self):
        tail = self._gap_tail(3, 2.5)
        assert "Already past their peak" in tail
