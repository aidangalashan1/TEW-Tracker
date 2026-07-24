"""Characterization tests for the pure scoring curves in storyline_ideas.

The rest of the engine needs a loaded DataStore (real save), but the past-
storyline recency curve is pure and worth pinning: it encodes the design rule
that a freshly-concluded storyline between two workers reads as a rehash, eases
to neutral over ~2 years, then becomes a capped nostalgia bonus.
"""
import pytest

# storyline_ideas imports datastore, which imports pyodbc — absent on Linux CI.
pytest.importorskip("pyodbc")

from services.storyline_ideas import _past_story_delta  # noqa: E402


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
