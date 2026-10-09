from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.auth import rate_limit
from app.auth.deps import auth_secret, current_user
from app.auth.schemas import LoginIn, RegisterIn, TokenOut, UserOut
from app.auth.security import DUMMY_HASH, create_token, hash_password, verify_password
from app.core.config import settings
from app.db.models import User
from app.db.session import get_db

router = APIRouter(prefix="/auth", tags=["auth"])

# Machine-readable reasons the interface turns into translated messages.
_BLOCKED = {
    "pending": "account_pending",
    "rejected": "account_rejected",
    "disabled": "account_disabled",
}


def _signed_in(user: User) -> TokenOut:
    token = create_token(user.id, auth_secret(), settings.auth_token_ttl_minutes * 60)
    return TokenOut(access_token=token, user=UserOut.model_validate(user))


@router.post("/register", response_model=TokenOut, status_code=201)
def register(body: RegisterIn, db: Session = Depends(get_db)) -> TokenOut:
    """Create an account. It is active immediately and the response signs the person in."""
    user = User(
        email=body.email,
        full_name=body.full_name,
        institution=body.institution,
        password_hash=hash_password(body.password),
        status="approved",
        is_admin=False,
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "email_taken") from None
    db.refresh(user)
    return _signed_in(user)


@router.post("/login", response_model=TokenOut)
def login(body: LoginIn, request: Request, db: Session = Depends(get_db)) -> TokenOut:
    email = body.email.strip().lower()
    key = f"{email}|{request.client.host if request.client else ''}"
    if rate_limit.is_blocked(key):
        raise HTTPException(429, "too_many_attempts")

    user = db.scalar(select(User).where(User.email == email))
    password_ok = verify_password(body.password, user.password_hash if user else DUMMY_HASH)
    if user is None or not password_ok:
        rate_limit.record_failure(key)
        raise HTTPException(401, "invalid_credentials")
    if user.status != "approved":
        # Only reveal the account state once the password is proven correct.
        raise HTTPException(403, _BLOCKED.get(user.status, "account_disabled"))

    rate_limit.clear(key)
    return _signed_in(user)


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(current_user)) -> UserOut:
    return UserOut.model_validate(user)
