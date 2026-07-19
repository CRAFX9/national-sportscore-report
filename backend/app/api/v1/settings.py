from fastapi import APIRouter

router = APIRouter()


@router.get("")
async def app_settings():
    return {
        "ai": {"engine": "mobile-only", "phase": 2},
        "sync": {"batch_size": 500},
        "features": {"scholarship_workflow": True, "trials": True, "notifications": True},
    }
