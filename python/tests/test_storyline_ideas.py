"""Characterization tests for the pure scoring curves in storyline_ideas.

The rest of the engine needs a loaded DataStore (real save), but the past-
storyline recency curve is pure and worth pinning: it encodes the design rule
that a freshly-concluded storyline between two workers reads as a rehash, eases
to neutral over ~2 years, then becomes a capped nostalgia bonus.
"""
import pytest

# storyline_ideas imports datastore, which imports pyodbc — absent on Linux CI.
pytest.importorskip("pyodbc")

from services.storyline_ideas import _past_story_delta, _rub_delta  # noqa: E402


class TestPastStoryDelta:
    def test_just_concluded_story_gets_the_full_rehash_penalty(self):
        assert _past_story_delta(0) == (-40, "Recently shared a storyline")

    def test_penalty_eases_linearly_to_the_two_year_crossover(self):
        assert _past_story_delta(12)[0] == -20        # halfway down the 24mo ramp
        assert _past_story_delta(24) == (0, None)     # neutral at the crossover

    def test_becomes_a_capped_nostalgia_bonus_after_two_years(self):
        assert _past_story_delta(36) == (12, "Overdue for a rematch")
        assert _past_story_delta(48)[0] == 25         # reaches the cap
        assert _past_story_delta(120)[0] == 25        # stays capped


class TestRubDelta:
    def test_no_rub_without_a_real_popularity_gap(self):
        assert _rub_delta(50, 0, 45, 30) == 0         # gap 5 — peers

    def test_no_rub_when_the_lesser_worker_cannot_grow(self):
        assert _rub_delta(68, 0, 40, 5) == 0          # receiver growth 5 < 10

    def test_no_rub_across_an_implausible_gap(self):
        # a nobody would not credibly rival a main eventer in one story
        assert _rub_delta(90, 0, 15, 40) == 0         # gap 75 > max

    def test_peaks_at_a_one_tier_step(self):
        assert _rub_delta(68, 0, 40, 30) == 24        # gap 28 (ideal): 0.8*30

    def test_falls_off_for_a_wide_but_not_impossible_gap(self):
        # gap 45 -> plausibility 15/32; a plausible-gap rub outscores it
        assert _rub_delta(85, 0, 40, 30) == 11
        assert _rub_delta(85, 0, 40, 30) < _rub_delta(68, 0, 40, 30)

    def test_established_giver_adds_a_bonus(self):
        assert _rub_delta(68, -10, 40, 30) == 28      # + 0.4*10 (current>potential)

    def test_capped(self):
        assert _rub_delta(68, -30, 40, 60) == 35      # 0.8*60 + 0.4*30 = 60, capped
