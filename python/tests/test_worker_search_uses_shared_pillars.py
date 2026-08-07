"""Worker Search (WorkerSearchPage.tsx -> GET /roster/all -> get_all_workers)
builds every worker via the same _build_worker/_compute_pop_pillars pipeline
the Roster tab and AgentReport use — this locks that wiring in end-to-end so
a future refactor can't silently reintroduce a second, diverging worker
builder for the search list."""
from datetime import datetime

import domains.worker.roster as roster_module
import domains.worker.assembly as assembly_module
import domains.company.relative as relative_module
from domains.worker.roster import get_all_workers


class FakeStore:
    def __init__(self, workers, feds, overness, skills=None, physical=None,
                 worker_bio=None, worker_business=None, contracts_by_worker=None,
                 contracts_by_fed=None, fed_over=None, champ_set=None, belt_history=None,
                 belts=None, fed_parent=None):
        self.version = 1
        self.game_date_val = datetime(2026, 1, 1)
        self.workers = workers
        self.feds = feds
        self.overness = overness
        self.skills = skills or {}
        self.physical = physical or {}
        self.worker_bio = worker_bio or {}
        self.worker_business = worker_business or {}
        self.contracts_by_worker = contracts_by_worker or {}
        self.contracts_by_fed = contracts_by_fed or {}
        self.fed_over = fed_over or {}
        self.champ_set = champ_set or set()
        self.belt_history = belt_history or []
        self.belts = belts or {}
        self.fed_parent = fed_parent or {}

    def preload_groups(self, *groups):
        pass


def _over_row(region_to_raw: dict) -> dict:
    return {f"Over{i}": region_to_raw.get(i, 0) for i in range(1, 58)}


def test_get_all_workers_populates_usage_label_and_international_pillars(monkeypatch):
    roster_module._response_cache.clear()
    relative_module._fed_avg_cache.clear()
    assembly_module._belt_history_index_cache.clear()

    # A USA-based fed (region 1), a worker who's a minor star at home (USA,
    # regions 1-11) but genuinely famous in Japan (regions 31-38) — exactly
    # the case International exists for.
    usa = {i: 200 for i in range(1, 12)}   # pct 20 -> local_pop
    japan = {i: 850 for i in range(31, 39)}  # pct 85 -> max_region_pop
    store = FakeStore(
        workers={1: {"UID": 1, "Name": "Test Worker", "Retired": False, "Dead": False, "Position_Wrestler": True}},
        feds={10: {"UID": 10, "Based_In": 1, "User_Controlled": 1}},
        overness={1: _over_row({**usa, **japan})},
        contracts_by_worker={1: [{"WorkerUID": 1, "FedUID": 10, "WrittenContract": True, "ExclusiveContract": True, "Daysleft": 100}]},
        contracts_by_fed={10: [{"WorkerUID": 1, "FedUID": 10, "Position_Wrestler": True}]},
    )

    monkeypatch.setattr(roster_module, "get_store", lambda: store)
    monkeypatch.setattr(relative_module, "get_store", lambda: store)

    workers, total = get_all_workers(page=1, limit=50)

    assert total == 1
    w = workers[0]
    # These only get populated by _compute_pop_pillars — proves get_all_workers
    # (Worker Search's backing endpoint) routes through the shared function,
    # not a separate/duplicated computation.
    assert w["pillar_local_pop"] == 20
    assert w["pillar_max_region_pop"] == 85
    assert w["pillar_max_region_is_home"] is False
    assert "usage_label" in w and isinstance(w["usage_label"], str)
    # Regression: get_all_workers used to omit area_region_ids/home_area
    # entirely, so w.pop fell back to a flat average across all 57 regions
    # worldwide instead of the player's home area — every region outside
    # USA/Japan is 0 here, so a global average would collapse pop to a few
    # percent and tank the star score, disagreeing badly with the Roster
    # tab (which always uses the fed's own home-area pop: 20 here).
    assert w["pop"]["pct"] == 20


def test_star_score_compares_a_worker_against_their_own_fed_not_the_players(monkeypatch):
    # Regression: get_all_workers used to always compare every worker's
    # skill level against the PLAYER's own roster average, regardless of
    # who actually employs them — a solid performer at a small indie fed
    # would read as a scrub next to the player's stacked main roster (e.g.
    # 0.5*), even though their Agent Report (which compares them to their
    # own fed) showed them as a star there. Star score must be the same
    # number everywhere a worker is shown.
    roster_module._response_cache.clear()
    relative_module._fed_avg_cache.clear()
    assembly_module._belt_history_index_cache.clear()

    elite_skills = {k: 900 for k in (
        "Brawl", "Puroresu", "Hardcore", "Technical", "Air", "Psych", "Basics",
        "Sell", "Consistency", "Safety", "Stamina", "Charisma", "Mic", "Act", "Star", "Looks", "Menace",
    )}
    average_skills = {k: 400 for k in elite_skills}
    flat_pop = _over_row({i: 400 for i in range(1, 58)})

    store = FakeStore(
        workers={
            1: {"UID": 1, "Name": "Elite Star", "Retired": False, "Dead": False, "Position_Wrestler": True},
            2: {"UID": 2, "Name": "Small Fed Regular", "Retired": False, "Dead": False, "Position_Wrestler": True},
        },
        feds={
            10: {"UID": 10, "Based_In": 1, "User_Controlled": 1},  # the player's fed — stacked roster
            20: {"UID": 20, "Based_In": 1, "User_Controlled": 0},  # a small indie fed
        },
        overness={1: flat_pop, 2: flat_pop},
        skills={1: elite_skills, 2: average_skills},
        contracts_by_worker={
            1: [{"WorkerUID": 1, "FedUID": 10, "WrittenContract": True, "ExclusiveContract": True, "Daysleft": 100}],
            2: [{"WorkerUID": 2, "FedUID": 20, "WrittenContract": True, "ExclusiveContract": True, "Daysleft": 100}],
        },
        contracts_by_fed={
            10: [{"WorkerUID": 1, "FedUID": 10, "Position_Wrestler": True}],
            20: [{"WorkerUID": 2, "FedUID": 20, "Position_Wrestler": True}],
        },
    )

    monkeypatch.setattr(roster_module, "get_store", lambda: store)
    monkeypatch.setattr(relative_module, "get_store", lambda: store)

    workers, total = get_all_workers(page=1, limit=50)
    assert total == 2
    small_fed_worker = next(w for w in workers if w["uid"] == 2)
    # Compared to their OWN (small) fed's roster average — which is just
    # their own stats, since they're the only worker there — they read as
    # an average performer, not a scrub. Comparing against fed 10's elite
    # roster instead would crush this well below 2 stars.
    assert small_fed_worker["current_stars"] >= 2.5
