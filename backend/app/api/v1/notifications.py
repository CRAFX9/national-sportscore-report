"""Notification endpoints."""
from uuid import UUID

from fastapi import APIRouter, Query
from sqlalchemy import select

from app.api.deps import DbDep, UserDep
from app.models import Notification
from app.notifications import NotificationService
from app.schemas import NotificationCreate, NotificationOut

router = APIRouter()


@router.get("", response_model=list[NotificationOut])
async def list_my(db: DbDep, user: UserDep, unread: bool = Query(False)):
    stmt = select(Notification).where(Notification.user_id == user.id)
    if unread: stmt = stmt.where(Notification.read_at.is_(None))
    rows = (await db.execute(stmt.order_by(Notification.created_at.desc()).limit(100))).scalars().all()
    return rows


@router.post("", response_model=NotificationOut)
async def create(data: NotificationCreate, db: DbDep):
    return await NotificationService(db).dispatch(data)


@router.post("/{notification_id}/read")
async def mark_read(notification_id: UUID, db: DbDep):
    return await NotificationService(db).mark_read(notification_id)
