from fastapi.testclient import TestClient

from app.main import app
from app.services import investigation


def test_privacy_mode_blocks_hosted_provider(monkeypatch):
    monkeypatch.setattr(
        investigation.settings,
        "local_privacy_mode",
        True,
    )

    hosted_provider_was_called = False

    def fake_hosted_call(*args, **kwargs):
        nonlocal hosted_provider_was_called
        hosted_provider_was_called = True
        return {}

    monkeypatch.setattr(
        investigation,
        "call_hosted_provider",
        fake_hosted_call,
        raising=False,
    )

    with TestClient(app) as client:
        response = client.post(
            "/api/incidents/00000000-0000-0000-0000-000000000000/investigate",
        )

    assert response.status_code == 404
    assert hosted_provider_was_called is False