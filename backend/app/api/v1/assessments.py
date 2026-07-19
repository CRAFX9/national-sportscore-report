"""Assessment endpoints."""
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import DbDep, UserDep, require_permission
from app.core.rbac import Permission
from app.repositories import AssessmentRepository, AssessmentResultRepository
from app.schemas import AssessmentCreate, AssessmentOut
from app.services import AssessmentService

router = APIRouter()


@router.post("", response_model=AssessmentOut, status_code=status.HTTP_201_CREATED,
             dependencies=[Depends(require_permission(Permission.ASSESSMENT_CREATE))])
async def create_assessment(data: AssessmentCreate, db: DbDep, user: UserDep):
    return await AssessmentService(db).create(data, user)


@router.get("/{assessment_id}", response_model=AssessmentOut,
            dependencies=[Depends(require_permission(Permission.ASSESSMENT_READ))])
async def get_assessment(assessment_id: UUID, db: DbDep):
    a = await AssessmentRepository(db).get(assessment_id)
    if not a: raise HTTPException(status.HTTP_404_NOT_FOUND)
    return a


@router.get("/{assessment_id}/result",
            dependencies=[Depends(require_permission(Permission.REPORT_READ))])
async def get_result(assessment_id: UUID, db: DbDep):
    from sqlalchemy import select
    from app.models import AssessmentResult
    row = (await db.execute(
        select(AssessmentResult).where(AssessmentResult.assessment_id == assessment_id)
    )).scalar_one_or_none()
    if not row: raise HTTPException(status.HTTP_404_NOT_FOUND)
    return {
        "metrics": row.metrics, "scores": row.scores,
        "overall_score": row.overall_score, "national_percentile": row.national_percentile,
        "district_rank": row.district_rank, "state_rank": row.state_rank,
    }
