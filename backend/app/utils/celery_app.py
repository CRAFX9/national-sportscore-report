"""Celery app + background tasks."""
from celery import Celery

from app.core.config import settings

celery_app = Celery(
    "nsrc", broker=settings.CELERY_BROKER_URL, backend=settings.CELERY_RESULT_BACKEND,
)
celery_app.conf.update(task_track_started=True, task_time_limit=600, timezone="UTC")


@celery_app.task(name="nsrc.rescore_assessment")
def rescore_assessment(assessment_id: str) -> dict:
    return {"assessment_id": assessment_id, "status": "queued"}


@celery_app.task(name="nsrc.deliver_notification")
def deliver_notification(notification_id: str) -> dict:
    return {"notification_id": notification_id, "delivered": True}
