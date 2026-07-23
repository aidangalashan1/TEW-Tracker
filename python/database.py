import os
import pyodbc

_MDB_PASSWORD = "20YearsOfTEW"
_current_path = None


def _conn_string(path: str) -> str:
    return f"DRIVER={{Microsoft Access Driver (*.mdb, *.accdb)}};DBQ={path};PWD={_MDB_PASSWORD};ReadOnly=True;Exclusive=0;Pooling=False;"


def test_connection(path: str) -> None:
    """Verify `path` can be opened, then close immediately.

    This module never holds a connection open — TEW itself needs to write to
    this same file, and Access/Jet's file-locking model means any process
    holding the file open continuously (even read-only) is a well-known
    cause of save failures for whichever process actually needs to write.
    All real reads go through datastore.py's own short-lived connections.
    """
    conn = pyodbc.connect(_conn_string(path), autocommit=True)
    conn.close()


def current_path() -> str | None:
    return _current_path


def reconnect(path: str = None):
    global _current_path
    path = path or _current_path
    if path is None:
        raise RuntimeError("No database connected. Call reconnect(path) first.")
    test_connection(path)
    _current_path = path


def close():
    global _current_path
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
