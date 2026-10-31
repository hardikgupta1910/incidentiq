from fastapi.testclient import TestClient

from app.main import app


def test_provider_health_reports_all_services():
    with TestClient(app) as client:
        response = client.get("/api/health/providers")

    assert response.status_code == 200

    body = response.json()
    assert body["status"] == "ok"
    assert body["providers"] == {
        "mysql": "available",
        "qdrant": "available",
        "ollama": "available",
    }