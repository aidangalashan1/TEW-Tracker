"""Tests for domains.worker.assembly._compute_title_pillars — only
Primary-level belts (tblBelt.BeltLevel == 1, the main-event/world title
tier) should count toward usage_label()'s championship-flavor signals. A
worker with a few runs with a secondary title (an Intercontinental-style
belt) shouldn't read as a "Living Legend" or "Legendary" main eventer."""
from datetime import datetime

from models import Worker
from domains.worker.assembly import _compute_title_pillars, _belt_history_index_cache


def _worker(**overrides) -> Worker:
    base = dict(uid=1, name="Test", short_name="T", age=45, positions=["Wrestler"])
    base.update(overrides)
    return Worker(**base)


class FakeStore:
    def __init__(self, belts, belt_history, feds=None):
        self.version = 1
        self.belts = belts
        self.belt_history = belt_history
        self.feds = feds or {}


class TestComputeTitlePillars:
    def setup_method(self):
        _belt_history_index_cache.clear()

    def test_secondary_title_reigns_do_not_count(self):
        # BeltLevel 2 == Secondary (an Intercontinental-style belt).
        store = FakeStore(
            belts={100: {"UID": 100, "BeltLevel": 2, "Holder1": 0, "Holder2": 0}},
            belt_history=[
                {"BeltUID": 100, "Holder1": 1, "Defences": 10},
                {"BeltUID": 100, "Holder1": 1, "Defences": 10},
                {"BeltUID": 100, "Holder1": 1, "Defences": 10},
            ],
        )
        w = _worker()
        _compute_title_pillars(w, store, 1)
        assert w.title_reign_count == 0
        assert w.max_title_defences == 0
        assert w.is_champion is False

    def test_primary_title_reigns_count(self):
        # BeltLevel 1 == Primary (the fed's world/main-event title).
        store = FakeStore(
            belts={200: {"UID": 200, "BeltLevel": 1, "Holder1": 1, "Holder2": 0}},
            belt_history=[
                {"BeltUID": 200, "Holder1": 1, "Defences": 5},
                {"BeltUID": 200, "Holder1": 1, "Defences": 9},
            ],
        )
        w = _worker()
        _compute_title_pillars(w, store, 1)
        assert w.title_reign_count == 2
        assert w.max_title_defences == 9
        assert w.is_champion is True

    def test_fed_ace_flag_set_regardless_of_title_history(self):
        # tblFed.Ace is the fed's designated on-screen figurehead — not
        # necessarily the current or a past champion at all.
        store = FakeStore(
            belts={},
            belt_history=[],
            feds={10: {"UID": 10, "Ace": 1}},
        )
        w = _worker()
        _compute_title_pillars(w, store, 1)
        assert w.is_fed_ace is True
        assert w.title_reign_count == 0

    def test_fed_ace_flag_false_when_not_the_ace_of_any_fed(self):
        store = FakeStore(
            belts={},
            belt_history=[],
            feds={10: {"UID": 10, "Ace": 2}},
        )
        w = _worker()
        _compute_title_pillars(w, store, 1)
        assert w.is_fed_ace is False

    def test_mixed_primary_and_secondary_reigns_only_counts_primary(self):
        store = FakeStore(
            belts={
                200: {"UID": 200, "BeltLevel": 1, "Holder1": 0, "Holder2": 0},
                100: {"UID": 100, "BeltLevel": 2, "Holder1": 0, "Holder2": 0},
            },
            belt_history=[
                {"BeltUID": 200, "Holder1": 1, "Defences": 3},
                {"BeltUID": 100, "Holder1": 1, "Defences": 20},
                {"BeltUID": 100, "Holder1": 1, "Defences": 20},
            ],
        )
        w = _worker()
        _compute_title_pillars(w, store, 1)
        assert w.title_reign_count == 1
        assert w.max_title_defences == 3

    def test_total_title_reign_count_includes_every_belt_level(self):
        store = FakeStore(
            belts={
                200: {"UID": 200, "BeltLevel": 1, "Holder1": 0, "Holder2": 0},
                100: {"UID": 100, "BeltLevel": 2, "Holder1": 0, "Holder2": 0},
            },
            belt_history=[
                {"BeltUID": 200, "Holder1": 1, "Defences": 3},
                {"BeltUID": 100, "Holder1": 1, "Defences": 1},
                {"BeltUID": 100, "Holder1": 1, "Defences": 1},
            ],
        )
        w = _worker()
        _compute_title_pillars(w, store, 1)
        assert w.title_reign_count == 1
        assert w.total_title_reign_count == 3

    def test_longest_primary_reign_days_uses_captured_to_lost(self):
        store = FakeStore(
            belts={200: {"UID": 200, "BeltLevel": 1, "Holder1": 0, "Holder2": 0}},
            belt_history=[
                {"BeltUID": 200, "Holder1": 1,
                 "BeltCaptured": datetime(2020, 1, 1), "BeltLost": datetime(2020, 4, 1)},  # 91 days
                {"BeltUID": 200, "Holder1": 1,
                 "BeltCaptured": datetime(2021, 1, 1), "BeltLost": datetime(2022, 6, 1)},  # ~516 days
            ],
        )
        w = _worker()
        _compute_title_pillars(w, store, 1, game_date_val=datetime(2026, 1, 1))
        assert w.longest_primary_reign_days > 365
        assert w.longest_primary_reign_days == (datetime(2022, 6, 1) - datetime(2021, 1, 1)).days

    def test_ongoing_reign_with_no_belt_lost_uses_game_date_as_the_end(self):
        store = FakeStore(
            belts={200: {"UID": 200, "BeltLevel": 1, "Holder1": 1, "Holder2": 0}},
            belt_history=[
                {"BeltUID": 200, "Holder1": 1, "BeltCaptured": datetime(2024, 1, 1), "BeltLost": None},
            ],
        )
        w = _worker()
        _compute_title_pillars(w, store, 1, game_date_val=datetime(2026, 1, 1))
        assert w.longest_primary_reign_days == (datetime(2026, 1, 1) - datetime(2024, 1, 1)).days

    def test_world_title_with_unset_belt_level_still_counts_as_primary(self):
        # tblBelt.BeltLevel is commonly left unset (0/None) on a fed's single
        # actual World title — only secondary/tertiary belts get an explicit
        # non-zero level assigned by the user. `belt.get("BeltLevel", 1) or 1`
        # must treat that falsy 0/None the same as an explicit 1 (Primary).
        for missing_level_value in (0, None):
            store = FakeStore(
                belts={200: {"UID": 200, "BeltLevel": missing_level_value, "Holder1": 0, "Holder2": 0}},
                belt_history=[{"BeltUID": 200, "Holder1": 1, "Defences": 3}],
            )
            w = _worker()
            _compute_title_pillars(w, store, 1)
            assert w.title_reign_count == 1, f"failed for BeltLevel={missing_level_value!r}"

    def test_aaron_andrews_style_career_is_recognized_as_legendary(self):
        # Regression fixture matching a real reported case: 3x World
        # Heavyweight (one 427-day reign) plus several secondary-title runs
        # (All Action, Tag Team, International) that must NOT count toward
        # title_reign_count. This used to compute title_reign_count == 0 if
        # the World title's BeltLevel came through as 0/unset instead of an
        # explicit 1 — see test above.
        world_belt = {"UID": 1, "BeltLevel": 0, "Holder1": 0, "Holder2": 0}
        secondary_belt = {"UID": 2, "BeltLevel": 2, "Holder1": 0, "Holder2": 0}
        tag_belt = {"UID": 3, "BeltLevel": 2, "Holder1": 0, "Holder2": 0}
        store = FakeStore(
            belts={1: world_belt, 2: secondary_belt, 3: tag_belt},
            belt_history=[
                {"BeltUID": 1, "Holder1": 1, "BeltCaptured": datetime(2015, 11, 29), "BeltLost": datetime(2017, 1, 29)},
                {"BeltUID": 1, "Holder1": 1, "BeltCaptured": datetime(2017, 5, 28), "BeltLost": datetime(2018, 1, 28)},
                {"BeltUID": 1, "Holder1": 1, "BeltCaptured": datetime(2019, 7, 28), "BeltLost": datetime(2020, 5, 31)},
                {"BeltUID": 2, "Holder1": 1, "BeltCaptured": datetime(2007, 9, 4), "BeltLost": datetime(2007, 12, 18)},
                {"BeltUID": 2, "Holder1": 1, "BeltCaptured": datetime(2009, 8, 18), "BeltLost": datetime(2009, 12, 1)},
                {"BeltUID": 2, "Holder1": 1, "BeltCaptured": datetime(2011, 8, 16), "BeltLost": datetime(2012, 5, 8)},
                {"BeltUID": 3, "Holder1": 1, "BeltCaptured": datetime(2010, 12, 26), "BeltLost": datetime(2011, 5, 29)},
                {"BeltUID": 3, "Holder1": 1, "BeltCaptured": datetime(2014, 6, 29), "BeltLost": datetime(2014, 10, 26)},
            ],
        )
        w = _worker()
        _compute_title_pillars(w, store, 1, game_date_val=datetime(2020, 6, 1))
        assert w.title_reign_count == 3
        assert w.total_title_reign_count == 8
        assert w.longest_primary_reign_days > 365
