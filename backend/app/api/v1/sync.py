"""Offline sync API."""
from datetime import datetime, timezone

from fastapi import APIRouter, Query
from sqlalchemy import func, select

from app.api.deps import DbDep, UserDep
from app.models import Notification, NationalBenchmark, SyncQueueItem
from app.schemas import SyncBatchIn, SyncBatchResult, SyncStatus
from app.services import SyncService

router = APIRouter()


@router.post("/upload", response_model=SyncBatchResult,
             summary="Push a batch of offline mutations (students / assessments / videos / AI reports).")
async def upload_batch(batch: SyncBatchIn, db: DbDep, user: UserDep):
    return await SyncService(db).apply_batch(batch, user)


@router.get("/benchmarks", summary="Latest national benchmark table.")
async def download_benchmarks(db: DbDep, version: str | None = None):
    stmt = select(NationalBenchmark)
    if version: stmt = stmt.where(NationalBenchmark.version == version)
    rows = (await db.execute(stmt)).scalars().all()
    return {"version": version or "latest", "count": len(rows), "items": [
        {"kind": r.kind.value, "age_band": r.age_band, "gender": r.gender.value,
         "elite": r.elite, "good": r.good, "avg": r.avg, "version": r.version}
        for r in rows
    ]}


@router.get("/notifications", summary="Fetch undelivered notifications for offline devices.")
async def download_notifications(db: DbDep, user: UserDep, since: datetime | None = None):
    stmt = select(Notification).where(Notification.user_id == user.id)
    if since: stmt = stmt.where(Notification.created_at > since)
    rows = (await db.execute(stmt.order_by(Notification.created_at.desc()).limit(200))).scalars().all()
    return {"server_time": datetime.now(timezone.utc), "items": [
        {"id": str(r.id), "channel": r.channel.value, "title": r.title, "body": r.body,
         "data": r.data, "created_at": r.created_at} for r in rows
    ]}


@router.get("/status", response_model=SyncStatus)
async def status(db: DbDep, user: UserDep, device_id: str = Query(...)):
    pending = (await db.execute(select(func.count()).where(
        SyncQueueItem.user_id == user.id, SyncQueueItem.device_id == device_id,
        SyncQueueItem.status == "pending",
    ))).scalar_one()
    failed = (await db.execute(select(func.count()).where(
        SyncQueueItem.user_id == user.id, SyncQueueItem.device_id == device_id,
        SyncQueueItem.status == "failed",
    ))).scalar_one()
    last = (await db.execute(select(func.max(SyncQueueItem.processed_at)).where(
        SyncQueueItem.user_id == user.id, SyncQueueItem.device_id == device_id,
    ))).scalar()
    return SyncStatus(device_id=device_id, pending=pending, failed=failed, last_synced_at=last)


@router.post("/retry", summary="Requeue failed items for the calling device.")
async def retry_failed(db: DbDep, user: UserDep, device_id: str = Query(...)):
    from sqlalchemy import update
    result = await db.execute(update(SyncQueueItem).where(
        SyncQueueItem.user_id == user.id, SyncQueueItem.device_id == device_id,
        SyncQueueItem.status == "failed",
    ).values(status="pending", attempts=0, last_error=None))
    return {"requeued": result.rowcount}
