from fastapi import APIRouter, Query
from errors import ApiError
from response_utils import fast_json
from services.worker_service import get_roster, get_all_workers, get_worker_detail, get_worker_form, get_roster_form
from services.company_service import get_player_fed_uid

router = APIRouter(prefix="/api/roster", tags=["roster"])


@router.get("/all")
def all_workers(page: int = Query(default=1), limit: int = Query(default=200)):
    workers, total = get_all_workers(page=page, limit=limit)
    return fast_json({"count": len(workers), "total": total, "page": page, "limit": limit,
                       "workers": workers})

@router.get("")
def roster(fed_uid: int = Query(default=None)):
    if fed_uid is None:
        fed_uid = get_player_fed_uid()
    workers = get_roster(fed_uid)
    return fast_json({
        "fed_uid": fed_uid,
        "count": len(workers),
        "workers": workers,
    })

@router.get("/form")
def roster_form(fed_uid: int = Query(default=None)):
    if fed_uid is None:
        fed_uid = get_player_fed_uid()
    return get_roster_form(fed_uid)

@router.get("/{worker_uid}")
def worker_detail(worker_uid: int, fed_uid: int = Query(default=None)):
    w = get_worker_detail(worker_uid, fed_uid)
    if w is None:
        raise ApiError("Worker not found", code="not_found", status=404)
    return w.model_dump()

@router.get("/{worker_uid}/form")
def worker_form(worker_uid: int):
    return get_worker_form(worker_uid)
