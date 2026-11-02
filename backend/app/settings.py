from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


ENV_FILE = Path(__file__).resolve().parent / ".env"


class Settings(BaseSettings):
    database_url: str
    ollama_base_url: str = "http://127.0.0.1:11434"
    ollama_model: str = "qwen2.5:7b"
    local_privacy_mode: bool = True

    model_config = SettingsConfigDict(
    env_file=Path(__file__).resolve().parent.parent / ".env",
    env_file_encoding="utf-8",
    extra="ignore",
)


settings = Settings()