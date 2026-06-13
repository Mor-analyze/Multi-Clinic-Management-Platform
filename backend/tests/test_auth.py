from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_login_success():
    response = client.post(
        "/auth/login",
        data={"username": "morteza@clinichub.com", "password": "admin123"}
    )
    assert response.status_code == 200
    assert "access_token" in response.json()

def test_login_wrong_password():
    response = client.post(
        "/auth/login",
        data={"username": "morteza@clinichub.com", "password": "wrongpassword"}
    )
    assert response.status_code == 401

def test_login_nonexistent_user():
    response = client.post(
        "/auth/login",
        data={"username": "nobody@nowhere.com", "password": "anything"}
    )
    assert response.status_code == 401

def test_me_requires_auth():
    response = client.get("/auth/me")
    assert response.status_code == 401

def test_me_with_valid_token():
    # First login to get a token
    login_response = client.post(
        "/auth/login",
        data={"username": "morteza@clinichub.com", "password": "admin123"}
    )
    token = login_response.json()["access_token"]

    # Use token to access /auth/me
    response = client.get(
        "/auth/me",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    assert response.json()["email"] == "morteza@clinichub.com"