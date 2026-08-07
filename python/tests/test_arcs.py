from routers.arcs import _normalize_item, _normalize_entry, ArcItem


def test_normalize_item_wraps_old_plain_string():
    item = _normalize_item("Turn heel after losing the title")
    assert item["text"] == "Turn heel after losing the title"
    assert item["status"] == "planned"
    assert item["linked_worker_uids"] == []
    assert item["linked_belt_uid"] is None
    assert item["linked_planned_storyline_ids"] == []
    assert item["linked_storyline_uids"] == []
    assert item["id"]


def test_normalize_item_leaves_current_format_alone():
    current = ArcItem(id="abc123", text="Feud with X", status="in_progress", linked_worker_uids=[5]).model_dump()
    assert _normalize_item(current) == current


def test_normalize_item_migrates_old_single_storyline_links_to_lists():
    item = {"id": "abc123", "text": "Feud with X", "linked_planned_storyline_id": "sl1", "linked_storyline_uid": 42}
    normalized = _normalize_item(item)
    assert normalized["linked_planned_storyline_ids"] == ["sl1"]
    assert normalized["linked_storyline_uids"] == [42]
    assert "linked_planned_storyline_id" not in normalized
    assert "linked_storyline_uid" not in normalized


def test_normalize_item_migrates_old_null_storyline_links_to_empty_lists():
    item = {"id": "abc123", "text": "Feud with X", "linked_planned_storyline_id": None, "linked_storyline_uid": None}
    normalized = _normalize_item(item)
    assert normalized["linked_planned_storyline_ids"] == []
    assert normalized["linked_storyline_uids"] == []


def test_normalize_entry_collapses_old_four_list_fields_into_arcs_and_goals():
    entry = {
        "character_profile": "A gritty veteran",
        "short_term_arcs": ["Win the tag titles"],
        "long_term_arcs": ["Main event a PPV"],
        "short_term_goals": ["Beat rival at the PPV"],
        "long_term_goals": ["Become world champion"],
    }
    normalized = _normalize_entry(entry)
    assert normalized["character_profile"] == "A gritty veteran"
    assert "short_term_arcs" not in normalized
    assert "long_term_arcs" not in normalized
    assert "short_term_goals" not in normalized
    assert "long_term_goals" not in normalized
    assert [i["text"] for i in normalized["arcs"]] == ["Win the tag titles", "Main event a PPV"]
    assert [i["text"] for i in normalized["goals"]] == ["Beat rival at the PPV", "Become world champion"]


def test_normalize_entry_leaves_current_format_alone():
    entry = {"character_profile": "A gritty veteran", "arcs": ["Win the tag titles"], "goals": []}
    normalized = _normalize_entry(entry)
    assert normalized["arcs"][0]["text"] == "Win the tag titles"
    assert normalized["goals"] == []


def test_normalize_entry_ignores_missing_fields():
    assert _normalize_entry({}) == {}
