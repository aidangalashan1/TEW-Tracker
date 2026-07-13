"""Characterization tests for the pure rating/conversion logic in models.py.

These lock in *current* behaviour (magic thresholds, rounding, mappings) so a
refactor or a TEW data-format change can't silently alter the numbers the UI
displays. No database or ODBC driver is needed — these are pure functions.
"""
from models import (
    scale_to_pct,
    scale_to_grade,
    RatingDisplay,
    _decode_condition,
    get_positions,
    Worker,
    Federation,
    Belt,
)


class TestScaleToPct:
    def test_endpoints(self):
        assert scale_to_pct(0) == 0
        assert scale_to_pct(1000) == 100

    def test_divides_by_ten_and_rounds(self):
        assert scale_to_pct(850) == 85
        assert scale_to_pct(837) == 84   # round(83.7)
        assert scale_to_pct(833) == 83   # round(83.3)

    def test_uses_bankers_rounding(self):
        # Python's round() is round-half-to-even; documented here on purpose so
        # a future switch to arithmetic rounding is a conscious, tested change.
        assert scale_to_pct(745) == 74   # round(74.5) -> 74 (even)
        assert scale_to_pct(755) == 76   # round(75.5) -> 76 (even)


class TestScaleToGrade:
    def test_grade_boundaries_are_inclusive_lower_bounds(self):
        assert scale_to_grade(950) == "A*"
        assert scale_to_grade(949) == "A"
        assert scale_to_grade(900) == "A"
        assert scale_to_grade(899) == "A-"
        assert scale_to_grade(500) == "D+"
        assert scale_to_grade(499) == "D"

    def test_low_end(self):
        assert scale_to_grade(200) == "E-"
        assert scale_to_grade(199) == "F+"
        assert scale_to_grade(100) == "F+"
        assert scale_to_grade(99) == "F"
        assert scale_to_grade(0) == "F"


class TestRatingDisplay:
    def test_from_raw_composes_all_three_representations(self):
        rd = RatingDisplay.from_raw(837)
        assert rd.raw == 837
        assert rd.pct == 84
        assert rd.grade == "B+"

    def test_default_is_zero_f(self):
        rd = RatingDisplay()
        assert (rd.raw, rd.pct, rd.grade) == (0, 0, "F")


class TestDecodeCondition:
    def test_none_and_negative_one_mean_full_health(self):
        assert _decode_condition(None) == 100
        assert _decode_condition(-1) == 100

    def test_scales_down_by_ten(self):
        assert _decode_condition(1000) == 100
        assert _decode_condition(555) == 55

    def test_floors_at_zero(self):
        assert _decode_condition(5) == 0     # 5 // 10 == 0
        assert _decode_condition(-5) == 0    # max(0, -1)


class TestGetPositions:
    def test_returns_labels_in_fixed_order(self):
        row = {"Position_Referee": True, "Position_Wrestler": True}
        # Order follows POSITION_PREFIXES, not insertion order of the row.
        assert get_positions(row) == ["Wrestler", "Referee"]

    def test_empty_when_no_positions(self):
        assert get_positions({}) == []


class TestWorkerFromDbRow:
    def test_maps_gender_and_style_codes(self):
        w = Worker.from_db_row(
            {"UID": 7, "Name": "Test Worker", "Shortname": "TW", "Gender": 5, "Style": 4}
        )
        assert w.uid == 7
        assert w.gender == "Female"
        assert w.style == "Puroresu"

    def test_unknown_codes_fall_back_to_defaults(self):
        w = Worker.from_db_row(
            {"UID": 1, "Name": "X", "Shortname": "X", "Gender": 999, "Style": 999}
        )
        assert w.gender == "Male"
        assert w.style == "Regular"


class TestFederationFromDbRow:
    def test_size_label_mapping(self):
        f = Federation.from_db_row({"UID": 1, "Name": "Fed", "Initials": "F", "Size": 5})
        assert f.size_label == "National"

    def test_unknown_size_gets_generic_label(self):
        f = Federation.from_db_row({"UID": 1, "Name": "Fed", "Initials": "F", "Size": 99})
        assert f.size_label == "Size 99"


class TestBeltFromDbRow:
    def test_style_and_level_mapping(self):
        b = Belt.from_db_row(
            {"UID": 1, "Name": "World Title", "Fed": 2, "Style": 2, "BeltLevel": 1}
        )
        assert b.style == "Tag Team"
        assert b.level == "World"
