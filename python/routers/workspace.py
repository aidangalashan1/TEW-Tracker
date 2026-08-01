from datetime import datetime, timezone
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Any
from core.storage import workspace_path
from core.json_store import read_json_or_default, write_json

router = APIRouter(prefix="/api/workspace", tags=["workspace"])

_DEFAULT = {"pages": [], "layouts": {}}


class PageItem(BaseModel):
    id: str
    label: str


class WorkspaceUpdate(BaseModel):
    pages: list[PageItem]
    layouts: dict[str, Any]


@router.get("")
def get_workspace():
    return read_json_or_default(workspace_path(), _DEFAULT)


@router.put("")
def save_workspace(body: WorkspaceUpdate):
    data = {
        "pages": [p.model_dump() for p in body.pages],
        "layouts": body.layouts,
        "updated": datetime.now(timezone.utc).isoformat(),
    }
    write_json(workspace_path(), data)
    return {"ok": True}
