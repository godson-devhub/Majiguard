import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import delete

from app.auth.security import create_token, hash_password, read_token, verify_password
from app.db.models import User
from app.db.session import SessionLocal
from app.main import app

client = TestClient(app)
PREFIX = "/api/v1/auth"


def test_password_hash_round_trip_and_rejects_wrong_password() -> None:
    stored = hash_password("correct horse battery")
    assert stored != "correct horse battery"
    assert verify_password("correct horse battery", stored)
    assert not verify_password("wrong password", stored)
    assert not verify_password("anything", "not-a-hash")


def test_token_round_trip_expiry_and_tampering() -> None:
    token = create_token(7, "secret", 60)
    assert read_token(token, "secret") == 7
    assert read_token(token, "other-secret") is None
    assert read_token(token[:-2] + "xx", "secret") is None
    assert read_token(create_token(7, "secret", -1), "secret") is None
    assert read_token("garbage", "secret") is None


@pytest.fixture
def emails():
    created: list[str] = []
    yield created
    if SessionLocal.kw.get("bind") is None:
        return
    with SessionLocal() as session:
        session.execute(delete(User).where(User.email.in_(created)))
        session.commit()


def _email(emails: list[str]) -> str:
    value = f"test-{uuid.uuid4().hex[:10]}@example.test"
    emails.append(value)
    return value


def _register(email: str, password: str = "a-strong-password", institution: str = "ruwasa"):
    return client.post(
        f"{PREFIX}/register",
        json={"full_name": "Test User", "email": email, "institution": institution, "password": password},
    )


def _requires_db() -> None:
    if SessionLocal.kw.get("bind") is None:
        pytest.skip("DATABASE_URL is not configured")


def test_register_signs_in_immediately_and_login_works(emails) -> None:
    _requires_db()
    email = _email(emails)

    created = _register(email)
    assert created.status_code == 201
    headers = {"Authorization": f"Bearer {created.json()['access_token']}"}
    assert client.get(f"{PREFIX}/me", headers=headers).json()["email"] == email
    assert _register(email).status_code == 409

    login = client.post(f"{PREFIX}/login", json={"email": email, "password": "a-strong-password"})
    assert login.status_code == 200
    assert login.json()["user"]["status"] == "approved"

    wrong = client.post(f"{PREFIX}/login", json={"email": email, "password": "nope-nope-nope"})
    assert wrong.status_code == 401
    assert wrong.json()["detail"] == "invalid_credentials"

    unknown = client.post(f"{PREFIX}/login", json={"email": _email(emails), "password": "whatever-123"})
    assert unknown.status_code == 401
    assert client.get(f"{PREFIX}/me").status_code == 401


def test_register_accepts_a_typed_institution(emails) -> None:
    _requires_db()
    created = _register(_email(emails), institution="  Mwanza  Urban Water   Authority ")
    assert created.status_code == 201
    assert created.json()["user"]["institution"] == "Mwanza Urban Water Authority"


def test_disabled_account_cannot_sign_in(emails) -> None:
    _requires_db()
    email = _email(emails)
    with SessionLocal() as session:
        session.add(
            User(
                email=email,
                full_name="Old Account",
                institution="ruwasa",
                password_hash=hash_password("a-strong-password"),
                status="disabled",
            )
        )
        session.commit()
    blocked = client.post(f"{PREFIX}/login", json={"email": email, "password": "a-strong-password"})
    assert blocked.status_code == 403
    assert blocked.json()["detail"] == "account_disabled"


def test_register_validates_input() -> None:
    bad_email = client.post(
        f"{PREFIX}/register",
        json={"full_name": "X Y", "email": "not-an-email", "institution": "ruwasa", "password": "long-enough-1"},
    )
    short_password = client.post(
        f"{PREFIX}/register",
        json={"full_name": "X Y", "email": "a@b.co", "institution": "ruwasa", "password": "short"},
    )
    no_institution = client.post(
        f"{PREFIX}/register",
        json={"full_name": "X Y", "email": "a@b.co", "institution": "   ", "password": "long-enough-1"},
    )
    assert bad_email.status_code == 422
    assert short_password.status_code == 422
    assert no_institution.status_code == 422
