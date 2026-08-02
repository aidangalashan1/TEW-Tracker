from routers.arcs import _normalize_item, _normalize_entry, ArcItem


def test_normalize_item_wraps_old_plain_string():
    item = _normalize_item("Turn heel after losing the title")
    assert item["text"] == "Turn heel after losing the title"
    assert item["status"] == "planned"
    assert item["linked_worker_uids"] == []
    assert item["linked_belt_uid"] is None
    assert item["linked_planned_storyline_id"] is None
    assert item["id"]


def test_normalize_item_leaves_current_format_alone():
    current = ArcItem(id="abc123", text="Feud with X", status="in_progress", linked_worker_uids=[5]).model_dump()
    assert _normalize_item(current) == current


def test_normalize_entry_migrates_all_four_list_fields():
    entry = {
        "character_profile": "A gritty veteran",
        "short_term_arcs": ["Win the tag titles"],
        "long_term_arcs": [],
        "short_term_goals": ["Beat rival at the PPV"],
        "long_term_goals": ["Become world champion"],
    }
    normalized = _normalize_entry(entry)
    assert normalized["character_profile"] == "A gritty veteran"
    assert normalized["short_term_arcs"][0]["text"] == "Win the tag titles"
    assert normalized["long_term_arcs"] == []
    assert normalized["short_term_goals"][0]["text"] == "Beat rival at the PPV"
    assert normalized["long_term_goals"][0]["text"] == "Become world champion"


def test_normalize_entry_ignores_missing_fields():
    assert _normalize_entry({}) == {}
