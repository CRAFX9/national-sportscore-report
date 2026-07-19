"""Sync helpers — conflict resolution primitives."""
from __future__ import annotations

from datetime import datetime


def resolve(server_version: int, server_ts: datetime, client_version: int, client_ts: datetime) -> str:
    """Return 'client_wins' | 'server_wins' | 'equal'."""
    if client_version > server_version:
        return "client_wins"
    if client_version < server_version:
        return "server_wins"
    if client_ts > server_ts:
        return "client_wins"
    if client_ts < server_ts:
        return "server_wins"
    return "equal"
