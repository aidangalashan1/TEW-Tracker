"""Tests for domains.worker.assembly._compute_pop_pillars — the shared
computation feeding usage_label()'s International/Hidden detection. A single
implementation is used by both the roster/all-workers builders and the
worker-detail (AgentReport) builder, so the same worker can't disagree with
itself between pages."""
from models import Worker
from domains.worker.assembly import _compute_pop_pillars


def _worker(**overrides) -> Worker:
    base = dict(uid=1, name="Test", short_name="T", age=25, positions=["Wrestler"])
    base.update(overrides)
    return Worker(**base)


class FakeStore:
    def __init__(self, feds):
        self.feds = feds


def _over_row(region_to_raw: dict) -> dict:
    """Raw Over{i} values on TEW's 0-1000 scale for the given regions;
    everything else defaults to 0."""
    return {f"Over{i}": region_to_raw.get(i, 0) for i in range(1, 58)}


class TestComputePopPillars:
    def test_converts_raw_0_1000_scale_to_0_100_pct(self):
        # Regression: pillar_local_pop/pillar_max_region_pop used to be left
        # as raw sums (0-1000 scale) while usage_label() compares them
        # against 0-100-scale thresholds (>=70, <40) — a real fed's raw pop
        # values would almost always be far outside those thresholds'
        # intended range.
        store = FakeStore(feds={1: {"Based_In": 1}})  # USA (regions 1-11)
        # USA regions (1-11) all at raw 300 -> pct 30; Japan (31-38) at raw
        # 900 -> pct 90.
        usa = {i: 300 for i in range(1, 12)}
        japan = {i: 900 for i in range(31, 39)}
        over_row = _over_row({**usa, **japan})
        w = _worker()
        _compute_pop_pillars(w, store, over_row, company_fed_uid=1)
        assert w.pillar_local_pop == 30
        assert w.pillar_max_region_pop == 90

    def test_area_region_ids_path_matches_company_fed_uid_path(self):
        # get_roster already resolves area_region_ids/home_area itself and
        # passes those directly (no fed lookup needed); get_all_workers and
        # get_worker_detail only have a fed uid and let this function look
        # the home area up. Both paths must agree for the same fed/worker.
        store = FakeStore(feds={1: {"Based_In": 1}})
        usa = {i: 400 for i in range(1, 12)}
        over_row = _over_row(usa)

        w_by_fed = _worker()
        _compute_pop_pillars(w_by_fed, store, over_row, company_fed_uid=1)

        w_by_region_ids = _worker()
        _compute_pop_pillars(w_by_region_ids, store, over_row, area_region_ids=list(range(1, 12)), home_area="USA")

        assert w_by_fed.pillar_local_pop == w_by_region_ids.pillar_local_pop == 40
        assert w_by_fed.pillar_max_region_is_home == w_by_region_ids.pillar_max_region_is_home is True

    def test_max_region_is_home_flag_true_when_home_area_is_the_peak(self):
        store = FakeStore(feds={1: {"Based_In": 1}})  # USA
        usa = {i: 900 for i in range(1, 12)}
        japan = {i: 300 for i in range(31, 39)}
        over_row = _over_row({**usa, **japan})
        w = _worker()
        _compute_pop_pillars(w, store, over_row, company_fed_uid=1)
        assert w.pillar_max_region_is_home is True
        assert w.pillar_local_pop == w.pillar_max_region_pop == 90

    def test_max_region_is_home_flag_false_when_a_foreign_area_is_the_peak(self):
        store = FakeStore(feds={1: {"Based_In": 1}})  # USA
        usa = {i: 300 for i in range(1, 12)}
        japan = {i: 900 for i in range(31, 39)}
        over_row = _over_row({**usa, **japan})
        w = _worker()
        _compute_pop_pillars(w, store, over_row, company_fed_uid=1)
        assert w.pillar_max_region_is_home is False

    def test_missing_fed_row_leaves_local_pop_at_default(self):
        store = FakeStore(feds={})
        over_row = _over_row({i: 900 for i in range(1, 12)})
        w = _worker()
        _compute_pop_pillars(w, store, over_row, company_fed_uid=999)
        assert w.pillar_local_pop == 0
        assert w.pillar_max_region_is_home is False
