import os
import threading
from datetime import datetime
import pyodbc

_MDB_PASSWORD = "20YearsOfTEW"

_store = None
_lock = threading.Lock()

# Watcher lifecycle lives at module level (one thread per process) so that
# reloads build a brand-new DataStore and atomically swap the `_store`
# reference, instead of mutating the live store in place while requests read it.
_watcher_thread = None
_watcher_stop = threading.Event()
_watched_path: str | None = None
_last_mtime: float | None = None
_version = 0
POLL_INTERVAL = 5


class DataStore:
    """In-memory snapshot of the TEW save, loaded lazily by table group.

    Each group is a raw table plus any lookup indices derived from it. Groups
    load on first access via __getattr__, so a request only pays for the tables
    it touches (a light endpoint no longer drags in the big match-log/morale
    tables). Each group opens its own short-lived connection and closes it
    immediately after that group's query completes (serialised by _load_lock)
    — TEW itself needs to write to this same file, and holding a connection
    open for a store's whole lifetime (as this used to do) is a well-known
    cause of save failures for whichever process actually needs to write.
    """

    # group -> (attributes it populates, loader method name)
    _GROUPS: dict[str, tuple[list[str], str]] = {
        "workers": (["workers"], "_load_workers"),
        "contracts": (["contracts", "contracts_by_fed", "contracts_by_worker"], "_load_contracts"),
        "skills": (["skills"], "_load_skills"),
        "physical": (["physical"], "_load_physical"),
        "overness": (["overness"], "_load_overness"),
        "feds": (["feds"], "_load_feds"),
        "fed_over": (["fed_over"], "_load_fed_over"),
        "teams": (["teams"], "_load_teams"),
        "stables": (["stables"], "_load_stables"),
        "storylines": (
            ["storylines", "fed_storylines", "storyline_involved",
             "storyline_involved_by_sl", "storyline_workers", "storyline_major"],
            "_load_storylines",
        ),
        "match_log": (
            ["match_log", "match_log_by_uid", "match_log_competitors",
             "match_log_competitors_by_ml", "match_log_competitors_by_worker"],
            "_load_match_log",
        ),
        "past_cards": (["past_cards"], "_load_past_cards"),
        "morale": (["morale"], "_load_morale"),
        "belts": (["belts", "champ_set"], "_load_belts"),
        "belt_history": (["belt_history"], "_load_belt_history"),
        "belt_pre_history": (["belt_pre_history"], "_load_belt_pre_history"),
        "attributes": (["attributes"], "_load_attributes"),
        "worker_bio": (["worker_bio"], "_load_worker_bio"),
        "worker_business": (["worker_business"], "_load_worker_business"),
        "belt_prestige": (["belt_prestige"], "_load_belt_prestige"),
        "chemistry": (["chemistry"], "_load_chemistry"),
        "cards": (["cards"], "_load_cards"),
        "tv_shows": (["tv_shows"], "_load_tv_shows"),
        "broadcaster_slots": (["broadcaster_slots"], "_load_broadcaster_slots"),
        "finance": (["finance"], "_load_finance"),
        "finance_history": (["finance_history"], "_load_finance_history"),
        "injury_history": (["injury_history"], "_load_injury_history"),
        "moveset": (["moveset_arsenal", "wrestling_moves"], "_load_moveset"),
        "away": (["away_set"], "_load_away"),
        "injured": (["injured_set"], "_load_injured"),
        "goals": (["goal_set"], "_load_goals"),
        "game_info": (["game_info", "player_info", "game_date_val"], "_load_game_info"),
        "match_types": (["match_types"], "_load_match_types"),
    }

    def __init__(self, mdb_path: str, version: int = 1):
        self.mdb_path = mdb_path
        self.version = version
        self._loaded: set[str] = set()
        self._load_lock = threading.Lock()

    # ── lazy dispatch ──
    def __getattr__(self, name: str):
        # Python only calls this for attributes missing from __dict__ — i.e. a
        # data attribute whose group hasn't been loaded yet.
        group = DataStore._ATTR_GROUP.get(name)
        if group is None:
            raise AttributeError(name)
        self._ensure(group)
        try:
            return self.__dict__[name]
        except KeyError:
            raise AttributeError(name)

    def _ensure(self, group: str) -> None:
        if group in self._loaded:
            return
        with self._load_lock:
            if group in self._loaded:
                return
            conn = self._temp_conn()
            try:
                cur = conn.cursor()
                try:
                    getattr(self, self._GROUPS[group][1])(cur)
                finally:
                    cur.close()
            finally:
                conn.close()
            self._loaded.add(group)

    def _fetch_all(self, cursor, sql: str, params: tuple = None) -> list[dict]:
        cursor.execute(sql, params or ())
        cols = [col[0] for col in cursor.description]
        return [dict(zip(cols, row)) for row in cursor.fetchall()]

    def _temp_conn(self):
        return pyodbc.connect(
            f"DRIVER={{Microsoft Access Driver (*.mdb, *.accdb)}};DBQ={self.mdb_path};PWD={_MDB_PASSWORD};ReadOnly=True;Exclusive=0;Pooling=False;",
            autocommit=True,
        )

    # ── group loaders (each populates its group's attributes; query logic
    #    is unchanged from the previous monolithic load) ──
    def _load_workers(self, cur):
        self.workers = {r["UID"]: r for r in self._fetch_all(cur, "SELECT * FROM tblWorker")}

    def _load_worker_bio(self, cur):
        try:
            rows = self._fetch_all(cur, "SELECT * FROM tblWorkerBio")
            self.worker_bio = {}
            for r in rows:
                uid = r.get("UID")
                if uid is None:
                    continue
                text = r.get("Profile") or r.get("Bio") or r.get("Biography") or ""
                if text:
                    self.worker_bio[uid] = text
        except Exception:
            self.worker_bio = {}

    def _load_contracts(self, cur):
        self.contracts = []
        self.contracts_by_fed = {}
        self.contracts_by_worker = {}
        for r in self._fetch_all(cur, "SELECT * FROM tblContract"):
            self.contracts.append(r)
            self.contracts_by_fed.setdefault(r["FedUID"], []).append(r)
            self.contracts_by_worker.setdefault(r["WorkerUID"], []).append(r)

    def _load_skills(self, cur):
        self.skills = {r["WorkerUID"]: r for r in self._fetch_all(cur, "SELECT * FROM tblWorkerSkill")}

    def _load_physical(self, cur):
        self.physical = {r["WorkerUID"]: r for r in self._fetch_all(cur, "SELECT * FROM tblWorkerPhysical")}

    def _load_overness(self, cur):
        self.overness = {r["WorkerUID"]: r for r in self._fetch_all(cur, "SELECT * FROM tblWorkerOver")}

    def _load_feds(self, cur):
        self.feds = {r["UID"]: r for r in self._fetch_all(cur, "SELECT * FROM tblFed")}

    def _load_fed_over(self, cur):
        self.fed_over = {r["FedUID"]: r for r in self._fetch_all(cur, "SELECT * FROM tblFedOver")}

    def _load_teams(self, cur):
        self.teams = self._fetch_all(cur, "SELECT * FROM tblTeam")

    def _load_stables(self, cur):
        self.stables = self._fetch_all(cur, "SELECT * FROM tblStable")

    def _load_storylines(self, cur):
        self.storylines = []
        self.fed_storylines = {}
        self.storyline_involved = []
        self.storyline_involved_by_sl = {}
        self.storyline_workers = {}
        self.storyline_major = {}
        for r in self._fetch_all(cur, "SELECT * FROM tblStoryline"):
            self.storylines.append(r)
            self.fed_storylines.setdefault(r["FedUID"], []).append(r)
        for r in self._fetch_all(cur, "SELECT * FROM tblStorylineInvolved"):
            self.storyline_involved.append(r)
            self.storyline_involved_by_sl.setdefault(r["StorylineUID"], []).append(r)
            self.storyline_workers.setdefault(r["WorkerUID"], []).append(r["StorylineUID"])
            if r.get("MajorRole"):
                self.storyline_major.setdefault(r["StorylineUID"], set()).add(r["WorkerUID"])

    def _load_match_log(self, cur):
        self.match_log = []
        self.match_log_by_uid = {}
        self.match_log_competitors = []
        self.match_log_competitors_by_ml = {}
        self.match_log_competitors_by_worker = {}
        for r in self._fetch_all(cur, "SELECT * FROM tblMatchLog"):
            self.match_log.append(r)
            self.match_log_by_uid[r["UID"]] = r
        for r in self._fetch_all(cur, "SELECT * FROM tblMatchLogCompetitor"):
            self.match_log_competitors.append(r)
            self.match_log_competitors_by_ml.setdefault(r["MatchLogUID"], []).append(r)
            self.match_log_competitors_by_worker.setdefault(r["Worker"], []).append(r)

    def _load_past_cards(self, cur):
        self.past_cards = {r["UID"]: r for r in self._fetch_all(cur, "SELECT * FROM tblPastCard")}

    def _load_morale(self, cur):
        self.morale = self._fetch_all(cur, "SELECT * FROM tblMorale")

    def _load_belts(self, cur):
        self.belts = {}
        self.champ_set = set()
        for r in self._fetch_all(cur, "SELECT * FROM tblBelt"):
            self.belts[r["UID"]] = r
            if r.get("Holder1") and r["Holder1"] > 0:
                self.champ_set.add(r["Holder1"])
            if r.get("Holder2") and r["Holder2"] > 0:
                self.champ_set.add(r["Holder2"])

    def _load_belt_history(self, cur):
        self.belt_history = self._fetch_all(cur, "SELECT * FROM tblBeltHistory")

    def _load_belt_pre_history(self, cur):
        self.belt_pre_history = self._fetch_all(cur, "SELECT * FROM tblBeltPreHistory")

    def _load_attributes(self, cur):
        self.attributes = self._fetch_all(cur, "SELECT * FROM tblAttribute")

    def _load_worker_business(self, cur):
        self.worker_business = {r["WorkerUID"]: r for r in self._fetch_all(cur, "SELECT * FROM tblWorkerBusiness")}

    def _load_belt_prestige(self, cur):
        try:
            rows = self._fetch_all(cur, "SELECT * FROM tblBeltPrestige")
            self.belt_prestige = {}
            for r in rows:
                key = r.get("BeltUID") or r.get("UID")
                if key is not None:
                    self.belt_prestige[key] = r
        except Exception:
            self.belt_prestige = {}

    def _load_chemistry(self, cur):
        self.chemistry = self._fetch_all(cur, "SELECT * FROM tblChemistry")

    def _load_cards(self, cur):
        self.cards = {r["UID"]: r for r in self._fetch_all(cur, "SELECT * FROM tblCard")}

    def _load_tv_shows(self, cur):
        self.tv_shows = {r["UID"]: r for r in self._fetch_all(cur, "SELECT * FROM tblTV")}

    def _load_broadcaster_slots(self, cur):
        self.broadcaster_slots = self._fetch_all(cur, "SELECT * FROM tblBroadcasterSlot")

    def _load_finance(self, cur):
        self.finance = self._fetch_all(cur, "SELECT * FROM tblFinance")

    def _load_finance_history(self, cur):
        self.finance_history = self._fetch_all(cur, "SELECT * FROM tblFinanceHistory")

    def _load_injury_history(self, cur):
        self.injury_history = self._fetch_all(cur, "SELECT * FROM tblInjuryHistory")

    def _load_moveset(self, cur):
        self.moveset_arsenal = self._fetch_all(cur, "SELECT * FROM tblMoveSetArsenal")
        self.wrestling_moves = {r["UID"]: r for r in self._fetch_all(cur, "SELECT * FROM tblWrestlingMove")}

    def _load_away(self, cur):
        self.away_set = {r["Worker"] for r in self._fetch_all(cur, "SELECT * FROM tblAway")}

    def _load_injured(self, cur):
        self.injured_set = {r["Worker"] for r in self._fetch_all(cur, "SELECT * FROM tblOutInj")}

    def _load_goals(self, cur):
        self.goal_set = {
            r["Worker"]
            for r in self._fetch_all(cur, "SELECT * FROM tblGoal WHERE Worker IS NOT NULL AND Worker > 0")
        }

    def _load_game_info(self, cur):
        gi = self._fetch_all(cur, "SELECT * FROM tblGameInfo")
        self.game_info = gi[0] if gi else {}
        pi = self._fetch_all(cur, "SELECT * FROM tblPlayerInfo")
        self.player_info = pi[0] if pi else {}
        self.game_date_val = None
        raw_date = self.game_info.get("CurrentGameDate") if self.game_info else None
        if raw_date:
            if isinstance(raw_date, datetime):
                self.game_date_val = raw_date
            elif isinstance(raw_date, str):
                try:
                    self.game_date_val = datetime.strptime(raw_date.split()[0], "%Y-%m-%d")
                except Exception:
                    pass

    def _load_match_types(self, cur):
        self.match_types = {r["UID"]: r["Name"] for r in self._fetch_all(cur, "SELECT UID, Name FROM tblMatch")}


