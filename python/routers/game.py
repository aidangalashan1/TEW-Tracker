import os
from fastapi import APIRouter
from services.game_service import get_game_info
from core.datastore import init_store, get_store
from core.database import reconnect, current_path

router = APIRouter(prefix="/api/game", tags=["game"])


@router.get("/info")
def game_info():
    return get_game_info().model_dump()


@router.get("/version")
def game_version():
    store = get_store()
    return {"version": store.version if store else 0}


@router.post("/refresh")
def refresh():
    """Force-reload the datastore from the current MDB file."""
    path = current_path()
    if path and os.path.isfile(path):
        reconnect(path)
        init_store(path)
    return {"ok": True}
