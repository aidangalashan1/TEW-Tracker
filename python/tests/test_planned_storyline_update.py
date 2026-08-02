from domains.storyline.planned_router import create_storyline, update_storyline, CreateBody, UpdateBody, ShowRef


def _use_tmp_storylines_dir(monkeypatch, tmp_path):
    d = tmp_path / "storylines"
    d.mkdir()
    monkeypatch.setattr("domains.storyline.planned_router.storylines_dir", lambda: str(d))


def test_update_omitting_a_field_leaves_it_untouched(tmp_path, monkeypatch):
    _use_tmp_storylines_dir(monkeypatch, tmp_path)
    created = create_storyline(CreateBody(name="Feud", notes=""))
    sid = created["storyline"]["id"]

    ref = ShowRef(kind="past", ref_uid=1, show_type="tv", show_date="2024-01-01", show_name="Weekly Show")
    update_storyline(sid, UpdateBody(start_show=ref))

    # A later update that never mentions start_show must not clear it.
    result = update_storyline(sid, UpdateBody(name="Feud (renamed)"))
    assert result["storyline"]["name"] == "Feud (renamed)"
    assert result["storyline"]["start_show"]["show_name"] == "Weekly Show"


def test_update_with_explicit_null_clears_the_field(tmp_path, monkeypatch):
    _use_tmp_storylines_dir(monkeypatch, tmp_path)
    created = create_storyline(CreateBody(name="Feud", notes=""))
    sid = created["storyline"]["id"]

    ref = ShowRef(kind="upcoming", ref_uid=5, show_type="event", show_date="2024-06-01", show_name="Big PPV")
    update_storyline(sid, UpdateBody(end_show=ref))

    result = update_storyline(sid, UpdateBody(end_show=None))
    assert result["storyline"]["end_show"] is None
