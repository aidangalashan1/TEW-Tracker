"""get_roster (Roster tab) must pull in developmental prospects contracted to
a parent company's feeder territory — they're technically under that
company's control even though tblContract.FedUID points at the small
territory, not the parent, directly."""
from datetime import datetime

import domains.worker.roster as roster_module
import domains.worker.assembly as assembly_module
import domains.company.relative as relative_module
from domains.worker.roster import get_roster


class FakeStore:
    def __init__(self, workers, feds, overness, contracts_by_fed, contracts_by_worker,
                 skills=None, fed_over=None, fed_parent=None):
        self.version = 1
        self.game_date_val = datetime(2026, 1, 1)
        self.workers = workers
        self.feds = feds
        self.overness = overness
        self.contracts_by_fed = contracts_by_fed
        self.contracts_by_worker = contracts_by_worker
        self.skills = skills or {}
        self.physical = {}
        self.worker_bio = {}
        self.worker_business = {}
        self.fed_over = fed_over or {}
        self.belts = {}
        self.belt_history = []
        self.champ_set = set()
        self.fed_parent = fed_parent or {}
        self.attributes = []
        self.match_log = []
        self.match_log_competitors = []
        self.match_log_competitors_by_ml = {}
        self.match_types = {}
        self.past_cards = {}
        self.morale = []
        self.teams = []
        self.stables = []
        self.injured_set = set()
        self.away_set = set()
        self.goal_set = set()
        self.chemistry = []
        self.fed_storylines = {}
        self.storyline_workers = {}
        self.storyline_involved_by_sl = {}
        self.storyline_major = {}

    def preload_groups(self, *groups):
        pass


def _over_row(pct: int) -> dict:
    return {f"Over{i}": pct * 10 for i in range(1, 58)}


def test_get_roster_includes_developmental_workers_from_a_child_territory(monkeypatch):
    roster_module._response_cache.clear()
    relative_module._fed_avg_cache.clear()
    assembly_module._belt_history_index_cache.clear()

    skills = {k: 500 for k in (
        "Brawl", "Puroresu", "Hardcore", "Technical", "Air", "Psych", "Basics",
        "Sell", "Consistency", "Safety", "Stamina", "Charisma", "Mic", "Act", "Star", "Looks", "Menace",
    )}
    store = FakeStore(
        workers={
            1: {"UID": 1, "Name": "Main Roster Guy", "Retired": False, "Dead": False, "Position_Wrestler": True},
            2: {"UID": 2, "Name": "Dev Prospect", "Retired": False, "Dead": False, "Position_Wrestler": True},
        },
        feds={
            20: {"UID": 20, "Based_In": 1, "User_Controlled": 0},  # parent company
            19: {"UID": 19, "Based_In": 1, "User_Controlled": 0},  # feeder territory
        },
        overness={1: _over_row(50), 2: _over_row(50)},
        skills={1: skills, 2: skills},
        contracts_by_fed={
            20: [{"WorkerUID": 1, "FedUID": 20, "Position_Wrestler": True, "WrittenContract": True,
                  "ExclusiveContract": True, "Daysleft": 100, "Developmental": False}],
            19: [{"WorkerUID": 2, "FedUID": 19, "ParentFedUID": 20, "Position_Wrestler": True,
                  "WrittenContract": True, "ExclusiveContract": True, "Daysleft": 100, "Developmental": True}],
        },
        contracts_by_worker={
            1: [{"WorkerUID": 1, "FedUID": 20, "WrittenContract": True, "ExclusiveContract": True, "Daysleft": 100}],
            2: [{"WorkerUID": 2, "FedUID": 19, "ParentFedUID": 20, "WrittenContract": True,
                 "ExclusiveContract": True, "Daysleft": 100, "Developmental": True}],
        },
        fed_parent={19: 20},
    )
    monkeypatch.setattr(roster_module, "get_store", lambda: store)
    monkeypatch.setattr(relative_module, "get_store", lambda: store)

    result = get_roster(fed_uid=20)

    uids = {w["uid"] for w in result}
    assert uids == {1, 2}
    dev = next(w for w in result if w["uid"] == 2)
    assert dev["contract"]["developmental"] is True
    main = next(w for w in result if w["uid"] == 1)
    assert main["contract"]["developmental"] is False


def test_get_roster_for_the_feeder_territory_itself_still_scores_against_the_parent(monkeypatch):
    # Browsing "Rhode Island Pro Wrestling" (the territory) directly should
    # still rate its worker against the parent company, not the territory's
    # own near-empty roster — same fix, viewed from the other side.
    roster_module._response_cache.clear()
    relative_module._fed_avg_cache.clear()
    assembly_module._belt_history_index_cache.clear()

    skills = {k: 500 for k in (
        "Brawl", "Puroresu", "Hardcore", "Technical", "Air", "Psych", "Basics",
        "Sell", "Consistency", "Safety", "Stamina", "Charisma", "Mic", "Act", "Star", "Looks", "Menace",
    )}
    strong_parent_skills = {k: 700 for k in skills}
    store = FakeStore(
        workers={
            1: {"UID": 1, "Name": "Parent Roster Star", "Retired": False, "Dead": False, "Position_Wrestler": True},
            2: {"UID": 2, "Name": "Dev Prospect", "Retired": False, "Dead": False, "Position_Wrestler": True},
        },
        feds={
            20: {"UID": 20, "Based_In": 1, "User_Controlled": 0},
            19: {"UID": 19, "Based_In": 1, "User_Controlled": 0},
        },
        overness={1: _over_row(70), 2: _over_row(4)},
        skills={1: strong_parent_skills, 2: skills},
        contracts_by_fed={
            20: [{"WorkerUID": 1, "FedUID": 20, "Position_Wrestler": True, "WrittenContract": True,
                  "ExclusiveContract": True, "Daysleft": 100, "Developmental": False}],
            19: [{"WorkerUID": 2, "FedUID": 19, "Position_Wrestler": True,
                  "WrittenContract": True, "ExclusiveContract": True, "Daysleft": 100, "Developmental": True}],
        },
        contracts_by_worker={
            1: [{"WorkerUID": 1, "FedUID": 20, "WrittenContract": True, "ExclusiveContract": True, "Daysleft": 100}],
            2: [{"WorkerUID": 2, "FedUID": 19, "WrittenContract": True,
                 "ExclusiveContract": True, "Daysleft": 100, "Developmental": True}],
        },
        fed_over={20: _over_row(70), 19: _over_row(4)},
        fed_parent={19: 20},
    )
    monkeypatch.setattr(roster_module, "get_store", lambda: store)
    monkeypatch.setattr(relative_module, "get_store", lambda: store)

    result = get_roster(fed_uid=19)

    assert len(result) == 1
    assert result[0]["uid"] == 2
    # Compared to the parent's strong roster, not maxed out against the
    # near-empty feeder territory.
    assert result[0]["current_stars"] < 5
