"""Analytics endpoints."""
from uuid import UUID

from fastapi import APIRouter, Depends, Query

from app.api.deps import DbDep, require_permission
from app.analytics import AnalyticsService
from app.core.rbac import Permission

router = APIRouter()


@router.get("/participation")
async def participation(db: DbDep):
    return await AnalyticsService(db).participation_stats()


@router.get("/gender-distribution")
async def gender(db: DbDep):
    return await AnalyticsService(db).gender_distribution()


@router.get("/rankings/district/{district_id}",
            dependencies=[Depends(require_permission(Permission.ANALYTICS_DISTRICT))])
async def district_rankings(district_id: UUID, db: DbDep, limit: int = Query(50, le=200)):
    rows = await AnalyticsService(db).district_rankings(district_id, limit=limit)
    return [{"student_id": str(r[0]), "name": r[1], "score": float(r[2] or 0)} for r in rows]
