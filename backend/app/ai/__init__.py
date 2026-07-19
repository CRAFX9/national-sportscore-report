"""AI integration layer — the backend does NOT run inference.

Mobile devices produce a Phase-2 AIReport (pose → analysis → scoring →
anti-cheat → recommendations). This module defines the contract used to
validate incoming reports and to track engine version history.
"""
from __future__ import annotations

from typing import Any, Protocol

from pydantic import BaseModel


class AIReportPayload(BaseModel):
    """Envelope contract mirroring the mobile `AIReport` type in Phase 2."""
    engine_id: str
    engine_version: str
    quality: dict[str, Any]
    metrics: dict[str, Any]
    scores: dict[str, Any]
    anti_cheat: dict[str, Any]
    recommendations: list[dict[str, Any]] = []
    summary: str | None = None


class AIEngineAdapter(Protocol):
    """Contract for a server-side AI engine adapter — not used in v1 (no cloud
    inference), but future engines (batch re-scoring, model comparison) plug
    into this protocol."""

    id: str
    version: str

    async def rescore(self, report: AIReportPayload) -> AIReportPayload: ...


def validate_report(payload: dict[str, Any]) -> AIReportPayload:
    """Validate an inbound AI report envelope."""
    return AIReportPayload.model_validate(payload)
