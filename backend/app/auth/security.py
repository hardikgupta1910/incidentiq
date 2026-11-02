import os
from datetime import datetime, timedelta, timezone
from pathlib import Path

import jwt
from dotenv import load_dotenv
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from pwdlib import PasswordHash
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import UserRecord


load_dotenv(
    Path(__file__).resolve().parents[2] / ".env"
)

JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "").strip()

if (
    len(JWT_SECRET_KEY) < 32
    or JWT_SECRET_KEY in {
        "change_this_secret",
        "change_this_to_a_long_random_secret",
    }
):
    raise RuntimeError(
        "Set JWT_SECRET_KEY to a strong random secret "
        "in backend/.env."
    )

JWT_ALGORITHM = "HS256"
JWT_EXPIRE_MINUTES = int(
    os.getenv("JWT_EXPIRE_MINUTES", "60")
)

if JWT_EXPIRE_MINUTES <= 0:
    raise RuntimeError("JWT_EXPIRE_MINUTES must be positive.")


password_hash = PasswordHash.recommended()

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="/api/auth/token"
)


def hash_password(password: str) -> str:
    return password_hash.hash(password)


def verify_password(
    plain_password: str,
    hashed_password: str,
) -> bool:
    return password_hash.verify(
        plain_password,
        hashed_password,
    )


def create_access_token(
    username: str,
    role: str,
) -> str:
    now = datetime.now(timezone.utc)

    payload = {
        "sub": username,
        "role": role,
        "iat": now,
        "exp": now + timedelta(
            minutes=JWT_EXPIRE_MINUTES
        ),
    }

    return jwt.encode(
        payload,
        JWT_SECRET_KEY,
        algorithm=JWT_ALGORITHM,
    )


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> UserRecord:
    credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired access token.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(
            token,
            JWT_SECRET_KEY,
            algorithms=[JWT_ALGORITHM],
            options={
                "require": ["sub", "exp", "iat"],
            },
        )

        username = payload.get("sub")

        if not isinstance(username, str) or not username:
            raise credentials_error

    except jwt.InvalidTokenError:
        raise credentials_error

    user = db.scalar(
        select(UserRecord).where(
            UserRecord.username == username
        )
    )

    if user is None:
        raise credentials_error

    # Use the current database role, not the token's role.
    return user


def require_admin(
    current_user: UserRecord = Depends(get_current_user),
) -> UserRecord:
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin role required.",
        )

    return current_user