# NSRC Backend — Phase 3

Production-ready FastAPI backend for the **National Sports Report Card**
platform. Consumes on-device AI reports produced by the Phase 2 mobile
pipeline; orchestrates authentication, student registration, assessments,
scholarships, trials, notifications, analytics, and offline sync — for a
nationwide SAI-facing deployment.

## Stack

- **FastAPI** (async) · **SQLAlchemy 2.0** (async) · **PostgreSQL 16**
- **Alembic** migrations · **Redis** cache · **Celery + Beat** task queue
- **JWT** access + refresh with rotation, **Argon2** password hashing
- **RBAC** (Coach / District / State / SAI / Parent / Admin)
- **Pydantic v2** validation · **structlog** JSON logs · **slowapi** rate limiting
- **Storage**: pluggable Local / S3-compatible
- **Docker Compose** (API + Postgres + Redis + Celery worker + Beat + Adminer)

## Architecture

```
Clean Architecture / Repository / Service / Dependency Injection

app/
  api/v1/         REST endpoints (auth, students, assessments, videos,
                  ai_reports, sync, scholarships, trials, notifications,
                  analytics, users, schools, settings, admin)
  auth/           OTP service (SMS-ready provider abstraction)
  core/           config, logging, JWT + password hashing, RBAC
  database/       async engine + session
  models/         SQLAlchemy ORM (normalized schema)
  schemas/        Pydantic v2 request/response DTOs
  repositories/   generic + concrete repository pattern
  services/       Auth / Student / Assessment / Sync / Scholarship / Trial
  ai/             AI report envelope contract (no server inference)
  sync/           conflict resolution
  notifications/  push/sms/email/in-app dispatcher
  analytics/      aggregation queries
  middleware/     request-id, rate-limit, audit
  utils/          storage backend, celery app
  main.py         FastAPI entry
alembic/          migrations
tests/            pytest + httpx + aiosqlite
docker/           (deployment artifacts)
scripts/dev.sh    one-shot dev startup
```

## Quick start

```bash
cd backend
cp .env.example .env
docker compose up --build
```

Then:
- **API**: http://localhost:8000
- **Swagger**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **Adminer**: http://localhost:8080 (system: PostgreSQL, host: postgres, user/pass/db: nsrc)

### Local (no Docker)

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload
```

## Tests

```bash
pytest             # unit + api + auth + sync + repository + service
pytest --cov=app   # coverage report
```

## Migrations

```bash
alembic revision --autogenerate -m "describe change"
alembic upgrade head
```

## Auth

- `POST /api/v1/auth/register` — password signup with role
- `POST /api/v1/auth/login` — returns access + refresh tokens
- `POST /api/v1/auth/refresh` — rotates refresh token (old one revoked)
- `POST /api/v1/auth/logout` — revokes refresh token
- `POST /api/v1/auth/otp/request` + `POST /api/v1/auth/otp/verify` — OTP flow (console provider, SMS-ready)
- `GET /api/v1/auth/me` — current user

## RBAC

Role → permission map in `app/core/rbac.py`. Endpoints declare requirements via
`Depends(require_permission(Permission.X))` or `Depends(require_role(Role.X))`.

## Offline sync

`POST /api/v1/sync/upload` accepts a batch of mutations (students /
assessments / videos / AI reports) with `client_uuid` deduplication and
last-write-wins conflict resolution based on `version` + `client_ts`.
Complementary endpoints: `/sync/status`, `/sync/retry`, `/sync/benchmarks`,
`/sync/notifications`.

## AI integration

The backend does **not** run inference. Devices upload the AI report envelope
(pose engine id, scores, quality, anti-cheat) via `POST /api/v1/ai-reports`.
Each upload is validated, versioned (`ai_reports.version`), stored with a
`verification` state, and rolls up into `assessment_results` +
`performance_metrics` for rankings and analytics.

## Scholarship workflow

Submitted → Verified → District approved → State approved → Trial scheduled →
Trial completed → Selected → Rejected → Granted. Each transition is signed by
the reviewing user and appended to the application's `history` JSON.

## Security

- Argon2 password hashing (bcrypt fallback)
- JWT access + rotating refresh tokens with revocation table
- CORS allowlist via `CORS_ORIGINS`
- Rate limiting (`slowapi`, Redis-backed)
- Pydantic v2 validation everywhere; SQLAlchemy parameter binding = no injection
- Structured audit + request logs; sensitive routes flagged
- Secrets loaded from env only; never committed

## Mobile integration (Phase 1 + 2)

- Register / Login → store `access_token` + `refresh_token`
- Register student → offline queue → `POST /sync/upload`
- Record assessment → device produces Phase 2 AI report → upload video
  metadata + report envelope via `/api/v1/ai-reports`
- Fetch scout profile, rankings, scholarship status, notifications
- Periodic `GET /sync/benchmarks` to refresh the national benchmark table
