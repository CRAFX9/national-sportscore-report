"""AI Report endpoints — receive on-device Phase-2 reports."""
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select

from app.api.deps import DbDep, UserDep, require_permission
from app.core.rbac import Permission
from app.models import AIReport
from app.schemas import AIReportIn, AIReportOut
from app.services import AssessmentService

router = APIRouter()


@router.post("", response_model=AIReportOut, status_code=status.HTTP_201_CREATED,
             dependencies=[Depends(require_permission(Permission.ASSESSMENT_CREATE))],
             summary="Submit an on-device AI report (Phase 2 output).")
async def submit(data: AIReportIn, db: DbDep, user: UserDep):
    return await AssessmentService(db).store_ai_report(data)


@router.get("/assessment/{assessment_id}", response_model=list[AIReportOut],
            dependencies=[Depends(require_permission(Permission.REPORT_READ))])
async def versions(assessment_id: UUID, db: DbDep):
    rows = (await db.execute(
        select(AIReport).where(AIReport.assessment_id == assessment_id).order_by(AIReport.version.desc())
    )).scalars().all()
    return rows


@router.get("/{report_id}",
            dependencies=[Depends(require_permission(Permission.REPORT_READ))])
async def get_report(report_id: UUID, db: DbDep):
    r = await db.get(AIReport, report_id)
    if not r: raise HTTPException(status.HTTP_404_NOT_FOUND)
    return {"id": r.id, "assessment_id": r.assessment_id, "version": r.version,
            "engine_id": r.engine_id, "engine_version": r.engine_version,
            "payload": r.payload, "quality": r.quality, "anti_cheat": r.anti_cheat,
            "verification": r.verification, "created_at": r.created_at}
