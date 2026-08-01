"""Player's personal scouting shortlist. Held entirely in a local JSON file
next to the save (mirrors planned_storylines.py's persistence) — never writes
to the read-only game database."""
from datetime import datetime, timezone
from fastapi import APIRouter
from pydantic import BaseModel
from core.datastore import get_store
from core.storage import shortlist_path
from core.json_store import read_json_list, write_json

router = APIRouter(prefix="/api/shortlist", tags=["shortlist"])


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
    return {"entries": _enrich(read_json_list(shortlist_path()))}


@router.post("")
def add_to_shortlist(body: AddBody):
    entries = read_json_list(shortlist_path())
    if not any(e["worker_uid"] == body.worker_uid for e in entries):
        entries.append({
            "worker_uid": body.worker_uid,
            "notes": body.notes,
            "added": datetime.now(timezone.utc).isoformat(),
        })
        write_json(shortlist_path(), entries)
    return {"ok": True, "entries": _enrich(entries)}


@router.patch("/{worker_uid}")
def update_notes(worker_uid: int, body: NotesBody):
    entries = read_json_list(shortlist_path())
    for e in entries:
        if e["worker_uid"] == worker_uid:
            e["notes"] = body.notes
    write_json(shortlist_path(), entries)
    return {"ok": True, "entries": _enrich(entries)}


@router.delete("/{worker_uid}")
def remove_from_shortlist(worker_uid: int):
    entries = [e for e in read_json_list(shortlist_path()) if e["worker_uid"] != worker_uid]
    write_json(shortlist_path(), entries)
    return {"ok": True, "entries": _enrich(entries)}
