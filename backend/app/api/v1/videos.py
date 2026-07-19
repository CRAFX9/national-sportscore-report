"""Video upload endpoints."""
from uuid import uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status

from app.api.deps import DbDep, UserDep, require_permission
from app.core.rbac import Permission
from app.schemas import VideoMetadataIn
from app.services import AssessmentService
from app.utils.storage import get_storage, sha256_stream

router = APIRouter()


@router.post("/upload", status_code=status.HTTP_201_CREATED,
             dependencies=[Depends(require_permission(Permission.ASSESSMENT_CREATE))])
async def upload_video(
    db: DbDep, user: UserDep,
    assessment_id: str = Form(...), file: UploadFile = File(...),
):
    if not file.content_type or not file.content_type.startswith("video/"):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "video file required")
    content_hash = sha256_stream(file.file)
    key = f"videos/{assessment_id}/{uuid4().hex}-{file.filename}"
    await get_storage().put(key, file.file, content_type=file.content_type)
    meta = VideoMetadataIn(
        assessment_id=assessment_id, storage_key=key, content_hash=content_hash,
        size_bytes=file.size or 0,
    )
    v = await AssessmentService(db).attach_video(meta)
    return {"id": str(v.id), "storage_key": key, "content_hash": content_hash}
