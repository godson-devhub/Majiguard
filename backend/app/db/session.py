from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings


def create_database_engine() -> Engine:
    """Create a synchronous SQLAlchemy engine from DATABASE_URL."""
    if not settings.database_url:
        raise RuntimeError(
            "DATABASE_URL is not configured. Set it in backend/.env before using the database."
        )
    return create_engine(settings.database_url, pool_pre_ping=True)


engine: Engine | None = create_database_engine() if settings.database_url else None
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)


def get_db() -> Generator[Session, None, None]:
    """Yield a database session and always close it after use."""
    if engine is None:
        raise RuntimeError(
            "DATABASE_URL is not configured. Set it in backend/.env before using the database."
        )
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
