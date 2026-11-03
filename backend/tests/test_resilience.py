from fastapi.testclient import TestClient

from app.main import app
import pytest

pytestmark = pytest.mark.usefixtures("authenticated_engineer")


def test_unknown_incident_returns_404():
    with TestClient(app) as client:
        response = client.get(
            "/api/incidents/00000000-0000-0000-0000-000000000000"
        )

    assert response.status_code == 404
    assert response.json() == {"detail": "Incident not found."}