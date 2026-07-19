"""ORM models — normalized schema for NSRC."""
from __future__ import annotations

import uuid
from datetime import datetime, date
from enum import Enum as PyEnum

from sqlalchemy import (
    Boolean, Date, DateTime, Enum, Float, ForeignKey, Integer, JSON, String, Text, UniqueConstraint, func,
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.session import Base


def _uuid_col():
    return mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)


def _ts():
    return mapped_column(DateTime(timezone=True), server_default=func.now())


def _updated_ts():
    return mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


# ─── Geography ────────────────────────────────────────────────────────────────
class State(Base):
    __tablename__ = "states"
    id: Mapped[uuid.UUID] = _uuid_col()
    name: Mapped[str] = mapped_column(String(100), unique=True)
    code: Mapped[str] = mapped_column(String(10), unique=True)
    created_at = _ts()
    districts: Mapped[list["District"]] = relationship(back_populates="state")


class District(Base):
    __tablename__ = "districts"
    id: Mapped[uuid.UUID] = _uuid_col()
    state_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("states.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(String(120))
    created_at = _ts()
    state: Mapped[State] = relationship(back_populates="districts")
    villages: Mapped[list["Village"]] = relationship(back_populates="district")
    __table_args__ = (UniqueConstraint("state_id", "name"),)


class Village(Base):
    __tablename__ = "villages"
    id: Mapped[uuid.UUID] = _uuid_col()
    district_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("districts.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(String(120))
    pincode: Mapped[str | None] = mapped_column(String(10))
    district: Mapped[District] = relationship(back_populates="villages")


class School(Base):
    __tablename__ = "schools"
    id: Mapped[uuid.UUID] = _uuid_col()
    name: Mapped[str] = mapped_column(String(200))
    district_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("districts.id"))
    village_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("villages.id"))
    udise_code: Mapped[str | None] = mapped_column(String(30), unique=True)
    created_at = _ts()


# ─── Auth / Users ─────────────────────────────────────────────────────────────
class UserRole(str, PyEnum):
    COACH = "coach"
    DISTRICT_OFFICER = "district_officer"
    STATE_OFFICER = "state_officer"
    SAI_OFFICIAL = "sai_official"
    PARENT = "parent"
    ADMIN = "administrator"


class User(Base):
    __tablename__ = "users"
    id: Mapped[uuid.UUID] = _uuid_col()
    email: Mapped[str | None] = mapped_column(String(255), unique=True, index=True)
    phone: Mapped[str | None] = mapped_column(String(20), unique=True, index=True)
    password_hash: Mapped[str | None] = mapped_column(String(255))
    full_name: Mapped[str] = mapped_column(String(200))
    role: Mapped[UserRole] = mapped_column(Enum(UserRole, name="user_role"), index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    district_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("districts.id"))
    state_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("states.id"))
    school_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("schools.id"))
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at = _ts()
    updated_at = _updated_ts()


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"
    id: Mapped[uuid.UUID] = _uuid_col()
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    jti: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    device_id: Mapped[str | None] = mapped_column(String(128))
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    revoked: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at = _ts()


class DeviceRegistration(Base):
    __tablename__ = "device_registrations"
    id: Mapped[uuid.UUID] = _uuid_col()
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    device_id: Mapped[str] = mapped_column(String(128), index=True)
    platform: Mapped[str] = mapped_column(String(20))  # ios | android | web
    push_token: Mapped[str | None] = mapped_column(String(255))
    model: Mapped[str | None] = mapped_column(String(80))
    created_at = _ts()
    __table_args__ = (UniqueConstraint("user_id", "device_id"),)


class RolePermission(Base):
    __tablename__ = "role_permissions"
    id: Mapped[uuid.UUID] = _uuid_col()
    role: Mapped[UserRole] = mapped_column(Enum(UserRole, name="user_role"))
    permission: Mapped[str] = mapped_column(String(80))
    __table_args__ = (UniqueConstraint("role", "permission"),)


