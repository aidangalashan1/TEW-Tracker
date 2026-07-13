import os
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from database import get_connection, current_path, browse_file, close as db_close
from datastore import init_store, reset_store
from images import get_image_root, auto_detect_image_root, set_image_root

router = APIRouter(prefix="/api/database", tags=["database"])


@router.get("/status")
def status():
    from datastore import get_store
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
        conn = get_connection(force_path=req.path)
        init_store(req.path)
        import database as db_mod
        if db_mod._connection:
            try: db_mod._connection.close()
            except: pass
            db_mod._connection = None
        if not get_image_root():
            img = auto_detect_image_root(req.path)
            if img:
                set_image_root(img)
        return {"ok": True, "path": req.path}
    except Exception as e:
        raise HTTPException(500, f"Failed to connect: {e}")


@router.get("/auto")
def auto_connect():
    from database import auto_detect
    path = auto_detect()
    if path:
        try:
            conn = get_connection(force_path=path)
            init_store(path)
            import database as db_mod
            if db_mod._connection:
                try: db_mod._connection.close()
                except: pass
                db_mod._connection = None
            return {"ok": True, "path": path, "filename": os.path.basename(path)}
        except Exception as e:
            return {"ok": False, "path": path, "error": str(e)}
    return {"ok": False, "path": None, "error": "No save file found in common locations"}


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
    return {"ok": True}
