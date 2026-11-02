import os
from datetime import datetime
from fastapi.security import OAuth2PasswordRequestForm
import jwt
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.database import get_db
from app.models import UserRecord
from app.auth.security import (
    create_access_token,
    hash_password,
    verify_password,
)
from app.auth.security import get_current_user, require_admin

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


class RegisterRequest(BaseModel):
    username: str
    password: str
    role: str = "engineer"


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str


@router.post("/register", status_code=201)
def register_user(
    request: RegisterRequest,
    db: Session = Depends(get_db),
):
    if request.role not in {"engineer", "admin"}:
        raise HTTPException(
            status_code=400,
            detail="Role must be engineer or admin",
        )

    existing_user = (
        db.query(UserRecord)
        .filter(UserRecord.username == request.username)
        .first()
    )

    if existing_user:
        raise HTTPException(
            status_code=409,
            detail="Username already exists",
        )

    user = UserRecord(
        username=request.username,
        hashed_password=hash_password(request.password),
        role=request.role,
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return {
        "id": user.id,
        "username": user.username,
        "role": user.role,
    }


@router.post("/token", response_model=TokenResponse)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    user = (
        db.query(UserRecord)
        .filter(UserRecord.username == form_data.username)
        .first()
    )

    if not user or not verify_password(
        form_data.password,
        user.hashed_password,
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = create_access_token(
        username=user.username,
        role=user.role,
    )

    return TokenResponse(
        access_token=token,
        role=user.role,
    )


@router.get("/me")
def read_current_user(
    current_user: UserRecord = Depends(get_current_user),
):
    return {
        "id": str(current_user.id),
        "username": current_user.username,
        "role": current_user.role,
    }


@router.get("/users")
def read_users(
    db: Session = Depends(get_db),
    current_user: UserRecord = Depends(require_admin),
):
    users = db.scalars(
        select(UserRecord).order_by(UserRecord.username)
    ).all()

    return [
        {
            "id": str(user.id),
            "username": user.username,
            "role": user.role,
        }
        for user in users
    ]