"""Tests for domains.worker.assembly._set_company_data's fallback when the
requested fed has no usable averages at all (unrecognized fed_uid, or a fed
with no fed_over/roster data) — comparing a worker's stats against a
company_level of 0 doesn't mean "weak company", it blows the star-score
formula's delta straight to the ceiling, reading as a flat 5*/5* for any
worker with nonzero skills. Reported symptom: every developmental-contract
worker showing 5*/5* regardless of actual ability."""
from datetime import datetime

from models import Worker, WorkerSkills, WorkerContract
from domains.worker.assembly import _set_company_data
import domains.worker.assembly as assembly_module
import domains.company.relative as relative_module


def _worker(**overrides) -> Worker:
    base = dict(uid=1, name="Test", short_name="T", age=25, positions=["Wrestler"])
    base.update(overrides)
    w = Worker(**base)
    # Decent-but-unremarkable skills across the board — nothing here should
    # score as a 5* main eventer on its own merits.
    skill_row = {k: 500 for k in (
        "Brawl", "Puroresu", "Hardcore", "Technical", "Air", "Psych", "Basics",
        "Sell", "Consistency", "Safety", "Stamina", "Charisma", "Mic", "Act", "Star", "Looks", "Menace",
    )}
    w.skills = WorkerSkills.from_db_row(skill_row)
    return w


class FakeStore:
    def __init__(self, feds, fed_over=None, contracts_by_fed=None, skills=None, overness=None, fed_parent=None):
        self.version = 1
        self.feds = feds
        self.fed_over = fed_over or {}
        self.contracts_by_fed = contracts_by_fed or {}
        self.skills = skills or {}
        self.overness = overness or {}
        self.fed_parent = fed_parent or {}


class TestSetCompanyDataFallback:
    def setup_method(self):
        relative_module._fed_avg_cache.clear()

    def test_unrecognized_fed_falls_back_to_player_fed_instead_of_maxing_the_score(self, monkeypatch):
        # A strong player fed (fed 10) so the fallback baseline is realistic;
        # fed 99 (the worker's nominal fed_uid) doesn't exist in store.feds
        # at all — this is the "empty/unusable company_level" case.
        strong_roster_skills = {"Brawl": 700, "Puroresu": 700, "Hardcore": 700, "Technical": 700, "Air": 700,
                                 "Psych": 700, "Basics": 700, "Sell": 700, "Consistency": 700, "Safety": 700,
                                 "Stamina": 700, "Charisma": 700, "Mic": 700, "Act": 700, "Star": 700,
                                 "Looks": 700, "Menace": 700}
        region_pop = {f"Over{i}": 700 for i in range(1, 58)}
        store = FakeStore(
            feds={10: {"UID": 10, "Based_In": 1, "User_Controlled": 1}},
            fed_over={10: region_pop},
            contracts_by_fed={10: [{"WorkerUID": 2, "Position_Wrestler": True}]},
            skills={2: strong_roster_skills},
            overness={2: region_pop},
        )
        monkeypatch.setattr(relative_module, "get_store", lambda: store)
        monkeypatch.setattr(assembly_module, "get_player_fed_uid", lambda: 10)

        w = _worker()
        _set_company_data(w, store, datetime(2026, 1, 1), fed_uid=99)

        assert w.roster_avg_primary > 0
        assert w.current_stars < 5

    def test_recognized_fed_with_real_zero_averages_is_left_alone(self, monkeypatch):
        # Contrast case: fed 10 legitimately exists but has no roster/pop
        # data recorded (e.g. brand-new, no fed_over row yet) — this isn't a
        # lookup failure, so no fallback should kick in; company_level
        # staying at 0 here is the actual data, not a bug to paper over.
        store = FakeStore(feds={10: {"UID": 10, "Based_In": 1, "User_Controlled": 1}})
        monkeypatch.setattr(relative_module, "get_store", lambda: store)
        monkeypatch.setattr(assembly_module, "get_player_fed_uid", lambda: 10)

        w = _worker()
        _set_company_data(w, store, datetime(2026, 1, 1), fed_uid=10)

        assert w.roster_avg_primary == 0
        assert w.company_area_pop == 0

    def test_developmental_contract_scores_against_the_parent_company_via_tblpact(self, monkeypatch):
        # Regression, matching a real reported case: every developmental
        # worker showed a flat 5*/5* because they were being scored against
        # their tiny feeder territory (near-zero pop) instead of the parent
        # company that actually owns them. The contract row's own
        # ParentFedUID is 0 here (not every save populates it) — the fed 19
        # -> fed 20 relationship comes from tblPact's Parent1/Parent2 flags
        # instead (store.fed_parent), same as tblContract.ParentFedUID would
        # provide when it IS populated.
        strong_parent_skills = {"Brawl": 700, "Puroresu": 700, "Hardcore": 700, "Technical": 700, "Air": 700,
                                 "Psych": 700, "Basics": 700, "Sell": 700, "Consistency": 700, "Safety": 700,
                                 "Stamina": 700, "Charisma": 700, "Mic": 700, "Act": 700, "Star": 700,
                                 "Looks": 700, "Menace": 700}
        region_pop_parent = {f"Over{i}": 700 for i in range(1, 58)}
        region_pop_feeder = {f"Over{i}": 40 for i in range(1, 58)}
        store = FakeStore(
            feds={19: {"UID": 19, "Based_In": 1, "User_Controlled": 0},
                  20: {"UID": 20, "Based_In": 1, "User_Controlled": 0}},
            fed_over={19: region_pop_feeder, 20: region_pop_parent},
            contracts_by_fed={19: [], 20: [{"WorkerUID": 3, "Position_Wrestler": True}]},
            skills={3: strong_parent_skills},
            overness={3: region_pop_parent},
            fed_parent={19: 20},
        )
        monkeypatch.setattr(relative_module, "get_store", lambda: store)
        monkeypatch.setattr(assembly_module, "get_player_fed_uid", lambda: 0)

        w = _worker()
        w.contract = WorkerContract(uid=1, worker_uid=1, name="", fed_uid=19, amount=0, parent_fed_uid=0)
        _set_company_data(w, store, datetime(2026, 1, 1))

        assert w.company_area_pop == 70  # the parent's pop, not the feeder's ~4
        assert w.current_stars < 5
