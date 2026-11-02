from unittest.mock import Mock

import pytest

from app.schemas import Incident, InvestigationResult
from app.services import investigation


@pytest.fixture
def incident():
    return Incident(
        title="Privacy test incident",
        source_filename="privacy-test.log",
        total_log_lines=0,
        error_count=0,
        events=[],
    )


def test_privacy_mode_allows_local_inference(monkeypatch, incident):
    monkeypatch.setattr(
        investigation.settings,
        "local_privacy_mode",
        True,
    )

    expected = InvestigationResult(
        incident_id=incident.id,
        status="completed",
        hypotheses=[],
    )

    local_call = Mock(return_value=expected)
    hosted_call = Mock()
    retrieval = Mock(return_value=("", []))

    monkeypatch.setattr(
        investigation,
        "investigate_with_local_ai",
        local_call,
    )
    monkeypatch.setattr(
        investigation,
        "call_hosted_provider",
        hosted_call,
    )
    monkeypatch.setattr(
        investigation,
        "retrieve_runbook_context",
        retrieval,
    )

    result = investigation.investigate_incident(
        incident,
        provider="local",
    )

    assert result.incident_id == incident.id
    local_call.assert_called_once()
    hosted_call.assert_not_called()


def test_privacy_mode_blocks_hosted_inference(monkeypatch, incident):
    monkeypatch.setattr(
        investigation.settings,
        "local_privacy_mode",
        True,
    )

    hosted_call = Mock()
    retrieval = Mock()

    monkeypatch.setattr(
        investigation,
        "call_hosted_provider",
        hosted_call,
    )
    monkeypatch.setattr(
        investigation,
        "retrieve_runbook_context",
        retrieval,
    )

    with pytest.raises(PermissionError, match="Local privacy mode"):
        investigation.investigate_incident(
            incident,
            provider="hosted",
            cloud_opt_in=True,
        )

    hosted_call.assert_not_called()
    retrieval.assert_not_called()


def test_hosted_inference_requires_cloud_opt_in(monkeypatch, incident):
    monkeypatch.setattr(
        investigation.settings,
        "local_privacy_mode",
        False,
    )

    hosted_call = Mock()

    monkeypatch.setattr(
        investigation,
        "call_hosted_provider",
        hosted_call,
    )

    with pytest.raises(PermissionError, match="explicit cloud opt-in"):
        investigation.investigate_incident(
            incident,
            provider="hosted",
            cloud_opt_in=False,
        )

    hosted_call.assert_not_called()