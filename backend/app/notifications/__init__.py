"""Notification dispatcher — multi-channel, provider-abstracted."""
from __future__ import annotations

from abc import ABC, abstractmethod
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.models import NotificationChannel
from app.repositories import NotificationRepository
from app.schemas import NotificationCreate

log = get_logger("notify")


class Channel(ABC):
    @abstractmethod
    async def send(self, to: str, title: str, body: str, data: dict) -> None: ...


class ConsoleChannel(Channel):
    def __init__(self, kind: str): self.kind = kind
    async def send(self, to: str, title: str, body: str, data: dict) -> None:
        log.info("notify", channel=self.kind, to=to, title=title)


class NotificationService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = NotificationRepository(db)
        self.channels: dict[str, Channel] = {
            "push": ConsoleChannel("push"),
            "sms": ConsoleChannel("sms"),
            "email": ConsoleChannel("email"),
            "in_app": ConsoleChannel("in_app"),
        }

    async def dispatch(self, data: NotificationCreate):
        n = await self.repo.create(
            user_id=data.user_id, channel=NotificationChannel(data.channel),
            title=data.title, body=data.body, data=data.data,
        )
        await self.channels[data.channel].send(str(data.user_id), data.title, data.body, data.data)
        return n

    async def mark_read(self, notification_id: UUID):
        from datetime import datetime, timezone
        n = await self.repo.get(notification_id)
        if n:
            n.read_at = datetime.now(timezone.utc)
        return n
