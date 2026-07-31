"""Integration tests for the DataStore lifecycle / atomic-swap fix.

These need a real (password-protected) TEW9 .mdb plus the Access ODBC driver, so
they are skipped automatically when either is unavailable — e.g. on CI or a
non-Windows box. On a developer machine with a save file present they verify:

  * a store is built and exposed via get_store()
  * `version` increases monotonically across reloads (the frontend polls
    /api/game/version to detect saves, so it must never reset)
  * reset_store() clears the store and stops the watcher thread
"""
import os

import pytest

pytest.importorskip("pyodbc")

import datastore  # noqa: E402


def _find_save() -> str | None:
    env = os.environ.get("TEW_DB_PATH")
    if env and os.path.isfile(env):
        return env
    repo_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    candidate = os.path.join(repo_root, "TEW9Save.mdb")
    return candidate if os.path.isfile(candidate) else None


@pytest.fixture
def save_path() -> str:
    path = _find_save()
    if not path:
        pytest.skip("No TEW9Save.mdb available (set TEW_DB_PATH to run)")
    return path


@pytest.fixture(autouse=True)
def _cleanup():
    yield
    # Always stop the watcher thread and drop the store between tests.
    datastore.reset_store()


@pytest.fixture(autouse=True)
def _no_warm_hook(monkeypatch):
    """This module tests DataStore's own lazy-load semantics in isolation.
    Importing services.worker_service / routers.schedule (as sibling test
    modules in the same pytest session do) registers their warm hooks —
    background threads that eagerly touch many groups right after
    init_store(). Neutralize them here so they can't race the loaded-groups
    assertions below; monkeypatch restores the real hooks after each test."""
    monkeypatch.setattr(datastore, "_warm_hooks", [])


def _init_or_skip(path: str):
    try:
        return datastore.init_store(path)
    except Exception as e:  # missing Access driver, locked file, bad password, ...
        pytest.skip(f"Could not open save file (driver/lock issue): {e}")


def test_init_exposes_a_loaded_store(save_path):
    store = _init_or_skip(save_path)
    assert datastore.get_store() is store
    assert store.version >= 1
    assert store.workers, "expected at least one worker row to load"


def test_version_is_monotonic_across_reloads(save_path):
    first = _init_or_skip(save_path)
    v1 = first.version
    second = datastore.init_store(save_path)  # simulate a reconnect/reload
    assert second.version > v1, "version must strictly increase, never reset"


def test_reset_clears_store_and_stops_watcher(save_path):
    _init_or_skip(save_path)
    assert datastore.get_store() is not None
    datastore.reset_store()
    assert datastore.get_store() is None
    assert datastore._watcher_stop.is_set()


def test_construction_is_lazy_and_opens_no_connection(tmp_path):
    # A store must construct without touching the DB — a bogus path is fine until
    # a data attribute is first accessed. (Needs pyodbc importable, but no driver
    # or real file, since nothing connects here.)
    store = datastore.DataStore(str(tmp_path / "nope.mdb"), version=5)
    assert store.version == 5
    assert store._loaded == set()


def test_unknown_attribute_raises_attributeerror(tmp_path):
    store = datastore.DataStore(str(tmp_path / "nope.mdb"))
    with pytest.raises(AttributeError):
        _ = store.does_not_exist


def test_attr_group_map_is_complete_and_consistent():
    # Every attribute listed in a group must map back to exactly that group.
    for group, (attrs, _loader) in datastore.DataStore._GROUPS.items():
        for attr in attrs:
            assert datastore.DataStore._ATTR_GROUP[attr] == group


def test_lazy_groups_load_on_access(save_path):
    store = _init_or_skip(save_path)
    # Touch a spread of groups; each should lazy-load without error, including
    # the derived indices that live alongside their raw table.
    assert isinstance(store.workers, dict)
    assert isinstance(store.feds, dict)
    assert isinstance(store.belts, dict)
    assert isinstance(store.champ_set, set)           # derived, belts group
    assert isinstance(store.contracts, list)
    assert isinstance(store.contracts_by_fed, dict)   # derived, contracts group
    assert isinstance(store.storyline_workers, dict)  # derived, storylines group
    assert isinstance(store.match_types, dict)
    assert isinstance(store.cards, dict)
    _ = store.game_date_val                            # game_info group (may be None)
    # A group is marked loaded only after access.
    assert "belts" in store._loaded
    assert "match_log" not in store._loaded            # never touched above
