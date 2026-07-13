import os
import pyodbc

_MDB_PASSWORD = "20YearsOfTEW"
_MDB_FILENAME = "TEW9Save.mdb"
_connection = None
_current_path = None


def _find_mdb() -> str:
    env_path = os.environ.get("TEW_DB_PATH")
    if env_path:
        path = env_path if os.path.isabs(env_path) else os.path.join(os.getcwd(), env_path)
        if os.path.isfile(path):
            return os.path.abspath(path)

    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.abspath(os.path.join(script_dir, ".."))
    for candidate in [
        os.path.join(project_root, _MDB_FILENAME),
        os.path.join(os.getcwd(), _MDB_FILENAME),
        os.path.join(script_dir, _MDB_FILENAME),
    ]:
        if os.path.isfile(candidate):
            return candidate

    raise FileNotFoundError(
        f"Cannot find {_MDB_FILENAME}. "
        f"Searched: project root ({project_root}), CWD ({os.getcwd()}), script dir ({script_dir}). "
        "Set TEW_DB_PATH env var to the full path if the file is elsewhere."
    )


def get_connection(force_path: str = None):
    global _connection, _current_path
    path = force_path or _current_path
    if path is None:
        raise RuntimeError("No database connected. Call reconnect(path) or auto_detect() first.")
    if _connection is None or path != _current_path:
        if _connection:
            try:
                _connection.close()
            except Exception:
                pass
            _connection = None
        _connection = pyodbc.connect(
            f"DRIVER={{Microsoft Access Driver (*.mdb, *.accdb)}};DBQ={path};PWD={_MDB_PASSWORD};ReadOnly=True;Exclusive=0;",
            autocommit=True,
        )
        _current_path = path
    return _connection


def auto_detect() -> str | None:
    global _current_path
    try:
        _current_path = _find_mdb()
        return _current_path
    except FileNotFoundError:
        return None


def current_path() -> str | None:
    return _current_path


def reconnect(path: str = None):
    global _current_path
    if path:
        _current_path = path
    return get_connection(path)


def close():
    global _connection, _current_path
    if _connection:
        try:
            _connection.close()
        except Exception:
            pass
        _connection = None
        _current_path = None


def browse_file():
    import tkinter as tk
    from tkinter import filedialog
    root = tk.Tk()
    root.withdraw()
    root.wm_attributes('-topmost', 1)
    initial_dir = os.path.dirname(_current_path) if _current_path else ""
    try:
        path = filedialog.askopenfilename(
            title='Select TEW9Save.mdb',
            initialdir=initial_dir or ".",
            filetypes=[('Access Database', '*.mdb *.accdb'), ('All files', '*.*')]
        )
        return path if path else None
    finally:
        root.destroy()
