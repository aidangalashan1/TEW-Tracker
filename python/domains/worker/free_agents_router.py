from fastapi import APIRouter, Query
from typing import Optional
from core.response_utils import fast_json
from .free_agents import get_free_agents

router = APIRouter(prefix="/api/free-agents", tags=["free-agents"])


@router.get("")
def free_agents(fed_uid: Optional[int] = Query(None)):
    workers = get_free_agents(fed_uid)
    return fast_json({"count": len(workers), "workers": [w.model_dump() for w in workers]})
