"""v1 API router."""
from fastapi import APIRouter

from app.api.v1 import (
    admin, ai_reports, analytics, assessments, auth, notifications, scholarships,
    schools, settings as settings_ep, students, sync, trials, users, videos,
)

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(students.router, prefix="/students", tags=["students"])
api_router.include_router(schools.router, prefix="/schools", tags=["schools"])
api_router.include_router(assessments.router, prefix="/assessments", tags=["assessments"])
api_router.include_router(videos.router, prefix="/videos", tags=["videos"])
api_router.include_router(ai_reports.router, prefix="/ai-reports", tags=["ai-reports"])
api_router.include_router(scholarships.router, prefix="/scholarships", tags=["scholarships"])
api_router.include_router(trials.router, prefix="/trials", tags=["trials"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["notifications"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["analytics"])
api_router.include_router(sync.router, prefix="/sync", tags=["sync"])
api_router.include_router(settings_ep.router, prefix="/settings", tags=["settings"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])
