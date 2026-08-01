from fastapi import APIRouter, Query
from core.errors import ApiError
from services.fed_service import get_fed, get_storylines, get_fed_finances
from domains.belt.service import get_belts, get_belt_history
from services.company_service import get_player_fed_uid

router = APIRouter(prefix="/api/fed", tags=["federation"])

@router.get("/player")
def player_fed():
    # No fed has User_Controlled set — a valid, common state (a "watcher"
    # save with no player company), not an error. Return null so the
    # frontend can treat it as Federation | null instead of a malformed
    # error-shaped object masquerading as a Federation.
    uid = get_player_fed_uid()
    fed = get_fed(uid)
    return fed.model_dump() if fed else None

@router.get("/{fed_uid}")
def fed_detail(fed_uid: int):
    fed = get_fed(fed_uid)
    if fed is None:
        raise ApiError("Federation not found", code="not_found", status=404)
    return fed.model_dump()

@router.get("/{fed_uid}/belts")
def belts(fed_uid: int):
    return {"belts": [b.model_dump() for b in get_belts(fed_uid)]}

@router.get("/{fed_uid}/storylines")
def storylines(fed_uid: int):
    return {"storylines": [s.model_dump() for s in get_storylines(fed_uid)]}

@router.get("/{fed_uid}/finances")
def finances(fed_uid: int):
    return get_fed_finances(fed_uid)

@router.get("/{fed_uid}/belt-history")
def belt_history_route(fed_uid: int, limit: int = 5):
    return {"history": get_belt_history(fed_uid, limit)}

@router.get("/{fed_uid}/overview")
def overview(fed_uid: int):
    from core.datastore import get_store
    store = get_store()
    if store:
        store.preload_groups("feds", "contracts", "belts", "storylines", "finance")
    fed = get_fed(fed_uid)
    if fed is None:
        raise ApiError("Federation not found", code="not_found", status=404)
    return {
        "fed": fed.model_dump(),
        "belts": [b.model_dump() for b in get_belts(fed_uid)],
        "storylines": [s.model_dump() for s in get_storylines(fed_uid)],
        "finances": get_fed_finances(fed_uid),
    }
