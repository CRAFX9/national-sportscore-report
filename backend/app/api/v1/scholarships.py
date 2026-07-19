"""Scholarship workflow endpoints."""
from uuid import UUID

from fastapi import APIRouter, Depends, status

from app.api.deps import DbDep, UserDep, require_permission
from app.core.rbac import Permission
from app.schemas import ScholarshipCreate, ScholarshipTransition
from app.services import ScholarshipService

router = APIRouter()


@router.post("", status_code=status.HTTP_201_CREATED)
async def submit(data: ScholarshipCreate, db: DbDep, user: UserDep):
    return await ScholarshipService(db).submit(data.student_id, user, data.notes)


@router.post("/{app_id}/district-approve",
             dependencies=[Depends(require_permission(Permission.SCHOLARSHIP_APPROVE_DISTRICT))])
async def district_approve(app_id: UUID, data: ScholarshipTransition, db: DbDep, user: UserDep):
    return await ScholarshipService(db).transition(app_id, data, user)


@router.post("/{app_id}/state-approve",
             dependencies=[Depends(require_permission(Permission.SCHOLARSHIP_APPROVE_STATE))])
async def state_approve(app_id: UUID, data: ScholarshipTransition, db: DbDep, user: UserDep):
    return await ScholarshipService(db).transition(app_id, data, user)


@router.post("/{app_id}/grant",
             dependencies=[Depends(require_permission(Permission.SCHOLARSHIP_APPROVE_NATIONAL))])
async def grant(app_id: UUID, data: ScholarshipTransition, db: DbDep, user: UserDep):
    return await ScholarshipService(db).transition(app_id, data, user)
