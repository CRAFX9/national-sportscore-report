"""Administrator endpoints."""
from fastapi import APIRouter, Depends
from sqlalchemy import func, select

from app.api.deps import DbDep, require_role
from app.core.rbac import Role
from app.models import Assessment, Student, User

router = APIRouter(dependencies=[Depends(require_role(Role.ADMIN))])


@router.get("/overview")
async def overview(db: DbDep):
    users = (await db.execute(select(func.count(User.id)))).scalar_one()
    students = (await db.execute(select(func.count(Student.id)))).scalar_one()
    assessments = (await db.execute(select(func.count(Assessment.id)))).scalar_one()
    return {"users": users, "students": students, "assessments": assessments}
