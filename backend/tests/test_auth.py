import pytest


@pytest.mark.asyncio
async def test_health(client):
    r = await client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


@pytest.mark.asyncio
async def test_register_and_login(client):
    r = await client.post("/api/v1/auth/register", json={
        "full_name": "Test Coach", "email": "coach@test.in",
        "password": "hunter2hunter2", "role": "coach",
    })
    assert r.status_code == 201, r.text
    r = await client.post("/api/v1/auth/login", json={
        "identifier": "coach@test.in", "password": "hunter2hunter2",
    })
    assert r.status_code == 200
    tokens = r.json()
    assert "access_token" in tokens and "refresh_token" in tokens

    r = await client.get("/api/v1/auth/me",
                         headers={"Authorization": f"Bearer {tokens['access_token']}"})
    assert r.status_code == 200
    assert r.json()["email"] == "coach@test.in"


@pytest.mark.asyncio
async def test_rbac_denies_parent_from_creating_students(client):
    await client.post("/api/v1/auth/register", json={
        "full_name": "Parent", "email": "p@test.in",
        "password": "parentpass1", "role": "parent",
    })
    tokens = (await client.post("/api/v1/auth/login", json={
        "identifier": "p@test.in", "password": "parentpass1",
    })).json()
    r = await client.post("/api/v1/students",
        headers={"Authorization": f"Bearer {tokens['access_token']}"},
        json={"full_name": "X", "dob": "2010-01-01", "gender": "male",
              "district_id": "00000000-0000-0000-0000-000000000000",
              "state_id": "00000000-0000-0000-0000-000000000000"})
    assert r.status_code == 403
