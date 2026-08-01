import os
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from core.database import reconnect, current_path, browse_file, close as db_close, DatabaseDriverError
from core.datastore import init_store, reset_store
from core.images import get_image_root, auto_detect_image_root, set_image_root, clear_image_root
from core.errors import ApiError

router = APIRouter(prefix="/api/database", tags=["database"])


@router.get("/status")
def status():
    from core.datastore import get_store
    path = current_path()
    connected = path is not None and os.path.isfile(path) and get_store() is not None
    img_root = get_image_root()
    return {
        "connected": connected,
        "path": path or "",
        "filename": os.path.basename(path) if path else "",
        "image_path": img_root or "",
        "image_configured": img_root is not None and os.path.isdir(img_root),
    }


class ConnectRequest(BaseModel):
    path: str


@router.post("/connect")
def connect(req: ConnectRequest):
    if not os.path.isfile(req.path):
        raise HTTPException(400, f"File not found: {req.path}")
    try:
        reconnect(req.path)
        init_store(req.path)
        if not get_image_root():
            img = auto_detect_image_root(req.path)
            if img:
                set_image_root(img)
        return {"ok": True, "path": req.path}
    except DatabaseDriverError as e:
        raise ApiError(
            str(e),
            code="odbc_driver_mismatch" if e.mismatch else "odbc_driver_missing",
            status=424,
        )
    except Exception as e:
        raise HTTPException(500, f"Failed to connect: {e}")


@router.post("/browse")
def browse():
    try:
        path = browse_file()
        if path:
            return {"path": path, "cancelled": False}
        return {"path": None, "cancelled": True}
    except Exception as e:
        raise HTTPException(500, f"Failed to open file dialog: {e}")


@router.post("/disconnect")
def disconnect():
    db_close()
    reset_store()
    clear_image_root()
    return {"ok": True}
