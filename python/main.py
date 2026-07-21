import os
import sys
import time
import threading
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware

# Ensure the python/ directory is on sys.path whether running as script or bundled exe
_this_dir = os.path.dirname(os.path.abspath(__file__))
if _this_dir not in sys.path:
    sys.path.insert(0, _this_dir)

from routers import game, roster, federation, database as db_router, images as images_router, tagteam as tagteam_router, stable as stable_router, views as views_router, schedule as schedule_router, cards as cards_router, planned_storylines as planned_storylines_router, workspace as workspace_router, profiles as profiles_router, show_history as show_history_router, storylines as storylines_router, finance as finance_router, free_agents as free_agents_router, shortlist as shortlist_router, columns as columns_router, filters as filters_router
from services.fed_service import get_all_feds
from errors import register_error_handlers

_last_request = time.time()
_watchdog_started = False

class WatchdogMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        global _last_request
        _last_request = time.time()
        response = await call_next(request)
        return response

app = FastAPI(title="TEW Tracker API", version="1.0.0")
register_error_handlers(app)

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"^http://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(WatchdogMiddleware)

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
app.include_router(columns_router.router)
app.include_router(filters_router.router)


@app.get("/api/health", include_in_schema=False)
def health():
    return {"status": "ok"}

@app.get("/api/feds", include_in_schema=False)
def all_feds():
    return {"feds": [f.model_dump() for f in get_all_feds()]}

@app.post("/api/system/shutdown", include_in_schema=False)
def shutdown():
    import subprocess
    def _kill():
        for port in (5173, 8567):
            try:
                subprocess.run(
                    ["powershell", "-Command",
                     f"Get-NetTCPConnection -LocalPort {port} -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess | ForEach-Object {{ Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }}"],
                    capture_output=True, timeout=5)
            except Exception:
                pass
        os._exit(0)
    threading.Thread(target=_kill, daemon=True).start()
    return {"ok": True}


if __name__ == "__main__":
    port = int(os.environ.get("TEW_API_PORT", "8567"))

    def watchdog():
        global _watchdog_started
        _watchdog_started = True
        TIMEOUT = 30
        while True:
            time.sleep(10)
            if time.time() - _last_request > TIMEOUT:
                os._exit(0)

    t = threading.Thread(target=watchdog, daemon=True)
    t.start()

    try:
        uvicorn.run(app, host="127.0.0.1", port=port, log_level="info")
    except OSError as e:
        print(f"ERROR: Port {port} is already in use ({e}).")
        print("Make sure only one instance of the backend is running.")
        exit(1)
