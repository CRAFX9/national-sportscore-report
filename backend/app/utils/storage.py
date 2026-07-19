"""Storage abstraction — Local FS + S3-compatible."""
from __future__ import annotations

import hashlib
import os
from abc import ABC, abstractmethod
from pathlib import Path
from typing import BinaryIO

from app.core.config import settings


class StorageBackend(ABC):
    @abstractmethod
    async def put(self, key: str, data: BinaryIO, content_type: str = "application/octet-stream") -> str: ...
    @abstractmethod
    async def presigned_url(self, key: str, expires_in: int = 3600) -> str: ...
    @abstractmethod
    async def delete(self, key: str) -> None: ...


class LocalStorage(StorageBackend):
    def __init__(self, root: str):
        self.root = Path(root); self.root.mkdir(parents=True, exist_ok=True)

    async def put(self, key: str, data: BinaryIO, content_type: str = "application/octet-stream") -> str:
        path = self.root / key
        path.parent.mkdir(parents=True, exist_ok=True)
        with open(path, "wb") as f:
            f.write(data.read())
        return str(path)

    async def presigned_url(self, key: str, expires_in: int = 3600) -> str:
        return f"/files/{key}"

    async def delete(self, key: str) -> None:
        p = self.root / key
        if p.exists(): os.remove(p)


class S3Storage(StorageBackend):
    def __init__(self):
        import boto3
        self.client = boto3.client(
            "s3",
            region_name=settings.S3_REGION,
            aws_access_key_id=settings.S3_ACCESS_KEY,
            aws_secret_access_key=settings.S3_SECRET_KEY,
            endpoint_url=settings.S3_ENDPOINT_URL or None,
        )
        self.bucket = settings.S3_BUCKET

    async def put(self, key: str, data: BinaryIO, content_type: str = "application/octet-stream") -> str:
        self.client.upload_fileobj(data, self.bucket, key, ExtraArgs={"ContentType": content_type})
        return f"s3://{self.bucket}/{key}"

    async def presigned_url(self, key: str, expires_in: int = 3600) -> str:
        return self.client.generate_presigned_url(
            "get_object", Params={"Bucket": self.bucket, "Key": key}, ExpiresIn=expires_in,
        )

    async def delete(self, key: str) -> None:
        self.client.delete_object(Bucket=self.bucket, Key=key)


def get_storage() -> StorageBackend:
    if settings.STORAGE_BACKEND == "s3":
        return S3Storage()
    return LocalStorage(settings.LOCAL_STORAGE_PATH)


def sha256_stream(fp: BinaryIO) -> str:
    h = hashlib.sha256()
    while chunk := fp.read(8192):
        h.update(chunk)
    fp.seek(0)
    return h.hexdigest()
