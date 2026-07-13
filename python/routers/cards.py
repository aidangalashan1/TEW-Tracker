import os
import json
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional
from database import current_path

router = APIRouter(prefix="/api/cards", tags=["cards"])


def _cards_dir() -> str:
    mdb = current_path()
    if not mdb:
        return os.path.join(os.path.expanduser("~"), ".tew-tracker", "cards")
    d = os.path.join(os.path.dirname(mdb), "tew-cards")
    os.makedirs(d, exist_ok=True)
    return d


def _card_path(card_id: str) -> str:
    return os.path.join(_cards_dir(), f"{card_id}.json")


def _read_card(card_id: str) -> dict:
    path = _card_path(card_id)
    if not os.path.isfile(path):
        raise HTTPException(404, f"Card '{card_id}' not found")
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def _write_card(card_id: str, data: dict):
    path = _card_path(card_id)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)


class CardSegment(BaseModel):
    type: str  # "match" or "angle"
    order: int
    workers: list[int] = []
    sides: list[list[int]] = []
    description: str = ""
    notes: str = ""
    storyline: str = ""
    saved: bool = False


class CardCreate(BaseModel):
    showType: str  # "tv" or "event"
    showUid: int
    showName: str
    showDate: str
    fedUid: int


class CardUpdate(BaseModel):
    segments: Optional[list[CardSegment]] = None
    notes: Optional[str] = None


@router.get("")
def list_cards(fed_uid: Optional[int] = Query(None)):
    d = _cards_dir()
    cards = []
    for fname in sorted(os.listdir(d)):
        if fname.endswith(".json"):
            try:
                with open(os.path.join(d, fname), "r", encoding="utf-8") as f:
                    data = json.load(f)
                if fed_uid is not None and data.get("fedUid") != fed_uid:
                    continue
                cards.append({
                    "id": data.get("id", fname[:-5]),
                    "showType": data.get("showType", ""),
                    "showUid": data.get("showUid", 0),
                    "showName": data.get("showName", ""),
                    "showDate": data.get("showDate", ""),
                    "segmentCount": len(data.get("segments", [])),
                    "updated": data.get("updated", ""),
                })
            except Exception:
                pass
    return {"cards": cards}


@router.get("/by-show")
def get_card_by_show(show_type: str = Query(...), show_uid: int = Query(...), show_date: str = Query(...)):
    d = _cards_dir()
    for fname in os.listdir(d):
        if fname.endswith(".json"):
            try:
                with open(os.path.join(d, fname), "r", encoding="utf-8") as f:
                    data = json.load(f)
                if (data.get("showType") == show_type and
                    data.get("showUid") == show_uid and
                    data.get("showDate") == show_date):
                    return data
            except Exception:
                pass
    return None


@router.get("/{card_id}")
def get_card(card_id: str):
    return _read_card(card_id)


@router.post("")
def create_card(body: CardCreate):
    card_id = str(uuid.uuid4())[:8]
    now = datetime.now(timezone.utc).isoformat()
    data = {
        "id": card_id,
        "showType": body.showType,
        "showUid": body.showUid,
        "showName": body.showName,
        "showDate": body.showDate,
        "fedUid": body.fedUid,
        "segments": [],
        "notes": "",
        "created": now,
        "updated": now,
    }
    _write_card(card_id, data)
    return {"ok": True, "card": data}


@router.put("/{card_id}")
def update_card(card_id: str, body: CardUpdate):
    data = _read_card(card_id)
    if body.segments is not None:
        data["segments"] = [s.model_dump() for s in body.segments]
    if body.notes is not None:
        data["notes"] = body.notes
    data["updated"] = datetime.now(timezone.utc).isoformat()
    _write_card(card_id, data)
    return {"ok": True, "card": data}


@router.delete("/{card_id}")
def delete_card(card_id: str):
    path = _card_path(card_id)
    if not os.path.isfile(path):
        raise HTTPException(404, f"Card '{card_id}' not found")
    os.remove(path)
    return {"ok": True}