# ─── Students ─────────────────────────────────────────────────────────────────
class Gender(str, PyEnum):
    MALE = "male"
    FEMALE = "female"
    OTHER = "other"


class Student(Base):
    __tablename__ = "students"
    id: Mapped[uuid.UUID] = _uuid_col()
    external_code: Mapped[str] = mapped_column(String(40), unique=True, index=True)
    full_name: Mapped[str] = mapped_column(String(200))
    dob: Mapped[date] = mapped_column(Date)
    gender: Mapped[Gender] = mapped_column(Enum(Gender, name="gender"))
    height_cm: Mapped[float | None] = mapped_column(Float)
    weight_kg: Mapped[float | None] = mapped_column(Float)
    guardian_name: Mapped[str | None] = mapped_column(String(200))
    guardian_phone: Mapped[str | None] = mapped_column(String(20))
    school_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("schools.id"))
    district_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("districts.id"), index=True)
    state_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("states.id"), index=True)
    village_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("villages.id"))
    coach_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"))
    photo_url: Mapped[str | None] = mapped_column(String(500))
    qr_code: Mapped[str | None] = mapped_column(String(500))
    version: Mapped[int] = mapped_column(Integer, default=1)
    client_uuid: Mapped[str | None] = mapped_column(String(64), unique=True, index=True)
    created_at = _ts()
    updated_at = _updated_ts()


# ─── Assessments ──────────────────────────────────────────────────────────────
class AssessmentKind(str, PyEnum):
    SPRINT_30M = "sprint_30m"
    SPRINT_50M = "sprint_50m"
    BROAD_JUMP = "broad_jump"
    VERTICAL_JUMP = "vertical_jump"
    SHUTTLE_RUN = "shuttle_run"
    BALANCE_TEST = "balance_test"
    REACTION_TEST = "reaction_test"


class AssessmentStatus(str, PyEnum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    REVIEW = "review"
    REJECTED = "rejected"


class Assessment(Base):
    __tablename__ = "assessments"
    id: Mapped[uuid.UUID] = _uuid_col()
    student_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("students.id", ondelete="CASCADE"), index=True)
    coach_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"))
    kind: Mapped[AssessmentKind] = mapped_column(Enum(AssessmentKind, name="assessment_kind"), index=True)
    status: Mapped[AssessmentStatus] = mapped_column(Enum(AssessmentStatus, name="assessment_status"), default=AssessmentStatus.PENDING)
    recorded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    gps_lat: Mapped[float | None] = mapped_column(Float)
    gps_lng: Mapped[float | None] = mapped_column(Float)
    client_uuid: Mapped[str | None] = mapped_column(String(64), unique=True, index=True)
    version: Mapped[int] = mapped_column(Integer, default=1)
    created_at = _ts()
    updated_at = _updated_ts()


class AssessmentVideo(Base):
    __tablename__ = "assessment_videos"
    id: Mapped[uuid.UUID] = _uuid_col()
    assessment_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("assessments.id", ondelete="CASCADE"), index=True)
    storage_key: Mapped[str] = mapped_column(String(500))
    content_hash: Mapped[str] = mapped_column(String(128), index=True)
    duration_ms: Mapped[int | None] = mapped_column(Integer)
    width: Mapped[int | None] = mapped_column(Integer)
    height: Mapped[int | None] = mapped_column(Integer)
    fps: Mapped[int | None] = mapped_column(Integer)
    size_bytes: Mapped[int | None] = mapped_column(Integer)
    uploaded_at = _ts()


class AssessmentResult(Base):
    __tablename__ = "assessment_results"
    id: Mapped[uuid.UUID] = _uuid_col()
    assessment_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("assessments.id", ondelete="CASCADE"), unique=True)
    metrics: Mapped[dict] = mapped_column(JSONB, default=dict)
    scores: Mapped[dict] = mapped_column(JSONB, default=dict)
    overall_score: Mapped[float | None] = mapped_column(Float, index=True)
    national_percentile: Mapped[float | None] = mapped_column(Float)
    district_rank: Mapped[int | None] = mapped_column(Integer)
    state_rank: Mapped[int | None] = mapped_column(Integer)
    created_at = _ts()


