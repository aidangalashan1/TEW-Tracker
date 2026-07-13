import os
import sys
import signal
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Ensure the python/ directory is on sys.path whether running as script or bundled exe
_this_dir = os.path.dirname(os.path.abspath(__file__))
if _this_dir not in sys.path:
    sys.path.insert(0, _this_dir)

from routers import game, roster, federation, database as db_router, images as images_router, tagteam as tagteam_router, stable as stable_router, views as views_router, schedule as schedule_router, cards as cards_router, planned_storylines as planned_storylines_router, workspace as workspace_router, profiles as profiles_router, show_history as show_history_router, storylines as storylines_router, finance as finance_router, free_agents as free_agents_router, shortlist as shortlist_router
from services.fed_service import get_all_feds
from errors import register_error_handlers

app = FastAPI(title="TEW Tracker API", version="1.0.0")
register_error_handlers(app)

# Only accept browser requests from a local origin (the Vite dev server on any
# port, or 127.0.0.1). The packaged Electron app loads over file:// with
# webSecurity disabled, so it doesn't rely on these headers — this restriction
# just stops arbitrary websites the user visits from reading their save data
# off the local API.
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"^http://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(game.router)
app.include_router(roster.router)
app.include_router(federation.router)
app.include_router(db_router.router)
app.include_router(images_router.router)
app.include_router(tagteam_router.router)
app.include_router(stable_router.router)
app.include_router(views_router.router)
app.include_router(schedule_router.router)
app.include_router(cards_router.router)
app.include_router(planned_storylines_router.router)
app.include_router(workspace_router.router)
app.include_router(profiles_router.router)
app.include_router(show_history_router.router)
app.include_router(storylines_router.router)
app.include_router(finance_router.router)
app.include_router(free_agents_router.router)
app.include_router(shortlist_router.router)


@app.get("/api/health", include_in_schema=False)
def health():
    return {"status": "ok"}

@app.get("/api/feds", include_in_schema=False)
def all_feds():
    return {"feds": [f.model_dump() for f in get_all_feds()]}

@app.post("/api/system/shutdown", include_in_schema=False)
def shutdown():
    os.kill(os.getpid(), signal.SIGTERM)
    return {"ok": True}


if __name__ == "__main__":
    port = int(os.environ.get("TEW_API_PORT", "8567"))
    try:
        uvicorn.run(app, host="127.0.0.1", port=port, log_level="info")
    except OSError as e:
        print(f"ERROR: Port {port} is already in use ({e}).")
        print("Make sure only one instance of the backend is running.")
        exit(1)
