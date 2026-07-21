import os
import json
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from storage import views_dir

router = APIRouter(prefix="/api/views", tags=["views"])


def _view_path(view_id: str) -> str:
    return os.path.join(views_dir(), f"{view_id}.json")


def _read_view(view_id: str) -> dict:
    path = _view_path(view_id)
    if not os.path.isfile(path):
        raise HTTPException(404, f"View '{view_id}' not found")
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def _write_view(view_id: str, data: dict):
    path = _view_path(view_id)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)


class PageSnapshot(BaseModel):
    id: str
    label: str
    layout: list[dict]
    moduleConfigs: dict = {}


class ViewCreate(BaseModel):
    name: str
    description: str = ""


class ViewUpdate(BaseModel):
    id: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    pages: Optional[list[PageSnapshot]] = None


@router.get("")
def list_views():
    d = views_dir()
    views = []
    for fname in sorted(os.listdir(d)):
        if fname.endswith(".json"):
            try:
                with open(os.path.join(d, fname), "r", encoding="utf-8") as f:
                    data = json.load(f)
                views.append({
                    "id": data.get("id", fname[:-5]),
                    "name": data.get("name", fname[:-5]),
                    "description": data.get("description", ""),
                    "created": data.get("created", ""),
                    "updated": data.get("updated", ""),
                    "pageCount": len(data.get("pages", [])),
                })
            except Exception:
                pass
    return {"views": views}


@router.get("/{view_id}")
def get_view(view_id: str):
    return _read_view(view_id)


@router.post("")
def create_view(body: ViewCreate):
    view_id = str(uuid.uuid4())[:8]
    now = datetime.now(timezone.utc).isoformat()
    data = {
        "id": view_id,
        "name": body.name,
        "description": body.description,
        "created": now,
        "updated": now,
        "pages": [],
    }
    _write_view(view_id, data)
    return {"ok": True, "view": data}


@router.put("/{view_id}")
def update_view(view_id: str, body: ViewUpdate):
    data = _read_view(view_id)
    if body.name is not None:
        data["name"] = body.name
    if body.description is not None:
        data["description"] = body.description
    if body.pages is not None:
        data["pages"] = [p.model_dump() for p in body.pages]
    data["updated"] = datetime.now(timezone.utc).isoformat()
    _write_view(view_id, data)
    return {"ok": True, "view": data}


@router.delete("/{view_id}")
def delete_view(view_id: str):
    path = _view_path(view_id)
    if not os.path.isfile(path):
        raise HTTPException(404, f"View '{view_id}' not found")
    os.remove(path)
    return {"ok": True}
