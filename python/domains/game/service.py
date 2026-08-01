"""Global save-state (current date/turn/stage, the player's own worker/fed
identity) — distinct from the Company domain, which is about one federation's
own data. Game state doesn't belong to any one federation even though it
carries player_fed_uid."""
from core.datastore import get_store
from models import GameInfo
from domains.company.relative import get_player_fed_uid


def get_game_info() -> GameInfo:
    store = get_store()
    if not store:
        return GameInfo()

    gi = GameInfo(
        current_date=str(store.game_info.get("CurrentGameDate")) if store.game_info else None,
        start_date=str(store.game_info.get("StartDate")) if store.game_info else None,
        turn=store.game_info.get("Turn", 0) if store.game_info else 0,
        stage=store.game_info.get("Stage", 0) if store.game_info else 0,
    )
    if store.player_info:
        gi.player_worker_uid = store.player_info.get("Player", 0)
    gi.player_fed_uid = get_player_fed_uid()
    return gi
