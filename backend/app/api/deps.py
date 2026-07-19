"""FastAPI dependencies: DB session, auth user, RBAC guards."""
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.rbac import Permission, Role, has_permission
from app.core.security import decode_token
from app.database.session import get_db
from app.models import User
from app.repositories import UserRepository

bearer = HTTPBearer(auto_error=False)

DbDep = Annotated[AsyncSession, Depends(get_db)]


async def current_user(
    db: DbDep,
    creds: HTTPAuthorizationCredentials | None = Depends(bearer),
) -> User:
    if not creds:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "missing bearer token")
    try:
        payload = decode_token(creds.credentials)
    except ValueError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "invalid token")
    if payload.get("type") != "access":
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "wrong token type")
    user = await UserRepository(db).get(payload["sub"])
    if not user or not user.is_active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "inactive or unknown user")
    return user


UserDep = Annotated[User, Depends(current_user)]


def require_permission(perm: Permission):
    async def guard(user: UserDep) -> User:
        if not has_permission(Role(user.role.value if hasattr(user.role, "value") else user.role), perm):
            raise HTTPException(status.HTTP_403_FORBIDDEN, f"missing permission: {perm.value}")
        return user
    return guard


def require_role(*roles: Role):
    async def guard(user: UserDep) -> User:
        role = user.role.value if hasattr(user.role, "value") else user.role
        if role not in {r.value for r in roles} and role != Role.ADMIN.value:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "role not permitted")
        return user
    return guard