# attribute name -> owning group (built once from _GROUPS)
DataStore._ATTR_GROUP = {
    attr: group for group, (attrs, _loader) in DataStore._GROUPS.items() for attr in attrs
}


def get_store() -> DataStore | None:
    return _store


def _reload_snapshot(path: str) -> None:
    """Build a fresh DataStore and swap it in atomically.

    Construction is cheap (tables load lazily on first access), and reference
    assignment is atomic under the GIL, so in-flight requests keep reading the
    previous snapshot until this one is published. The new store then loads its
    groups on demand from the updated file.
    """
    global _store, _version, _last_mtime
    new_version = _version + 1
    new_store = DataStore(path, version=new_version)
    with _lock:
        # Guard against a disconnect (reset_store) that landed mid-load.
        if _watched_path != path:
            return
        _store = new_store
        _version = new_version
    _last_mtime = os.path.getmtime(path)


SETTLE_RETRIES = 3
SETTLE_DELAY = 1.0


def _settled_mtime(path: str, first_seen: float) -> float | None:
    """TEW's save can touch several tables in sequence, so mtime can tick
    partway through a write. Wait for it to stop moving before reloading —
    reconnecting mid-save would open a fresh connection at the exact moment
    TEW needs the file free, and risks reading a half-written snapshot."""
    last = first_seen
    for _ in range(SETTLE_RETRIES):
        if _watcher_stop.wait(SETTLE_DELAY):
            return None
        try:
            mtime = os.path.getmtime(path)
        except OSError:
            return None
        if mtime == last:
            return mtime
        last = mtime
    return last


