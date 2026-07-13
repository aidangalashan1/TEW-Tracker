"""Characterization tests for the finance service's pure aggregation helpers.

The module imports the datastore (pyodbc-backed), so it's skipped when the ODBC
layer isn't installed — the helpers under test don't touch a database.
"""
import pytest

pytest.importorskip("pyodbc", reason="finance_service imports the pyodbc-backed datastore")

from services.finance_service import (  # noqa: E402
    _pct,
    _totals,
    _line,
    _lines,
    INCOME_LINES,
    SUB_LINES,
)


class TestPct:
    def test_basic_rounding(self):
        assert _pct(1, 3) == 33.3
        assert _pct(0, 100) == 0.0

    def test_zero_whole_is_zero_not_a_crash(self):
        assert _pct(5, 0) == 0.0


class TestTotals:
    def test_sums_only_top_level_income_and_expense_columns(self):
        row = {"Inc_Ticket": 100, "Inc_Merchandise": 50, "Exp_Worker": 30, "Exp_Tax": 0}
        income, expense = _totals(row)
        assert income == 150
        assert expense == 30

    def test_missing_columns_treated_as_zero(self):
        income, expense = _totals({})
        assert (income, expense) == (0, 0)


class TestLine:
    def test_computes_pct_of_total_and_sorts_children_desc(self):
        row = {"Inc_Merchandise": 100, "Inc_Merchandise_Live": 80, "Inc_Merchandise_Mail": 20}
        line = _line(row, "Inc_Merchandise", "Merchandise", total=200)
        assert line["value"] == 100
        assert line["pct"] == 50.0
        assert [c["label"] for c in line["children"]] == ["Live Sales", "Mail Order"]

    def test_omits_zero_valued_children(self):
        row = {"Inc_Merchandise": 80, "Inc_Merchandise_Live": 80, "Inc_Merchandise_Mail": 0}
        line = _line(row, "Inc_Merchandise", "Merchandise", total=80)
        assert [c["key"] for c in line["children"]] == ["Inc_Merchandise_Live"]

    def test_line_without_sub_lines_has_no_children(self):
        row = {"Inc_Ticket": 50}
        line = _line(row, "Inc_Ticket", "Ticket Sales", total=50)
        assert line["children"] == []


class TestLines:
    def test_drops_zero_lines_and_sorts_by_value_desc(self):
        row = {"Inc_Ticket": 10, "Inc_Merchandise": 90, "Inc_Sponsor": 0}
        out = _lines(row, INCOME_LINES, total=100)
        assert [l["key"] for l in out] == ["Inc_Merchandise", "Inc_Ticket"]

    def test_empty_row_yields_no_lines(self):
        assert _lines({}, INCOME_LINES, total=0) == []


def test_sub_lines_keys_are_all_valid_income_or_expense_columns():
    # Every SUB_LINES child key should look like a real Inc_/Exp_ column name —
    # guards against a typo silently producing an always-zero drill-down row.
    for parent, children in SUB_LINES.items():
        assert parent.startswith(("Inc_", "Exp_"))
        for key, _label in children:
            assert key.startswith(parent + "_"), f"{key} should be a sub-column of {parent}"