class PerformanceMetric(Base):
    __tablename__ = "performance_metrics"
    id: Mapped[uuid.UUID] = _uuid_col()
    student_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("students.id", ondelete="CASCADE"), index=True)
    assessment_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("assessments.id", ondelete="CASCADE"))
    key: Mapped[str] = mapped_column(String(80), index=True)
    value: Mapped[float] = mapped_column(Float)
    unit: Mapped[str] = mapped_column(String(20))
    recorded_at = _ts()


class AIReport(Base):
    __tablename__ = "ai_reports"
    id: Mapped[uuid.UUID] = _uuid_col()
    assessment_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("assessments.id", ondelete="CASCADE"), index=True)
    version: Mapped[int] = mapped_column(Integer, default=1)
    engine_id: Mapped[str] = mapped_column(String(80))  # mock | mediapipe | movenet-*
    engine_version: Mapped[str] = mapped_column(String(40))
    payload: Mapped[dict] = mapped_column(JSONB)
    quality: Mapped[dict] = mapped_column(JSONB, default=dict)
    anti_cheat: Mapped[dict] = mapped_column(JSONB, default=dict)
    verification: Mapped[str] = mapped_column(String(20), default="review")  # verified|review|rejected
    created_at = _ts()
    __table_args__ = (UniqueConstraint("assessment_id", "version"),)


class NationalBenchmark(Base):
    __tablename__ = "national_benchmarks"
    id: Mapped[uuid.UUID] = _uuid_col()
    kind: Mapped[AssessmentKind] = mapped_column(Enum(AssessmentKind, name="assessment_kind"))
    age_band: Mapped[str] = mapped_column(String(10))  # "13-15"
    gender: Mapped[Gender] = mapped_column(Enum(Gender, name="gender"))
    elite: Mapped[float] = mapped_column(Float)
    good: Mapped[float] = mapped_column(Float)
    avg: Mapped[float] = mapped_column(Float)
    version: Mapped[str] = mapped_column(String(20), default="2026.1")
    __table_args__ = (UniqueConstraint("kind", "age_band", "gender", "version"),)


class SportRecommendation(Base):
    __tablename__ = "sport_recommendations"
    id: Mapped[uuid.UUID] = _uuid_col()
    student_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("students.id", ondelete="CASCADE"), index=True)
    sport: Mapped[str] = mapped_column(String(80))
    fit: Mapped[float] = mapped_column(Float)
    reasons: Mapped[dict] = mapped_column(JSONB, default=list)
    generated_at = _ts()


class ScoutProfile(Base):
    __tablename__ = "scout_profiles"
    id: Mapped[uuid.UUID] = _uuid_col()
    student_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("students.id", ondelete="CASCADE"), unique=True)
    payload: Mapped[dict] = mapped_column(JSONB)
    published: Mapped[bool] = mapped_column(Boolean, default=False)
    updated_at = _updated_ts()


