from fastapi.testclient import TestClient

from app.main import app

import pytest

pytestmark = pytest.mark.usefixtures("authenticated_engineer")

def test_seed_incidents_endpoint_returns_known_scenario():
    with TestClient(app) as client:
        response = client.get("/api/incidents/seed")

    assert response.status_code == 200

    incidents = response.json()
    assert len(incidents) == 1

    incident = incidents[0]
    assert incident["title"] == "Seeded: Database connection failures"
    assert incident["status"] == "created"
    assert incident["total_log_lines"] == 3
    assert incident["error_count"] == 1
    assert incident["investigation"] is None
    assert incident["events"][2]["severity"] == "ERROR"