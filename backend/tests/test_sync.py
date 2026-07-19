from datetime import datetime, timezone

import pytest

from app.sync import resolve


def test_conflict_client_wins_on_higher_version():
    now = datetime.now(timezone.utc)
    assert resolve(1, now, 2, now) == "client_wins"


def test_conflict_server_wins_on_older_client_ts():
    a = datetime(2026, 1, 1, tzinfo=timezone.utc)
    b = datetime(2026, 6, 1, tzinfo=timezone.utc)
    assert resolve(1, b, 1, a) == "server_wins"
