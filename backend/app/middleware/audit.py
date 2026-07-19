"""Best-effort audit trail middleware.

Only logs to the structured logger — writing to `audit_logs` per request goes
through the AuditService called from sensitive endpoints (login, approvals).
"""
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

from app.core.logging import get_logger

log = get_logger("audit")

SENSITIVE_PREFIXES = ("/api/v1/auth", "/api/v1/scholarships", "/api/v1/admin")


class AuditMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        if any(request.url.path.startswith(p) for p in SENSITIVE_PREFIXES):
            log.info(
                "audit",
                path=request.url.path, method=request.method,
                status=response.status_code, ip=request.client.host if request.client else None,
            )
        return response
