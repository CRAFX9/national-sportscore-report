"""Service layer — business logic behind the API endpoints."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from uuid import UUID, uuid4

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import (
    create_access_token, create_refresh_token, decode_token,
    hash_password, verify_password,
)
from app.core.config import settings
from app.models import (
    AIReport, Assessment, AssessmentStatus, DeviceRegistration, RefreshToken,
    ScholarshipApplication, ScholarshipStage, Student, SyncQueueItem, Trial, User, UserRole,
)
from app.repositories import (
    AIReportRepository, AssessmentRepository, AssessmentResultRepository,
    AssessmentVideoRepository, NotificationRepository, PerformanceMetricRepository,
    RefreshTokenRepository, ScholarshipRepository, StudentRepository,
    SyncQueueRepository, TrialRepository, UserRepository,
)
from app.schemas import (
    AIReportIn, AssessmentCreate, LoginRequest, RegisterRequest, ScholarshipTransition,
    StudentCreate, SyncBatchIn, SyncBatchResult, SyncItemResult, TokenPair, TrialCreate,
    TrialResult, VideoMetadataIn,
)


# ─── Auth ────────────────────────────────────────────────────────────────────
class AuthService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.users = UserRepository(db)
        self.tokens = RefreshTokenRepository(db)

    async def register(self, data: RegisterRequest) -> User:
        if data.email and await self.users.by_identifier(data.email):
            raise HTTPException(status.HTTP_409_CONFLICT, "email already registered")
        if data.phone and await self.users.by_identifier(data.phone):
            raise HTTPException(status.HTTP_409_CONFLICT, "phone already registered")
        return await self.users.create(
            full_name=data.full_name, email=data.email, phone=data.phone,
            role=UserRole(data.role), password_hash=hash_password(data.password),
        )

    async def login(self, data: LoginRequest) -> tuple[User, TokenPair]:
        user = await self.users.by_identifier(data.identifier)
        if not user or not user.password_hash or not verify_password(data.password, user.password_hash):
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, "invalid credentials")
        if not user.is_active:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "user disabled")
        user.last_login_at = datetime.now(timezone.utc)
        tokens = await self._issue_tokens(user, data.device_id)
        return user, tokens

    async def refresh(self, refresh_token: str) -> TokenPair:
        try:
            payload = decode_token(refresh_token)
        except ValueError:
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, "invalid refresh token")
        if payload.get("type") != "refresh":
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, "wrong token type")
        stored = await self.tokens.by_jti(payload["jti"])
        if not stored or stored.revoked:
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, "revoked or unknown refresh token")
        user = await self.users.get(payload["sub"])
        if not user:
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, "user missing")
        stored.revoked = True  # rotate
        return await self._issue_tokens(user, stored.device_id)

    async def logout(self, refresh_token: str) -> None:
        try:
            payload = decode_token(refresh_token)
        except ValueError:
            return
        stored = await self.tokens.by_jti(payload.get("jti", ""))
        if stored:
            stored.revoked = True

    async def _issue_tokens(self, user: User, device_id: str | None) -> TokenPair:
        role_val = user.role.value if hasattr(user.role, "value") else str(user.role)
        access = create_access_token(str(user.id), role_val)
        refresh = create_refresh_token(str(user.id))
        payload = decode_token(refresh)
        await self.tokens.create(
            user_id=user.id, jti=payload["jti"], device_id=device_id,
            expires_at=datetime.fromtimestamp(payload["exp"], tz=timezone.utc),
        )
        return TokenPair(
            access_token=access, refresh_token=refresh,
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        )


# ─── Students ────────────────────────────────────────────────────────────────
class StudentService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = StudentRepository(db)

    async def create(self, data: StudentCreate, coach: User) -> Student:
        if data.client_uuid:
            existing = await self.repo.by_client_uuid(data.client_uuid)
            if existing:
                return existing
        code = data.external_code or f"NSRC-{uuid4().hex[:8].upper()}"
        return await self.repo.create(
            **data.model_dump(exclude={"external_code"}),
            external_code=code, coach_id=coach.id,
        )


# ─── Assessments ─────────────────────────────────────────────────────────────
class AssessmentService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = AssessmentRepository(db)
        self.videos = AssessmentVideoRepository(db)
        self.results = AssessmentResultRepository(db)
        self.reports = AIReportRepository(db)
        self.metrics = PerformanceMetricRepository(db)

    async def create(self, data: AssessmentCreate, coach: User) -> Assessment:
        if data.client_uuid:
            existing = await self.repo.by_client_uuid(data.client_uuid)
            if existing:
                return existing
        return await self.repo.create(
            student_id=data.student_id, kind=data.kind, coach_id=coach.id,
            recorded_at=data.recorded_at, gps_lat=data.gps_lat, gps_lng=data.gps_lng,
            client_uuid=data.client_uuid,
        )

    async def attach_video(self, data: VideoMetadataIn):
        assessment = await self.repo.get(data.assessment_id)
        if not assessment:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "assessment not found")
        return await self.videos.create(**data.model_dump())

    async def store_ai_report(self, data: AIReportIn) -> AIReport:
        """Accept a Phase 2 mobile AI report. Validates then persists with version."""
        assessment = await self.repo.get(data.assessment_id)
        if not assessment:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "assessment not found")
        version = await self.reports.next_version(data.assessment_id)
        report = await self.reports.create(
            assessment_id=data.assessment_id, version=version,
            engine_id=data.engine_id, engine_version=data.engine_version,
            payload=data.payload, quality=data.quality, anti_cheat=data.anti_cheat,
            verification=data.anti_cheat.get("recommendation", "review"),
        )
        # aggregate result row
        await self.results.create(
            assessment_id=data.assessment_id,
            metrics={m.key: {"value": m.value, "unit": m.unit} for m in data.metrics},
            scores=data.payload.get("scores", {}),
            overall_score=data.overall_score,
            national_percentile=data.national_percentile,
        )
        for m in data.metrics:
            await self.metrics.create(
                student_id=assessment.student_id, assessment_id=assessment.id,
                key=m.key, value=m.value, unit=m.unit,
            )
        assessment.status = AssessmentStatus.COMPLETED
        return report


# ─── Sync ────────────────────────────────────────────────────────────────────
class SyncService:
    """Applies queued offline mutations with last-write-wins by (version, client_ts)."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.queue = SyncQueueRepository(db)
        self.students = StudentService(db)
        self.assessments = AssessmentService(db)

    async def apply_batch(self, batch: SyncBatchIn, user: User) -> SyncBatchResult:
        results: list[SyncItemResult] = []
        accepted = conflicts = failed = 0
        for item in batch.items:
            try:
                server_id = await self._apply_one(item, user, batch.device_id)
                results.append(SyncItemResult(
                    resource_client_uuid=item.resource_client_uuid,
                    status="synced", server_resource_id=server_id, server_version=item.version,
                ))
                accepted += 1
            except HTTPException as e:
                if e.status_code == status.HTTP_409_CONFLICT:
                    conflicts += 1
                    results.append(SyncItemResult(
                        resource_client_uuid=item.resource_client_uuid,
                        status="conflict", error=str(e.detail),
                    ))
                else:
                    failed += 1
                    results.append(SyncItemResult(
                        resource_client_uuid=item.resource_client_uuid,
                        status="failed", error=str(e.detail),
                    ))
            except Exception as e:  # pragma: no cover
                failed += 1
                results.append(SyncItemResult(
                    resource_client_uuid=item.resource_client_uuid,
                    status="failed", error=str(e),
                ))
        return SyncBatchResult(
            accepted=accepted, conflicts=conflicts, failed=failed,
            results=results, server_time=datetime.now(timezone.utc),
        )

    async def _apply_one(self, item, user: User, device_id: str) -> UUID | None:
        # Log every sync attempt for auditability
        await self.queue.create(
            user_id=user.id, device_id=device_id,
            resource_type=item.resource_type, resource_client_uuid=item.resource_client_uuid,
            operation=item.operation, payload=item.payload, version=item.version,
            client_ts=item.client_ts, status="pending",
        )
        if item.resource_type == "student":
            s = await self.students.create(StudentCreate(**{**item.payload, "client_uuid": item.resource_client_uuid}), user)
            return s.id
        if item.resource_type == "assessment":
            a = await self.assessments.create(AssessmentCreate(**{**item.payload, "client_uuid": item.resource_client_uuid}), user)
            return a.id
        if item.resource_type == "ai_report":
            r = await self.assessments.store_ai_report(AIReportIn(**item.payload))
            return r.id
        if item.resource_type == "video":
            v = await self.assessments.attach_video(VideoMetadataIn(**item.payload))
            return v.id
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"unknown resource: {item.resource_type}")


