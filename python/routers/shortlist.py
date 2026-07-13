"""Player's personal scouting shortlist. Held entirely in a local JSON file
next to the save (mirrors planned_storylines.py's persistence) — never writes
to the read-only game database."""
import os
import json
from datetime import datetime, timezone
from fastapi import APIRouter
from pydantic import BaseModel
from database import current_path
from datastore import get_store

router = APIRouter(prefix="/api/shortlist", tags=["shortlist"])


def _path() -> str:
    mdb = current_path()
    d = (
        os.path.join(os.path.dirname(mdb), "tew-shortlist")
        if mdb
        else os.path.join(os.path.expanduser("~"), ".tew-tracker", "shortlist")
    )
    os.makedirs(d, exist_ok=True)
    return os.path.join(d, "shortlist.json")


def _read() -> list[dict]:
    p = _path()
    if not os.path.isfile(p):
        return []
    try:
        with open(p, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return []


def _write(entries: list[dict]) -> None:
    with open(_path(), "w", encoding="utf-8") as f:
        json.dump(entries, f, indent=2)


def _enrich(entries: list[dict]) -> list[dict]:
    """Attach current name/picture/positions so the frontend doesn't need a
    second round-trip — a shortlisted worker may since have been signed
    elsewhere, retired, etc., so this is looked up fresh each time."""
    store = get_store()
    out = []
    for e in entries:
        w_row = store.workers.get(e["worker_uid"]) if store else None
        out.append({
            **e,
            "name": (w_row.get("Name") if w_row else "") or "",
            "picture": (w_row.get("Picture") if w_row else "") or "",
            "found": w_row is not None,
        })
    return out


class AddBody(BaseModel):
    worker_uid: int
    notes: str = ""


class NotesBody(BaseModel):
    notes: str


@router.get("")
def list_shortlist():
    return {"entries": _enrich(_read())}


@router.post("")
def add_to_shortlist(body: AddBody):
    entries = _read()
    if not any(e["worker_uid"] == body.worker_uid for e in entries):
        entries.append({
            "worker_uid": body.worker_uid,
            "notes": body.notes,
            "added": datetime.now(timezone.utc).isoformat(),
        })
        _write(entries)
    return {"ok": True, "entries": _enrich(entries)}


@router.patch("/{worker_uid}")
def update_notes(worker_uid: int, body: NotesBody):
    entries = _read()
    for e in entries:
        if e["worker_uid"] == worker_uid:
            e["notes"] = body.notes
    _write(entries)
    return {"ok": True, "entries": _enrich(entries)}


@router.delete("/{worker_uid}")
def remove_from_shortlist(worker_uid: int):
    entries = [e for e in _read() if e["worker_uid"] != worker_uid]
    _write(entries)
    return {"ok": True, "entries": _enrich(entries)}
