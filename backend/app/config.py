import os
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")


class Settings:
    QDRANT_URL: str = os.getenv("QDRANT_URL", "http://localhost:6333")

    OLLAMA_BASE_URL: str = os.getenv(
        "OLLAMA_BASE_URL",
        "http://localhost:11434/v1",
    )
    OLLAMA_MODEL: str = os.getenv("OLLAMA_MODEL", "qwen2.5:7b")

    GROQ_API_KEY: str | None = os.getenv("GROQ_API_KEY") or None
    GROQ_MODEL: str = os.getenv(
        "GROQ_MODEL",
        "llama-3.3-70b-versatile",
    )

    
    PRIVACY_MODE: bool = os.getenv("PRIVACY_MODE", "false").lower() == "true"


settings = Settings()