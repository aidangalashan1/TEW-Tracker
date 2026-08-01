import pytest

pytest.importorskip("pyodbc")

from core.database import _classify_driver_error


def test_classifies_missing_driver():
    exc = Exception("('IM002', '[IM002] [Microsoft][ODBC Driver Manager] Data source name not found and no default driver specified (0) (SQLDriverConnect)')")
    err = _classify_driver_error(exc)
    assert err is not None
    assert err.mismatch is False


def test_classifies_architecture_mismatch():
    exc = Exception("('IM002', '[IM002] [Microsoft][ODBC Driver Manager] The specified DSN contains an architecture mismatch between the Driver and Application (0) (SQLDriverConnect)')")
    err = _classify_driver_error(exc)
    assert err is not None
    assert err.mismatch is True


def test_ignores_unrelated_errors():
    exc = Exception("('28000', 'Not authorized')")
    assert _classify_driver_error(exc) is None
