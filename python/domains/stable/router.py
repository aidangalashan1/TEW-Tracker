from fastapi import APIRouter
from .service import get_stables

router = APIRouter(prefix="/api/stables", tags=["stables"])


@router.get("")
def list_stables(fed_uid: int = None):
    if fed_uid is None:
        from services.company_service import get_player_fed_uid
        fed_uid = get_player_fed_uid()
    stables = get_stables(fed_uid)
    return {"fed_uid": fed_uid, "count": len(stables), "stables": [s.model_dump() for s in stables]}
