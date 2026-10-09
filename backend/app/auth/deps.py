from __future__ import annotations

import logging
import secrets

from fastapi import Depends, Header, HTTPException
from sqlalchemy.orm import Session

from app.auth.security import read_token
from app.core.config import settings
from app.db.models import User
from app.db.session import get_db

log = logging.getLogger(__name__)

_secret: str
if settings.auth_secret_key:
    _secret = settings.auth_secret_key
else:
    # Development fallback: tokens stop working when the server restarts.
    _secret = secrets.token_urlsafe(48)
    log.warning("AUTH_SECRET_KEY is not set; using a temporary key. Set it in backend/.env for stable sessions.")


def auth_secret() -> str:
    return _secret


def current_user(authorization: str | None = Header(default=None), db: Session = Depends(get_db)) -> User:
    if authorization is None or not authorization.lower().startswith("bearer "):
        raise HTTPException(401, "Not authenticated")
    user_id = read_token(authorization[7:].strip(), auth_secret())
    user = db.get(User, user_id) if user_id is not None else None
    if user is None or user.status != "approved":
        raise HTTPException(401, "Not authenticated")
    return user
