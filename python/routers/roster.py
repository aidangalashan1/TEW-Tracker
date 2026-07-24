from fastapi import APIRouter, Query
from services.roster_service import get_roster, get_all_workers, get_worker_detail, get_worker_form, get_roster_form, get_player_fed_uid, get_cache_progress

router = APIRouter(prefix="/api/roster", tags=["roster"])

@router.get("/cache-progress")
def cache_progress():
    return get_cache_progress()

@router.get("/all")
def all_workers(page: int = Query(default=1), limit: int = Query(default=200)):
    workers, total = get_all_workers(page=page, limit=limit)
    return {"count": len(workers), "total": total, "page": page, "limit": limit, "workers": workers}

@router.get("")
def roster(fed_uid: int = Query(default=None)):
    if fed_uid is None:
        fed_uid = get_player_fed_uid()
    workers = get_roster(fed_uid)
    return {
        "fed_uid": fed_uid,
        "count": len(workers),
        "workers": workers,
    }

@router.get("/form")
def roster_form(fed_uid: int = Query(default=None)):
    if fed_uid is None:
        fed_uid = get_player_fed_uid()
    return get_roster_form(fed_uid)

@router.get("/{worker_uid}")
def worker_detail(worker_uid: int, fed_uid: int = Query(default=None)):
    w = get_worker_detail(worker_uid, fed_uid)
    if w is None:
        return {"error": "Worker not found"}, 404
    return w.model_dump()

@router.get("/{worker_uid}/form")
def worker_form(worker_uid: int):
    return get_worker_form(worker_uid)
