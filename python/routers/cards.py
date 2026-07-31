import os
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional
from storage import cards_dir
from json_store import read_json, write_json, scan_json_dir

router = APIRouter(prefix="/api/cards", tags=["cards"])


def _card_path(card_id: str) -> str:
    return os.path.join(cards_dir(), f"{card_id}.json")


def _read_card(card_id: str) -> dict:
    return read_json(_card_path(card_id), f"Card '{card_id}' not found")


def _write_card(card_id: str, data: dict):
    write_json(_card_path(card_id), data)


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
    cards = []
    for stem, data in scan_json_dir(cards_dir()):
        if fed_uid is not None and data.get("fedUid") != fed_uid:
            continue
        cards.append({
            "id": data.get("id", stem),
            "showType": data.get("showType", ""),
            "showUid": data.get("showUid", 0),
            "showName": data.get("showName", ""),
            "showDate": data.get("showDate", ""),
            "segmentCount": len(data.get("segments", [])),
            "updated": data.get("updated", ""),
        })
    return {"cards": cards}


@router.get("/by-show")
def get_card_by_show(show_type: str = Query(...), show_uid: int = Query(...), show_date: str = Query(...)):
    for _stem, data in scan_json_dir(cards_dir()):
        if (data.get("showType") == show_type and
            data.get("showUid") == show_uid and
            data.get("showDate") == show_date):
            return data
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
