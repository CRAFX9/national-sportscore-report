"""NSRC Backend — FastAPI entry point."""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.api.v1 import api_router
from app.core.config import settings
from app.core.logging import configure_logging, get_logger
from app.middleware.request_id import RequestIDMiddleware
from app.middleware.rate_limit import limiter
from app.middleware.audit import AuditMiddleware

configure_logging()
log = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    log.info("startup", env=settings.ENV, debug=settings.DEBUG)
    yield
    log.info("shutdown")


app = FastAPI(
    title="National Sports Report Card API",
    description=(
        "Backend for NSRC — a nationwide, offline-first sports talent "
        "discovery platform for the Sports Authority of India (SAI)."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(RequestIDMiddleware)
app.add_middleware(AuditMiddleware)

app.include_router(api_router, prefix="/api/v1")


@app.get("/health", tags=["system"])
async def health():
    return {"status": "ok", "service": "nsrc-backend", "version": "1.0.0"}


@app.get("/", tags=["system"])
async def root():
    return {"name": "NSRC API", "docs": "/docs", "redoc": "/redoc"}
