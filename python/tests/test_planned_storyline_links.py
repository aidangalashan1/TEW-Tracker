import json
import os

from domains.storyline.planned_router import get_storyline_links


def test_get_storyline_links_finds_matching_arc_and_segment(tmp_path, monkeypatch):
    arcs_file = tmp_path / "arcs.json"
    arcs_file.write_text(json.dumps({
        "5": {
            "short_term_arcs": [
                {"id": "item1", "text": "Feud with rival", "linked_planned_storyline_id": "sl1"},
                {"id": "item2", "text": "Unrelated", "linked_planned_storyline_id": None},
            ],
        },
    }))
    monkeypatch.setattr("domains.storyline.planned_router.arcs_path", lambda: str(arcs_file))

    cards_dir = tmp_path / "cards"
    cards_dir.mkdir()
    (cards_dir / "card1.json").write_text(json.dumps({
        "id": "card1",
        "segments": [
            {"id": "seg1", "linked_planned_storyline_id": "sl1"},
            {"id": "seg2", "linked_planned_storyline_id": None},
        ],
    }))
    monkeypatch.setattr("domains.storyline.planned_router.cards_dir", lambda: str(cards_dir))

    result = get_storyline_links("sl1")

    assert result["arcs"] == [{"worker_uid": 5, "field": "short_term_arcs", "item_id": "item1", "text": "Feud with rival"}]
    assert result["segments"] == [{"card_id": "card1", "segment_id": "seg1"}]


def test_get_storyline_links_empty_when_nothing_matches(tmp_path, monkeypatch):
    arcs_file = tmp_path / "arcs.json"
    arcs_file.write_text("{}")
    monkeypatch.setattr("domains.storyline.planned_router.arcs_path", lambda: str(arcs_file))
    cards_dir = tmp_path / "cards"
    cards_dir.mkdir()
    monkeypatch.setattr("domains.storyline.planned_router.cards_dir", lambda: str(cards_dir))

    result = get_storyline_links("does-not-exist")
    assert result == {"arcs": [], "segments": []}
