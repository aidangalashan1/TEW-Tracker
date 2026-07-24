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
        assert _rub_delta(50, 0, 45, 30) == 0         # gap 5 < 15

    def test_no_rub_when_the_lesser_worker_cannot_grow(self):
        assert _rub_delta(70, 0, 40, 5) == 0          # receiver growth 5 < 10

    def test_scales_with_gap_and_receiver_growth(self):
        assert _rub_delta(70, 0, 40, 30) == 30        # 0.4*30 + 0.6*30

    def test_established_giver_adds_a_bonus(self):
        assert _rub_delta(70, -10, 40, 30) == 33      # + 0.3*10 (current>potential)

    def test_capped(self):
        assert _rub_delta(90, -20, 20, 60) == 35      # would be 70, capped at 35
