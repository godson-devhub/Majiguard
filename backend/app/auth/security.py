"""Password hashing and signed access tokens, using only the standard library.

* Passwords: scrypt with a per-password random salt, compared in constant time.
* Tokens: ``base64url(payload).base64url(HMAC-SHA256)`` with an expiry, signed
  with ``AUTH_SECRET_KEY``. No third-party packages are required.
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import json
import secrets
import time

_SCRYPT_N = 2**14
_SCRYPT_R = 8
_SCRYPT_P = 1


def _b64(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _unb64(text: str) -> bytes:
    return base64.urlsafe_b64decode(text + "=" * (-len(text) % 4))


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.scrypt(
        password.encode("utf-8"), salt=salt, n=_SCRYPT_N, r=_SCRYPT_R, p=_SCRYPT_P, dklen=32
    )
    return f"scrypt${_SCRYPT_N}${_SCRYPT_R}${_SCRYPT_P}${_b64(salt)}${_b64(digest)}"


def verify_password(password: str, stored: str) -> bool:
    try:
        scheme, n, r, p, salt, expected = stored.split("$")
        if scheme != "scrypt":
            return False
        digest = hashlib.scrypt(
            password.encode("utf-8"), salt=_unb64(salt), n=int(n), r=int(r), p=int(p), dklen=32
        )
        return hmac.compare_digest(digest, _unb64(expected))
    except (ValueError, TypeError):
        return False


# A real hash of a random value, verified against when the email is unknown so a
# missing account and a wrong password take the same time.
DUMMY_HASH = hash_password(secrets.token_urlsafe(16))


def create_token(user_id: int, secret: str, ttl_seconds: int) -> str:
    payload = json.dumps({"sub": user_id, "exp": int(time.time()) + ttl_seconds}, separators=(",", ":"))
    body = _b64(payload.encode("utf-8"))
    signature = hmac.new(secret.encode("utf-8"), body.encode("ascii"), hashlib.sha256).digest()
    return f"{body}.{_b64(signature)}"


def read_token(token: str, secret: str) -> int | None:
    """Return the user id if the token is genuine and unexpired, else ``None``."""
    try:
        body, signature = token.split(".")
        expected = hmac.new(secret.encode("utf-8"), body.encode("ascii"), hashlib.sha256).digest()
        if not hmac.compare_digest(expected, _unb64(signature)):
            return None
        payload = json.loads(_unb64(body))
        if int(payload["exp"]) < time.time():
            return None
        return int(payload["sub"])
    except (ValueError, KeyError, TypeError):
        return None
