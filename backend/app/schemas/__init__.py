"""Pydantic v2 schemas."""
from __future__ import annotations

from datetime import date, datetime
from typing import Any, Generic, Literal, TypeVar
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field

T = TypeVar("T")


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class Page(BaseModel, Generic[T]):
    items: list[T]
    total: int
    page: int
    size: int


# ─── Auth ─────────────────────────────────────────────────────────────────────
class LoginRequest(BaseModel):
    identifier: str = Field(..., description="Email or phone")
    password: str = Field(..., min_length=8, max_length=128)
    device_id: str | None = None
    platform: Literal["ios", "android", "web"] | None = None


class OTPRequest(BaseModel):
    phone: str = Field(..., pattern=r"^\+?[0-9]{10,15}$")


class OTPVerify(BaseModel):
    phone: str
    code: str = Field(..., min_length=4, max_length=8)
    device_id: str | None = None


class RegisterRequest(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=200)
    email: EmailStr | None = None
    phone: str | None = None
    password: str = Field(..., min_length=8, max_length=128)
    role: Literal["coach", "district_officer", "state_officer", "sai_official", "parent", "administrator"]


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class RefreshRequest(BaseModel):
    refresh_token: str


class UserOut(ORMModel):
    id: UUID
    full_name: str
    email: str | None
    phone: str | None
    role: str
    is_active: bool
    is_verified: bool


# ─── Students ─────────────────────────────────────────────────────────────────
class StudentBase(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=200)
    dob: date
    gender: Literal["male", "female", "other"]
    height_cm: float | None = Field(None, gt=30, lt=250)
    weight_kg: float | None = Field(None, gt=5, lt=250)
    guardian_name: str | None = None
    guardian_phone: str | None = None
    school_id: UUID | None = None
    district_id: UUID
    state_id: UUID
    village_id: UUID | None = None


class StudentCreate(StudentBase):
    client_uuid: str | None = None
    external_code: str | None = None


class StudentUpdate(BaseModel):
    full_name: str | None = None
    height_cm: float | None = None
    weight_kg: float | None = None
    guardian_name: str | None = None
    guardian_phone: str | None = None
    photo_url: str | None = None


class StudentOut(StudentBase, ORMModel):
    id: UUID
    external_code: str
    photo_url: str | None
    qr_code: str | None
    version: int
    created_at: datetime


# ─── Assessments ──────────────────────────────────────────────────────────────
AssessmentKindLit = Literal[
    "sprint_30m", "sprint_50m", "broad_jump", "vertical_jump",
    "shuttle_run", "balance_test", "reaction_test",
]


class AssessmentCreate(BaseModel):
    student_id: UUID
    kind: AssessmentKindLit
    recorded_at: datetime | None = None
    gps_lat: float | None = None
    gps_lng: float | None = None
    client_uuid: str | None = None


class AssessmentOut(ORMModel):
    id: UUID
    student_id: UUID
    kind: str
    status: str
    version: int
    created_at: datetime


class VideoMetadataIn(BaseModel):
    assessment_id: UUID
    storage_key: str
    content_hash: str = Field(..., min_length=8, max_length=128)
    duration_ms: int | None = None
    width: int | None = None
    height: int | None = None
    fps: int | None = None
    size_bytes: int | None = None


class MetricIn(BaseModel):
    key: str
    value: float
    unit: str


class AIReportIn(BaseModel):
    """Payload uploaded by the mobile app after on-device Phase 2 analysis."""
    assessment_id: UUID
    engine_id: str
    engine_version: str
    payload: dict[str, Any]
    quality: dict[str, Any] = Field(default_factory=dict)
    anti_cheat: dict[str, Any] = Field(default_factory=dict)
    metrics: list[MetricIn] = Field(default_factory=list)
    overall_score: float | None = None
    national_percentile: float | None = None


class AIReportOut(ORMModel):
    id: UUID
    assessment_id: UUID
    version: int
    engine_id: str
    engine_version: str
    verification: str
    created_at: datetime


# ─── Sync ─────────────────────────────────────────────────────────────────────
class SyncItemIn(BaseModel):
    resource_type: Literal["student", "assessment", "video", "ai_report"]
    resource_client_uuid: str
    operation: Literal["create", "update", "delete"]
    payload: dict[str, Any]
    version: int = 1
    client_ts: datetime


class SyncBatchIn(BaseModel):
    device_id: str
    items: list[SyncItemIn] = Field(..., max_length=500)


class SyncItemResult(BaseModel):
    resource_client_uuid: str
    status: Literal["synced", "conflict", "failed"]
    server_resource_id: UUID | None = None
    error: str | None = None
    server_version: int | None = None


class SyncBatchResult(BaseModel):
    accepted: int
    conflicts: int
    failed: int
    results: list[SyncItemResult]
    server_time: datetime


class SyncStatus(BaseModel):
    device_id: str
    pending: int
    failed: int
    last_synced_at: datetime | None


# ─── Scholarship / Trial ─────────────────────────────────────────────────────
class ScholarshipCreate(BaseModel):
    student_id: UUID
    notes: str | None = None


class ScholarshipTransition(BaseModel):
    stage: Literal[
        "verified", "district_approved", "state_approved", "trial_scheduled",
        "trial_completed", "selected", "rejected", "granted",
    ]
    notes: str | None = None
    amount_inr: float | None = None


class TrialCreate(BaseModel):
    student_id: UUID
    sport: str
    scheduled_at: datetime
    venue: str
    officer_id: UUID | None = None


class TrialResult(BaseModel):
    attendance: bool
    result: Literal["selected", "standby", "rejected"]
    remarks: str | None = None


# ─── Notifications ────────────────────────────────────────────────────────────
class NotificationCreate(BaseModel):
    user_id: UUID
    channel: Literal["push", "sms", "email", "in_app"]
    title: str
    body: str
    data: dict[str, Any] = Field(default_factory=dict)


class NotificationOut(ORMModel):
    id: UUID
    channel: str
    title: str
    body: str
    read_at: datetime | None
    created_at: datetime
