import json
from types import SimpleNamespace

from domains.storyline.planned_router import get_storyline_past_segments


class FakeStore:
    def __init__(self, past_cards, match_log, match_log_competitors_by_ml):
        self.past_cards = past_cards
        self.match_log = match_log
        self.match_log_competitors_by_ml = match_log_competitors_by_ml


def _write_storyline(tmp_path, monkeypatch, sid, workers):
    sl_dir = tmp_path / "storylines"
    sl_dir.mkdir()
    (sl_dir / f"{sid}.json").write_text(json.dumps({"id": sid, "workers": workers}))
    monkeypatch.setattr("domains.storyline.planned_router.storylines_dir", lambda: str(sl_dir))


def test_past_segments_finds_match_featuring_linked_worker(tmp_path, monkeypatch):
    _write_storyline(tmp_path, monkeypatch, "sl1", [5, 6])

    store = FakeStore(
        past_cards={1: {"UID": 1, "Fed": 10, "CardName": "Rumble", "PastCardWhen": "2026-01-05"}},
        match_log=[{"UID": 100, "CardUID": 1, "LogEntry": "A great match", "Rating": 850}],
        match_log_competitors_by_ml={100: [{"Worker": 5}, {"Worker": 99}]},
    )
    monkeypatch.setattr("domains.storyline.planned_router.get_store", lambda: store)
    monkeypatch.setattr("domains.storyline.planned_router.get_player_fed_uid", lambda: 10)

    result = get_storyline_past_segments("sl1")

    assert result["segments"] == [{"date": "2026-01-05", "show": "Rumble", "text": "A great match", "rating": 85}]


def test_past_segments_excludes_matches_without_linked_workers(tmp_path, monkeypatch):
    _write_storyline(tmp_path, monkeypatch, "sl1", [5])

    store = FakeStore(
        past_cards={1: {"UID": 1, "Fed": 10, "CardName": "Rumble", "PastCardWhen": "2026-01-05"}},
        match_log=[{"UID": 100, "CardUID": 1, "LogEntry": "Unrelated bout", "Rating": 500}],
        match_log_competitors_by_ml={100: [{"Worker": 99}]},
    )
    monkeypatch.setattr("domains.storyline.planned_router.get_store", lambda: store)
    monkeypatch.setattr("domains.storyline.planned_router.get_player_fed_uid", lambda: 10)

    assert get_storyline_past_segments("sl1")["segments"] == []


def test_past_segments_empty_when_storyline_has_no_workers(tmp_path, monkeypatch):
    _write_storyline(tmp_path, monkeypatch, "sl1", [])
    assert get_storyline_past_segments("sl1")["segments"] == []
