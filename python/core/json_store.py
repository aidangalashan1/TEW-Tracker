"""Shared helpers for the routers that persist local, user-owned JSON state
(cards, planned storylines, views, workspace, profiles, shortlist) next to the
save — never the read-only game database.
"""
import os
import json
from fastapi import HTTPException


def read_json(path: str, not_found_msg: str) -> dict:
    """A required single-record file — 404s if missing."""
    if not os.path.isfile(path):
        raise HTTPException(404, not_found_msg)
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def read_json_or_default(path: str, default):
    """An optional single file — missing or corrupt just falls back."""
    if not os.path.isfile(path):
        return default
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return default


def read_json_list(path: str) -> list:
    """An optional file holding a JSON list — missing, corrupt, or the
    wrong shape all just fall back to an empty list."""
    data = read_json_or_default(path, [])
    return data if isinstance(data, list) else []


def write_json(path: str, data) -> None:
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)


def scan_json_dir(dir_path: str) -> list[tuple[str, dict]]:
    """(filename stem, parsed contents) for every *.json file in a directory
    of one-record-per-file entries (cards, planned storylines, views) —
    unreadable files are skipped. The stem is handed back alongside the data
    so callers can fall back to it as the record id when a file's own JSON
    doesn't carry one."""
    items = []
    for fname in sorted(os.listdir(dir_path)):
        if not fname.endswith(".json"):
            continue
        try:
            with open(os.path.join(dir_path, fname), "r", encoding="utf-8") as f:
                items.append((fname[:-5], json.load(f)))
        except Exception:
            pass
    return items
