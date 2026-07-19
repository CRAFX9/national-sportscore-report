from fastapi import APIRouter
from sqlalchemy import select

from app.api.deps import DbDep
from app.models import School

router = APIRouter()


@router.get("")
async def list_schools(db: DbDep):
    rows = (await db.execute(select(School).limit(200))).scalars().all()
    return [{"id": str(s.id), "name": s.name, "udise_code": s.udise_code} for s in rows]
