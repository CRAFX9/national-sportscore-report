"""Analytics — aggregation queries."""
from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import AssessmentResult, Gender, Student


class AnalyticsService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def district_rankings(self, district_id, limit: int = 50):
        stmt = (
            select(Student.id, Student.full_name, func.avg(AssessmentResult.overall_score).label("score"))
            .join(AssessmentResult, AssessmentResult.assessment_id == Student.id)  # simplified join
            .where(Student.district_id == district_id)
            .group_by(Student.id).order_by(func.avg(AssessmentResult.overall_score).desc())
            .limit(limit)
        )
        return (await self.db.execute(stmt)).all()

    async def gender_distribution(self):
        stmt = select(Student.gender, func.count()).group_by(Student.gender)
        return {str(g): c for g, c in (await self.db.execute(stmt)).all()}

    async def participation_stats(self):
        total = (await self.db.execute(select(func.count(Student.id)))).scalar_one()
        m = (await self.db.execute(select(func.count()).where(Student.gender == Gender.MALE))).scalar_one()
        f = (await self.db.execute(select(func.count()).where(Student.gender == Gender.FEMALE))).scalar_one()
        return {"total_athletes": total, "male": m, "female": f}
