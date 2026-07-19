"""Student endpoints."""
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.api.deps import DbDep, UserDep, require_permission
from app.core.rbac import Permission
from app.repositories import StudentRepository
from app.schemas import Page, StudentCreate, StudentOut, StudentUpdate
from app.services import StudentService

router = APIRouter()


@router.post("", response_model=StudentOut, status_code=status.HTTP_201_CREATED,
             dependencies=[Depends(require_permission(Permission.STUDENT_CREATE))])
async def create_student(data: StudentCreate, db: DbDep, user: UserDep):
    return await StudentService(db).create(data, user)


@router.get("", response_model=Page[StudentOut],
            dependencies=[Depends(require_permission(Permission.STUDENT_READ))])
async def list_students(
    db: DbDep,
    q: str | None = Query(None, description="Search by name or code"),
    district_id: UUID | None = None, state_id: UUID | None = None,
    page: int = Query(1, ge=1), size: int = Query(20, ge=1, le=100),
    order_by: str = "created_at", desc: bool = True,
):
    repo = StudentRepository(db)
    if q:
        items, total = await repo.search(q, page=page, size=size)
    else:
        items, total = await repo.list(
            page=page, size=size,
            filters={"district_id": district_id, "state_id": state_id},
            order_by=order_by, desc=desc,
        )
    return Page(items=list(items), total=total, page=page, size=size)


@router.get("/{student_id}", response_model=StudentOut,
            dependencies=[Depends(require_permission(Permission.STUDENT_READ))])
async def get_student(student_id: UUID, db: DbDep):
    s = await StudentRepository(db).get(student_id)
    if not s: raise HTTPException(status.HTTP_404_NOT_FOUND)
    return s


@router.patch("/{student_id}", response_model=StudentOut,
              dependencies=[Depends(require_permission(Permission.STUDENT_UPDATE))])
async def update_student(student_id: UUID, data: StudentUpdate, db: DbDep):
    repo = StudentRepository(db)
    s = await repo.get(student_id)
    if not s: raise HTTPException(status.HTTP_404_NOT_FOUND)
    s.version += 1
    return await repo.update(s, **data.model_dump(exclude_unset=True))


@router.delete("/{student_id}", status_code=status.HTTP_204_NO_CONTENT,
               dependencies=[Depends(require_permission(Permission.STUDENT_DELETE))])
async def delete_student(student_id: UUID, db: DbDep):
    repo = StudentRepository(db)
    s = await repo.get(student_id)
    if not s: raise HTTPException(status.HTTP_404_NOT_FOUND)
    await repo.delete(s)


@router.get("/{student_id}/qr", summary="Return a QR payload for the scout profile.")
async def student_qr(student_id: UUID, db: DbDep):
    s = await StudentRepository(db).get(student_id)
    if not s: raise HTTPException(status.HTTP_404_NOT_FOUND)
    return {"payload": f"nsrc://scout/{s.external_code}", "external_code": s.external_code}


@router.get("/{student_id}/timeline")
async def student_timeline(student_id: UUID, db: DbDep):
    from app.models import Assessment
    from sqlalchemy import select
    rows = (await db.execute(
        select(Assessment).where(Assessment.student_id == student_id).order_by(Assessment.created_at.desc())
    )).scalars().all()
    return [{"id": str(r.id), "kind": r.kind.value, "status": r.status.value, "at": r.created_at} for r in rows]