def _watch_loop() -> None:
    tick = 0
    while not _watcher_stop.wait(POLL_INTERVAL):
        path = _watched_path
        if not path:
            continue
        try:
            mtime = os.path.getmtime(path)
        except OSError:
            continue
        tick += 1
        if tick % 6 == 0:
            print(f"[DataStore] Watcher alive, mtime={mtime}")
        if mtime == _last_mtime:
            continue
        if not os.path.isfile(path):
            continue
        settled = _settled_mtime(path, mtime)
        if settled is None or _watched_path != path:
            continue
        print("[DataStore] File change detected, reloading...")
        try:
            _reload_snapshot(path)
            print("[DataStore] Reload complete")
        except Exception as e:
            print(f"[DataStore] Auto-reload failed: {e}")


def _ensure_watcher() -> None:
    global _watcher_thread
    if _watcher_thread is not None and _watcher_thread.is_alive():
        return
    _watcher_stop.clear()
    _watcher_thread = threading.Thread(target=_watch_loop, daemon=True, name="datastore-watcher")
    _watcher_thread.start()
    print(f"[DataStore] Watcher started, polling every {POLL_INTERVAL}s")


def init_store(mdb_path: str) -> DataStore:
    global _store, _version, _watched_path, _last_mtime
    with _lock:
        _version += 1
        _store = DataStore(mdb_path, version=_version)
        _watched_path = mdb_path
        try:
            _last_mtime = os.path.getmtime(mdb_path)
        except OSError:
            _last_mtime = None
    _ensure_watcher()
    return _store


def reset_store():
    global _store, _watched_path, _last_mtime, _watcher_thread
    _watcher_stop.set()  # signal the poll thread to stop
    if _watcher_thread is not None:
        # Wait for it to actually exit before returning — otherwise a
        # reconnect's _ensure_watcher() can see the old (still-alive) thread
        # and skip starting a new one, silently killing live-reload for the
        # new connection. wait() inside _watch_loop returns immediately once
        # the stop event is set, so this join is near-instant in practice.
        _watcher_thread.join(timeout=POLL_INTERVAL + 1)
        _watcher_thread = None
    with _lock:
        _store = None
        _watched_path = None
        _last_mtime = None
