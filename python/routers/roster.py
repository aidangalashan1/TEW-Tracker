from fastapi import APIRouter, Query
from services.roster_service import get_roster, get_worker_detail, get_worker_form, get_roster_form, get_player_fed_uid

router = APIRouter(prefix="/api/roster", tags=["roster"])

@router.get("")
def roster(fed_uid: int = Query(default=None)):
    if fed_uid is None:
        fed_uid = get_player_fed_uid()
    workers = get_roster(fed_uid)
    return {
        "fed_uid": fed_uid,
        "count": len(workers),
        "workers": [w.model_dump() for w in workers],
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
