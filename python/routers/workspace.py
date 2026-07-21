import os
import json
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from typing import Any
from storage import workspace_path

router = APIRouter(prefix="/api/workspace", tags=["workspace"])


def _workspace_path() -> str:
    return workspace_path()


def _load() -> dict:
    path = _workspace_path()
    if not os.path.isfile(path):
        return {"pages": [], "layouts": {}}
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {"pages": [], "layouts": {}}


def _save(data: dict):
    path = _workspace_path()
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)


class PageItem(BaseModel):
    id: str
    label: str


class WorkspaceUpdate(BaseModel):
    pages: list[PageItem]
    layouts: dict[str, Any]


@router.get("")
def get_workspace():
    return _load()


@router.put("")
def save_workspace(body: WorkspaceUpdate):
    data = {
        "pages": [p.model_dump() for p in body.pages],
        "layouts": body.layouts,
        "updated": datetime.now(timezone.utc).isoformat(),
    }
    _save(data)
    return {"ok": True}
