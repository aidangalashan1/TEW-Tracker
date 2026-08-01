"""Characterization tests for the pure aggregation helpers in
domains.worker.aggregate.

These guard the rating aggregation and age math that feed worker profiles.
Now that aggregate.py is split out of the old monolithic worker_service.py,
its import chain no longer pulls in datastore/pyodbc, so no ODBC driver or
importorskip guard is needed here.
"""
from datetime import datetime
from types import SimpleNamespace

from domains.worker.aggregate import (
    _avg_rating,
    _best_rating,
    _worst_rating,
    _best_info,
    _worst_info,
    _compute_age,
    _get_match_type_name,
)


class TestAggregateRatings:
    def test_avg_ignores_zero_and_missing_ratings(self):
        # `if v.get("rating")` treats 0 (and absent) as "no rating".
        assert _avg_rating([{"rating": 10}, {"rating": 20}, {"rating": 0}, {}]) == 15

    def test_avg_empty_is_zero(self):
        assert _avg_rating([]) == 0

    def test_best_and_worst(self):
        vals = [{"rating": 3}, {"rating": 9}, {"rating": 5}]
        assert _best_rating(vals) == 9
        assert _worst_rating(vals) == 3

    def test_best_and_worst_empty_default_to_zero(self):
        assert _best_rating([]) == 0
        assert _worst_rating([]) == 0


class TestBestWorstInfo:
    def test_best_info_returns_full_record_of_highest_rating(self):
        vals = [
            {"rating": 60, "log_entry": "lo", "label": "Singles", "card": "Show A"},
            {"rating": 90, "log_entry": "hi", "label": "Tag", "card": "Show B"},
        ]
        assert _best_info(vals) == {
            "rating": 90,
            "log_entry": "hi",
            "label": "Tag",
            "card": "Show B",
        }

    def test_worst_info_returns_full_record_of_lowest_rating(self):
        vals = [
            {"rating": 60, "log_entry": "lo", "label": "Singles", "card": "Show A"},
            {"rating": 90, "log_entry": "hi", "label": "Tag", "card": "Show B"},
        ]
        assert _worst_info(vals)["rating"] == 60
        assert _worst_info(vals)["card"] == "Show A"

    def test_info_on_empty_is_all_defaults(self):
        assert _best_info([]) == {"rating": 0, "log_entry": "", "label": "", "card": ""}


class TestComputeAge:
    GAME_DATE = datetime(2020, 6, 15)

    def test_birthday_not_yet_reached_this_year(self):
        assert _compute_age(datetime(1990, 12, 1), self.GAME_DATE) == 29

    def test_birthday_already_passed_this_year(self):
        assert _compute_age(datetime(1990, 1, 1), self.GAME_DATE) == 30

    def test_missing_inputs_return_zero(self):
        assert _compute_age(None, self.GAME_DATE) == 0
        assert _compute_age(datetime(1990, 1, 1), None) == 0


class TestMatchTypeName:
    def test_prefers_store_defined_name(self):
        store = SimpleNamespace(match_types={1: "Custom Singles"})
        assert _get_match_type_name(1, store) == "Custom Singles"

    def test_falls_back_to_builtin_map(self):
        store = SimpleNamespace(match_types={})
        assert _get_match_type_name(1, store) == "Singles"
        assert _get_match_type_name(0, store) == "Angle"

    def test_unknown_type_gets_generic_label(self):
        store = SimpleNamespace(match_types={})
        assert _get_match_type_name(999, store) == "Type 999"
