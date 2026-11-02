import os


CLOUD_PROVIDERS = {"groq", "openrouter"}


class PrivacyViolation(Exception):
    pass


def ensure_provider_allowed(provider: str) -> None:
    provider = provider.lower()

    privacy_mode = os.getenv("PRIVACY_MODE", "false").lower() == "true"

    if privacy_mode and provider in CLOUD_PROVIDERS:
        raise PrivacyViolation(
            "Privacy mode is enabled. Only the local Ollama provider may be used."
        )


def get_allowed_providers() -> list[str]:
    privacy_mode = os.getenv("PRIVACY_MODE", "false").lower() == "true"

    if privacy_mode:
        return ["ollama"]

    return ["ollama", "groq", "openrouter"]