"""Middleware pieces."""
from __future__ import annotations

import time
import uuid

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

from app.core.logging import get_logger

log = get_logger("http")


class RequestIDMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        rid = request.headers.get("X-Request-ID") or uuid.uuid4().hex
        request.state.request_id = rid
        start = time.perf_counter()
        response = await call_next(request)
        dur_ms = (time.perf_counter() - start) * 1000
        response.headers["X-Request-ID"] = rid
        log.info(
            "request",
            request_id=rid, method=request.method, path=request.url.path,
            status=response.status_code, duration_ms=round(dur_ms, 2),
        )
        return response
