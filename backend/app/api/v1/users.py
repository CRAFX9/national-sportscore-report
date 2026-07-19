"""Users, Schools, Settings, Admin — thin CRUD endpoints."""
from fastapi import APIRouter, Depends

from app.api.deps import DbDep, UserDep, require_role
from app.core.rbac import Role
from app.repositories import UserRepository
from app.schemas import Page, UserOut

router = APIRouter()


@router.get("", response_model=Page[UserOut],
            dependencies=[Depends(require_role(Role.ADMIN))])
async def list_users(db: DbDep, page: int = 1, size: int = 20):
    items, total = await UserRepository(db).list(page=page, size=size, order_by="created_at", desc=True)
    return Page(items=list(items), total=total, page=page, size=size)


@router.get("/me", response_model=UserOut)
async def me(user: UserDep):
    return user
