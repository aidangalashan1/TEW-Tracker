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

from routers import database as db_router, images as images_router, views as views_router, workspace as workspace_router, profiles as profiles_router, shortlist as shortlist_router, columns as columns_router, filters as filters_router
from domains.worker.router import router as worker_router
from domains.worker.free_agents_router import router as worker_free_agents_router
from domains.belt.router import router as belt_router
from domains.team.router import router as team_router
from domains.stable.router import router as stable_router
from domains.show.router import router as show_router
from domains.show.cards_router import router as cards_router
from domains.show.history_router import router as show_history_router
from domains.storyline.router import router as storyline_router
from domains.storyline.planned_router import router as planned_storyline_router
from domains.company.router import router as company_router
from domains.company.finance_router import router as finance_router
from domains.company.service import get_all_feds
from domains.game.router import router as game_router
from core.errors import register_error_handlers

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
    # localhost/127.0.0.1 covers the Vite dev server; app://bundle is the custom
    # scheme the packaged Electron renderer is served from (see electron/main.js),
    # which lets the desktop build keep webSecurity enabled.
    allow_origin_regex=r"^(app://bundle|http://(localhost|127\.0\.0\.1)(:\d+)?)$",
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(WatchdogMiddleware)

app.include_router(game_router)
app.include_router(worker_router)
app.include_router(company_router)
app.include_router(db_router.router)
app.include_router(images_router.router)
app.include_router(team_router)
app.include_router(stable_router)
app.include_router(views_router.router)
app.include_router(show_router)
app.include_router(cards_router)
app.include_router(planned_storyline_router)
app.include_router(workspace_router.router)
app.include_router(profiles_router.router)
app.include_router(show_history_router)
app.include_router(storyline_router)
app.include_router(finance_router)
app.include_router(worker_free_agents_router)
app.include_router(shortlist_router.router)
app.include_router(columns_router.router)
app.include_router(filters_router.router)
app.include_router(belt_router)


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


# For development, the backend is launched via `uvicorn main:app --reload`
# directly from the npm script. The __main__ block below only runs when
# the script is executed directly (bundled exe / "py python/main.py").
if __name__ == "__main__":
    port = int(os.environ.get("TEW_API_PORT", "8567"))

    def watchdog():
        global _watchdog_started
        _watchdog_started = True
        TIMEOUT = 600
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
