import os
from fastapi import APIRouter
from services.game_service import get_game_info
from datastore import init_store, get_store
from database import get_connection

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
    from database import current_path
    path = current_path()
    if path and os.path.isfile(path):
        conn = get_connection(force_path=path)
        init_store(path)
        import database as db_mod
        if db_mod._connection:
            try: db_mod._connection.close()
            except: pass
            db_mod._connection = None
    return {"ok": True}
