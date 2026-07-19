"""Trial management endpoints."""
from uuid import UUID

from fastapi import APIRouter, Depends, status

from app.api.deps import DbDep, UserDep, require_permission
from app.core.rbac import Permission
from app.notifications import NotificationService
from app.schemas import NotificationCreate, TrialCreate, TrialResult
from app.services import TrialService

router = APIRouter()


@router.post("", status_code=status.HTTP_201_CREATED,
             dependencies=[Depends(require_permission(Permission.TRIAL_MANAGE))])
async def create(data: TrialCreate, db: DbDep, user: UserDep):
    trial = await TrialService(db).create(data)
    # Notify officer if assigned
    if data.officer_id:
        await NotificationService(db).dispatch(NotificationCreate(
            user_id=data.officer_id, channel="in_app",
            title="Trial assigned", body=f"{data.sport} on {data.scheduled_at:%Y-%m-%d %H:%M} at {data.venue}",
            data={"trial_id": str(trial.id)},
        ))
    return trial


@router.post("/{trial_id}/result",
             dependencies=[Depends(require_permission(Permission.TRIAL_MANAGE))])
async def result(trial_id: UUID, data: TrialResult, db: DbDep):
    return await TrialService(db).record_result(trial_id, data)
