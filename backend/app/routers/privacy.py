import logging

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, StrictBool
from sqlalchemy.orm import Session

from app.auth.security import get_current_user, require_admin
from app.database import get_db
from app.models import PrivacyPolicyRecord
from app.services.privacy import (
    deployment_privacy_locked,
    get_privacy_policy,
)


logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/settings/privacy",
    tags=["Settings"],
)


class PrivacyUpdate(BaseModel):
    enabled: StrictBool
    confirm_external_processing: StrictBool = False


class PrivacyResponse(BaseModel):
    enabled: bool
    locked: bool
    scope: str
    allowed_providers: list[str]


@router.get("", response_model=PrivacyResponse)
def read_privacy_policy(
    current_user=Depends(get_current_user),
):
    return get_privacy_policy()


@router.put("", response_model=PrivacyResponse)
def update_privacy_policy(
    request: PrivacyUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(require_admin),
):
    if deployment_privacy_locked() and not request.enabled:
        raise HTTPException(
            status_code=403,
            detail="Privacy mode is locked by deployment configuration.",
        )

    if not request.enabled and not request.confirm_external_processing:
        raise HTTPException(
            status_code=400,
            detail="Confirm external processing before disabling privacy mode.",
        )

    record = db.get(PrivacyPolicyRecord, 1)

    if record is None:
        record = PrivacyPolicyRecord(
            id=1,
            enabled=request.enabled,
        )
        db.add(record)
    else:
        record.enabled = request.enabled

    try:
        db.commit()
    except Exception:
        db.rollback()
        raise

    logger.warning(
        "Workspace privacy policy changed by user_id=%s: enabled=%s",
        current_user.id,
        request.enabled,
    )

    return get_privacy_policy()