"""Authentication endpoints."""
from fastapi import APIRouter, status

from app.api.deps import DbDep, UserDep
from app.auth.otp import OTPService
from app.schemas import (
    LoginRequest, OTPRequest, OTPVerify, RefreshRequest, RegisterRequest, TokenPair, UserOut,
)
from app.services import AuthService

router = APIRouter()


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED,
             summary="Register a new user (coach/officer/parent).")
async def register(data: RegisterRequest, db: DbDep):
    user = await AuthService(db).register(data)
    return user


@router.post("/login", response_model=TokenPair, summary="Password login.")
async def login(data: LoginRequest, db: DbDep):
    _, tokens = await AuthService(db).login(data)
    return tokens


@router.post("/refresh", response_model=TokenPair, summary="Rotate refresh token.")
async def refresh(data: RefreshRequest, db: DbDep):
    return await AuthService(db).refresh(data.refresh_token)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT, summary="Revoke refresh token.")
async def logout(data: RefreshRequest, db: DbDep):
    await AuthService(db).logout(data.refresh_token)


@router.post("/otp/request", status_code=status.HTTP_202_ACCEPTED,
             summary="Request an OTP via SMS (ready-to-integrate).")
async def otp_request(data: OTPRequest):
    await OTPService().request(data.phone)
    return {"status": "sent"}


@router.post("/otp/verify", summary="Verify OTP code.")
async def otp_verify(data: OTPVerify):
    ok = await OTPService().verify(data.phone, data.code)
    return {"valid": ok}


@router.get("/me", response_model=UserOut, summary="Current authenticated user.")
async def me(user: UserDep):
    return user
