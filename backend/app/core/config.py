"""Application configuration via pydantic-settings."""
from functools import lru_cache
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    ENV: Literal["development", "staging", "production"] = "development"
    DEBUG: bool = True

    SECRET_KEY: str = "change-me"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    DATABASE_URL: str = "postgresql+asyncpg://nsrc:nsrc@localhost:5432/nsrc"
    SYNC_DATABASE_URL: str = "postgresql+psycopg2://nsrc:nsrc@localhost:5432/nsrc"

    REDIS_URL: str = "redis://localhost:6379/0"
    CELERY_BROKER_URL: str = "redis://localhost:6379/1"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/2"

    STORAGE_BACKEND: Literal["local", "s3"] = "local"
    LOCAL_STORAGE_PATH: str = "/data/storage"
    S3_BUCKET: str = ""
    S3_REGION: str = "ap-south-1"
    S3_ACCESS_KEY: str = ""
    S3_SECRET_KEY: str = ""
    S3_ENDPOINT_URL: str = ""

    CORS_ORIGINS: str = "http://localhost:5173"
    RATE_LIMIT_PER_MINUTE: int = 120

    OTP_PROVIDER: str = "console"
    SMS_PROVIDER: str = "console"
    EMAIL_PROVIDER: str = "console"
    PUSH_PROVIDER: str = "console"

    PASSWORD_HASHER: Literal["argon2", "bcrypt"] = Field(default="argon2")

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
