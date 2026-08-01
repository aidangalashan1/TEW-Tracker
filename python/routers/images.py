import os
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel
from core.images import set_image_root, get_image_root, resolve_image, get_mime_type

router = APIRouter(prefix="/api/images", tags=["images"])


@router.get("/status")
def status():
    path = get_image_root()
    return {
        "configured": path is not None and os.path.isdir(path),
        "path": path or "",
    }


class SetPathRequest(BaseModel):
    path: str


@router.post("/path")
def set_path(req: SetPathRequest):
    if req.path and not os.path.isdir(req.path):
        raise HTTPException(400, f"Directory not found: {req.path}")
    set_image_root(req.path if req.path else None)
    return {"ok": True, "path": get_image_root() or ""}


@router.get("/auto")
def auto(mdb_path: str = ""):
    from core.images import auto_detect_image_root
    path = auto_detect_image_root(mdb_path) if mdb_path else None
    if not path:
        return {"ok": False, "path": None, "error": "Could not auto-detect images folder"}
    set_image_root(path)
    return {"ok": True, "path": path}


@router.post("/browse")
def browse():
    from core.images import browse_folder
    try:
        path = browse_folder()
        if path:
            return {"path": path, "cancelled": False}
        return {"path": None, "cancelled": True}
    except Exception as e:
        raise HTTPException(500, f"Failed to open folder dialog: {e}")


@router.get("/{path:path}")
def serve_image(path: str):
    if not path:
        raise HTTPException(400, "No image path provided")
    resolved = resolve_image(path)
    if not resolved:
        raise HTTPException(404, "Image not found")
    mime = get_mime_type(resolved)
    return FileResponse(resolved, media_type=mime)