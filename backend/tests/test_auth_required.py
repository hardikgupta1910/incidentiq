from fastapi.testclient import TestClient

from app.main import app


def test_incident_upload_requires_authentication():
    with TestClient(app) as client:
        response = client.post(
            "/api/incidents",
            files={
                "file": (
                    "sample.log",
                    b"ERROR Example failure\n",
                    "text/plain",
                )
            },
        )

    assert response.status_code == 401


def test_incident_lookup_requires_authentication():
    with TestClient(app) as client:
        response = client.get(
            "/api/incidents/00000000-0000-0000-0000-000000000000"
        )

    assert response.status_code == 401