"""Generic async repository base + concrete repositories."""
from __future__ import annotations

from typing import Any, Generic, Sequence, TypeVar
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.session import Base

ModelT = TypeVar("ModelT", bound=Base)


class BaseRepository(Generic[ModelT]):
    model: type[ModelT]

    def __init__(self, session: AsyncSession):
        self.session = session

    async def get(self, id: UUID) -> ModelT | None:
        return await self.session.get(self.model, id)

    async def list(
        self, *, page: int = 1, size: int = 20,
        filters: dict[str, Any] | None = None,
        order_by: str | None = None, desc: bool = False,
    ) -> tuple[Sequence[ModelT], int]:
        stmt = select(self.model)
        if filters:
            for k, v in filters.items():
                if v is None:
                    continue
                col = getattr(self.model, k, None)
                if col is not None:
                    stmt = stmt.where(col == v)
        total = (await self.session.execute(
            select(func.count()).select_from(stmt.subquery())
        )).scalar_one()
        if order_by:
            col = getattr(self.model, order_by, None)
            if col is not None:
                stmt = stmt.order_by(col.desc() if desc else col.asc())
        stmt = stmt.offset((page - 1) * size).limit(size)
        rows = (await self.session.execute(stmt)).scalars().all()
        return rows, total

    async def create(self, **data: Any) -> ModelT:
        obj = self.model(**data)
        self.session.add(obj)
        await self.session.flush()
        return obj

    async def update(self, obj: ModelT, **data: Any) -> ModelT:
        for k, v in data.items():
            if v is not None:
                setattr(obj, k, v)
        await self.session.flush()
        return obj

    async def delete(self, obj: ModelT) -> None:
        await self.session.delete(obj)
        await self.session.flush()


# ── Concrete repositories ────────────────────────────────────────────────────
from app.models import (
    AIReport, Assessment, AssessmentResult, AssessmentVideo, AuditLog,
    Notification, PerformanceMetric, RefreshToken, ScholarshipApplication,
    Student, SyncQueueItem, Trial, User,
)


class UserRepository(BaseRepository[User]):
    model = User

    async def by_identifier(self, identifier: str) -> User | None:
        stmt = select(User).where((User.email == identifier) | (User.phone == identifier))
        return (await self.session.execute(stmt)).scalar_one_or_none()


class RefreshTokenRepository(BaseRepository[RefreshToken]):
    model = RefreshToken

    async def by_jti(self, jti: str) -> RefreshToken | None:
        return (await self.session.execute(
            select(RefreshToken).where(RefreshToken.jti == jti)
        )).scalar_one_or_none()


class StudentRepository(BaseRepository[Student]):
    model = Student

    async def by_client_uuid(self, client_uuid: str) -> Student | None:
        return (await self.session.execute(
            select(Student).where(Student.client_uuid == client_uuid)
        )).scalar_one_or_none()

    async def search(self, q: str, *, page: int = 1, size: int = 20) -> tuple[Sequence[Student], int]:
        pattern = f"%{q}%"
        stmt = select(Student).where(
            (Student.full_name.ilike(pattern)) | (Student.external_code.ilike(pattern))
        )
        total = (await self.session.execute(
            select(func.count()).select_from(stmt.subquery())
        )).scalar_one()
        stmt = stmt.offset((page - 1) * size).limit(size)
        rows = (await self.session.execute(stmt)).scalars().all()
        return rows, total


class AssessmentRepository(BaseRepository[Assessment]):
    model = Assessment

    async def by_client_uuid(self, client_uuid: str) -> Assessment | None:
        return (await self.session.execute(
            select(Assessment).where(Assessment.client_uuid == client_uuid)
        )).scalar_one_or_none()


class AssessmentVideoRepository(BaseRepository[AssessmentVideo]):
    model = AssessmentVideo


class AssessmentResultRepository(BaseRepository[AssessmentResult]):
    model = AssessmentResult


class AIReportRepository(BaseRepository[AIReport]):
    model = AIReport

    async def next_version(self, assessment_id: UUID) -> int:
        v = (await self.session.execute(
            select(func.max(AIReport.version)).where(AIReport.assessment_id == assessment_id)
        )).scalar()
        return (v or 0) + 1


class PerformanceMetricRepository(BaseRepository[PerformanceMetric]):
    model = PerformanceMetric


class ScholarshipRepository(BaseRepository[ScholarshipApplication]):
    model = ScholarshipApplication


class TrialRepository(BaseRepository[Trial]):
    model = Trial


class NotificationRepository(BaseRepository[Notification]):
    model = Notification


class SyncQueueRepository(BaseRepository[SyncQueueItem]):
    model = SyncQueueItem


class AuditRepository(BaseRepository[AuditLog]):
    model = AuditLog
