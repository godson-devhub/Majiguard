import pytest
from app.db.session import SessionLocal

@pytest.fixture
def db_session():
    if SessionLocal.kw.get("bind") is None:
        pytest.skip("DATABASE_URL is not configured")
    with SessionLocal() as session:
        yield session
        session.rollback()