class Certificate(Base):
    __tablename__ = "certificates"
    id: Mapped[uuid.UUID] = _uuid_col()
    student_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("students.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(200))
    issued_by: Mapped[str] = mapped_column(String(200))
    storage_key: Mapped[str | None] = mapped_column(String(500))
    issued_at: Mapped[date] = mapped_column(Date)


# ─── Scholarship / Trial ─────────────────────────────────────────────────────
class ScholarshipStage(str, PyEnum):
    SUBMITTED = "submitted"
    VERIFIED = "verified"
    DISTRICT_APPROVED = "district_approved"
    STATE_APPROVED = "state_approved"
    TRIAL_SCHEDULED = "trial_scheduled"
    TRIAL_COMPLETED = "trial_completed"
    SELECTED = "selected"
    REJECTED = "rejected"
    GRANTED = "granted"


class ScholarshipApplication(Base):
    __tablename__ = "scholarship_applications"
    id: Mapped[uuid.UUID] = _uuid_col()
    student_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("students.id", ondelete="CASCADE"), index=True)
    stage: Mapped[ScholarshipStage] = mapped_column(Enum(ScholarshipStage, name="scholarship_stage"), default=ScholarshipStage.SUBMITTED, index=True)
    notes: Mapped[str | None] = mapped_column(Text)
    amount_inr: Mapped[float | None] = mapped_column(Float)
    reviewed_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"))
    history: Mapped[list] = mapped_column(JSONB, default=list)
    created_at = _ts()
    updated_at = _updated_ts()


class Trial(Base):
    __tablename__ = "trials"
    id: Mapped[uuid.UUID] = _uuid_col()
    student_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("students.id", ondelete="CASCADE"), index=True)
    sport: Mapped[str] = mapped_column(String(80))
    scheduled_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    venue: Mapped[str] = mapped_column(String(200))
    officer_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"))
    attendance: Mapped[bool | None] = mapped_column(Boolean)
    result: Mapped[str | None] = mapped_column(String(40))  # selected|standby|rejected
    remarks: Mapped[str | None] = mapped_column(Text)
    created_at = _ts()
    updated_at = _updated_ts()


# ─── Notifications / Sync / Audit ─────────────────────────────────────────────
class NotificationChannel(str, PyEnum):
    PUSH = "push"
    SMS = "sms"
    EMAIL = "email"
    IN_APP = "in_app"


class Notification(Base):
    __tablename__ = "notifications"
    id: Mapped[uuid.UUID] = _uuid_col()
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    channel: Mapped[NotificationChannel] = mapped_column(Enum(NotificationChannel, name="notification_channel"))
    title: Mapped[str] = mapped_column(String(200))
    body: Mapped[str] = mapped_column(Text)
    data: Mapped[dict] = mapped_column(JSONB, default=dict)
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    delivered_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at = _ts()


class SyncQueueItem(Base):
    __tablename__ = "offline_sync_queue"
    id: Mapped[uuid.UUID] = _uuid_col()
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    device_id: Mapped[str] = mapped_column(String(128), index=True)
    resource_type: Mapped[str] = mapped_column(String(40), index=True)  # student|assessment|video|ai_report
    resource_client_uuid: Mapped[str] = mapped_column(String(64), index=True)
    operation: Mapped[str] = mapped_column(String(20))  # create|update|delete
    payload: Mapped[dict] = mapped_column(JSONB)
    version: Mapped[int] = mapped_column(Integer, default=1)
    status: Mapped[str] = mapped_column(String(20), default="pending", index=True)  # pending|synced|failed|conflict
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    last_error: Mapped[str | None] = mapped_column(Text)
    server_resource_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    client_ts: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    processed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at = _ts()


class AuditLog(Base):
    __tablename__ = "audit_logs"
    id: Mapped[uuid.UUID] = _uuid_col()
    user_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"))
    action: Mapped[str] = mapped_column(String(80), index=True)
    resource_type: Mapped[str | None] = mapped_column(String(40))
    resource_id: Mapped[str | None] = mapped_column(String(64))
    ip_address: Mapped[str | None] = mapped_column(String(50))
    user_agent: Mapped[str | None] = mapped_column(String(255))
    meta: Mapped[dict] = mapped_column(JSONB, default=dict)
    created_at = _ts()


class ActivityLog(Base):
    __tablename__ = "activity_logs"
    id: Mapped[uuid.UUID] = _uuid_col()
    user_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"))
    event: Mapped[str] = mapped_column(String(80), index=True)
    context: Mapped[dict] = mapped_column(JSONB, default=dict)
    created_at = _ts()
