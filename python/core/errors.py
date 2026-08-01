"""Structured error envelope for the API.

Every error response has the shape:

    { "error": { "code": "<machine_code>", "message": "<human message>" } }

so the frontend can branch on `code` instead of parsing free-text. Register the
handlers on the app with `register_error_handlers(app)`.
"""
import traceback

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from starlette.exceptions import HTTPException as StarletteHTTPException


class ApiError(Exception):
    """Raise from a route/service to return a structured error with a stable code."""

    def __init__(self, message: str, *, code: str = "error", status: int = 400):
        super().__init__(message)
        self.message = message
        self.code = code
        self.status = status


class ErrorBody(BaseModel):
    code: str
    message: str


class ErrorResponse(BaseModel):
    error: ErrorBody


def _envelope(status: int, code: str, message: str) -> JSONResponse:
    return JSONResponse(status_code=status, content={"error": {"code": code, "message": message}})


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(ApiError)
    async def _handle_api_error(_req: Request, exc: ApiError):
        return _envelope(exc.status, exc.code, exc.message)

    @app.exception_handler(StarletteHTTPException)
    async def _handle_http_error(_req: Request, exc: StarletteHTTPException):
        detail = exc.detail if isinstance(exc.detail, str) else "Request failed"
        return _envelope(exc.status_code, "http_error", detail)

    @app.exception_handler(RequestValidationError)
    async def _handle_validation(_req: Request, _exc: RequestValidationError):
        return _envelope(422, "validation_error", "Invalid request parameters.")

    @app.exception_handler(Exception)
    async def _handle_unexpected(_req: Request, exc: Exception):
        # Log the full traceback to stdout — Electron captures it into app.log.
        print("[API] Unhandled exception:\n" + "".join(traceback.format_exception(exc)))
        return _envelope(500, "internal_error", "An unexpected server error occurred.")
