"""OTP service — abstract provider so console/SMS/Twilio can swap in."""
from __future__ import annotations

import random
from abc import ABC, abstractmethod

import redis.asyncio as aioredis

from app.core.config import settings
from app.core.logging import get_logger

log = get_logger("otp")


class OTPProvider(ABC):
    @abstractmethod
    async def send(self, phone: str, code: str) -> None: ...


class ConsoleOTPProvider(OTPProvider):
    async def send(self, phone: str, code: str) -> None:
        log.info("otp_sent", phone=phone, code=code, provider="console")


def get_otp_provider() -> OTPProvider:
    return ConsoleOTPProvider()


class OTPService:
    KEY = "otp:{phone}"
    TTL = 300  # 5 min

    def __init__(self):
        self.redis = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
        self.provider = get_otp_provider()

    async def request(self, phone: str) -> None:
        code = f"{random.randint(100000, 999999)}"
        await self.redis.setex(self.KEY.format(phone=phone), self.TTL, code)
        await self.provider.send(phone, code)

    async def verify(self, phone: str, code: str) -> bool:
        stored = await self.redis.get(self.KEY.format(phone=phone))
        if stored and stored == code:
            await self.redis.delete(self.KEY.format(phone=phone))
            return True
        return False
