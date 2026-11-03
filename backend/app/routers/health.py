from fastapi import APIRouter
from sqlalchemy import text
import os
from app.database import engine
from app.settings import settings


router = APIRouter(prefix="/api/health", tags=["Health"])


@router.get("/providers")
def provider_health():
    providers = {
        "mysql": "unavailable",
        "qdrant": "unavailable",
        "ollama": "unavailable",
    }

    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        providers["mysql"] = "available"
    except Exception:
        pass

    try:
        from qdrant_client import QdrantClient

        #client = QdrantClient(url="http://127.0.0.1:6333")
        client = QdrantClient(url=os.getenv("QDRANT_URL", "http://127.0.0.1:6333"))
        client.get_collections()
        providers["qdrant"] = "available"
    except Exception:
        pass

    try:
        import requests

        response = requests.get(
            f"{settings.ollama_base_url}/api/tags",
            timeout=2,
        )
        response.raise_for_status()
        providers["ollama"] = "available"
    except Exception:
        pass

    return {
        "status": (
            "ok"
            if all(value == "available" for value in providers.values())
            else "degraded"
        ),
        "providers": providers,
    }