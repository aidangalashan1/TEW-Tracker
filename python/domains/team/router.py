from fastapi import APIRouter
from .service import get_tag_teams

router = APIRouter(prefix="/api/tagteams", tags=["tagteams"])


@router.get("")
def list_tag_teams(fed_uid: int = None):
    if fed_uid is None:
        from services.company_service import get_player_fed_uid
        fed_uid = get_player_fed_uid()
    teams = get_tag_teams(fed_uid)
    return {"fed_uid": fed_uid, "count": len(teams), "teams": [t.model_dump() for t in teams]}
