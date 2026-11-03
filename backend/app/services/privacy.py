import os

from sqlalchemy.orm import Session

from app.database import engine
from app.models import PrivacyPolicyRecord
from app.settings import settings


CLOUD_PROVIDERS = {"groq", "openrouter"}


class PrivacyViolation(Exception):
    pass


def deployment_privacy_locked() -> bool:
    return (
        os.getenv("PRIVACY_MODE_LOCKED", "false")
        .strip()
        .lower()
        == "true"
    )


def initial_privacy_enabled() -> bool:
    environment_enabled = (
        os.getenv("PRIVACY_MODE", "false")
        .strip()
        .lower()
        == "true"
    )

    # Preserve the more restrictive existing configuration
    # until an administrator explicitly saves a workspace policy.
    return environment_enabled or settings.local_privacy_mode


def privacy_mode_enabled() -> bool:
    if deployment_privacy_locked():
        return True

    with Session(engine) as db:
        record = db.get(PrivacyPolicyRecord, 1)

        if record is not None:
            return record.enabled

    return initial_privacy_enabled()


def get_privacy_policy() -> dict:
    locked = deployment_privacy_locked()
    enabled = True if locked else privacy_mode_enabled()

    return {
        "enabled": enabled,
        "locked": locked,
        "scope": "workspace",
        "allowed_providers": (
            ["ollama"]
            if enabled
            else ["ollama", "groq", "openrouter"]
        ),
    }


def ensure_provider_allowed(provider: str) -> None:
    provider = provider.strip().lower()

    if provider not in {"ollama", *CLOUD_PROVIDERS}:
        raise ValueError("Unknown provider.")

    if privacy_mode_enabled() and provider in CLOUD_PROVIDERS:
        raise PrivacyViolation(
            "Privacy mode is enabled. "
            "Only the local Ollama provider may be used."
        )


def get_allowed_providers() -> list[str]:
    return get_privacy_policy()["allowed_providers"]