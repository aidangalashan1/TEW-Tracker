from fastapi import APIRouter, Query
from services.fed_service import get_fed, get_all_feds, get_belts, get_storylines, get_fed_finances
from services.roster_service import get_player_fed_uid

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

@router.get("/list")
def all_feds():
    return {"feds": [f.model_dump() for f in get_all_feds()]}

@router.get("/{fed_uid}")
def fed_detail(fed_uid: int):
    fed = get_fed(fed_uid)
    if fed is None:
        return {"error": "Federation not found"}, 404
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

@router.get("/{fed_uid}/overview")
def overview(fed_uid: int):
    fed = get_fed(fed_uid)
    if fed is None:
        return {"error": "Federation not found"}, 404
    return {
        "fed": fed.model_dump(),
        "belts": [b.model_dump() for b in get_belts(fed_uid)],
        "storylines": [s.model_dump() for s in get_storylines(fed_uid)],
        "finances": get_fed_finances(fed_uid),
    }
