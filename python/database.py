import os
import pyodbc

_MDB_PASSWORD = "20YearsOfTEW"
_connection = None
_current_path = None


def get_connection(force_path: str = None):
    global _connection, _current_path
    path = force_path or _current_path
    if path is None:
        raise RuntimeError("No database connected. Call reconnect(path) first.")
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