# ─── Scholarship / Trial ─────────────────────────────────────────────────────
class ScholarshipService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = ScholarshipRepository(db)

    async def submit(self, student_id: UUID, user: User, notes: str | None) -> ScholarshipApplication:
        return await self.repo.create(
            student_id=student_id, notes=notes,
            history=[{"stage": "submitted", "by": str(user.id), "at": datetime.now(timezone.utc).isoformat()}],
        )

    async def transition(self, app_id: UUID, data: ScholarshipTransition, user: User) -> ScholarshipApplication:
        app = await self.repo.get(app_id)
        if not app:
            raise HTTPException(status.HTTP_404_NOT_FOUND)
        app.stage = ScholarshipStage(data.stage)
        app.notes = data.notes or app.notes
        if data.amount_inr is not None:
            app.amount_inr = data.amount_inr
        app.reviewed_by = user.id
        history = list(app.history or [])
        history.append({"stage": data.stage, "by": str(user.id), "at": datetime.now(timezone.utc).isoformat(), "notes": data.notes})
        app.history = history
        return app


class TrialService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = TrialRepository(db)

    async def create(self, data: TrialCreate) -> Trial:
        return await self.repo.create(**data.model_dump())

    async def record_result(self, trial_id: UUID, data: TrialResult) -> Trial:
        trial = await self.repo.get(trial_id)
        if not trial:
            raise HTTPException(status.HTTP_404_NOT_FOUND)
        trial.attendance = data.attendance
        trial.result = data.result
        trial.remarks = data.remarks
        return trial
