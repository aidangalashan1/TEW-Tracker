"""Fast JSON responses for endpoints returning large payloads.

FastAPI runs a returned dict through jsonable_encoder — a recursive,
per-value type-dispatch walk that gets expensive fast on big or wide
payloads (measured ~1.2s for a 2000+ worker list). Route handlers that
return plain, already-JSON-safe data (dicts/lists/primitives, built via
.model_dump() or similar) should serialize directly instead.
"""
import json
from fastapi.responses import Response


def fast_json(payload) -> Response:
    """Serialize via stdlib json instead of FastAPI's default jsonable_encoder
    path. default=str covers the odd raw datetime that slips through an
    extra='allow' passthrough field or a raw store row that was never
    converted to a Pydantic model."""
    return Response(content=json.dumps(payload, default=str), media_type="application/json")
