from unittest.mock import Mock

import pytest

from app.graph import investigation_graph as workflow
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
        investigation,
        "privacy_mode_enabled",
        lambda: True,
    )

    expected = InvestigationResult(
        incident_id=incident.id,
        status="completed",
        hypotheses=[],
        retrieved_sources=[],
        analysis_source="local_ai",
    )

    graph = Mock()
    graph.invoke.return_value = {"final_result": expected}
    monkeypatch.setattr(workflow, "investigation_graph", graph)

    hosted = Mock()
    monkeypatch.setattr(
        investigation,
        "call_hosted_provider",
        hosted,
    )

    result = investigation.investigate_incident(
        incident,
        provider="local",
    )

    assert result is expected
    graph.invoke.assert_called_once()
    assert graph.invoke.call_args.args[0]["incident"] is incident
    hosted.assert_not_called()


def test_privacy_mode_blocks_hosted_inference(monkeypatch, incident):
    monkeypatch.setattr(
        investigation,
        "privacy_mode_enabled",
        lambda: True,
    )

    graph = Mock()
    monkeypatch.setattr(workflow, "investigation_graph", graph)

    hosted = Mock()
    monkeypatch.setattr(
        investigation,
        "call_hosted_provider",
        hosted,
    )

    with pytest.raises(PermissionError, match="Local privacy mode"):
        investigation.investigate_incident(
            incident,
            provider="hosted",
            cloud_opt_in=True,
        )

    hosted.assert_not_called()
    graph.invoke.assert_not_called()


def test_hosted_inference_requires_cloud_opt_in(monkeypatch, incident):
    monkeypatch.setattr(
        investigation,
        "privacy_mode_enabled",
        lambda: False,
    )

    graph = Mock()
    monkeypatch.setattr(workflow, "investigation_graph", graph)

    hosted = Mock()
    monkeypatch.setattr(
        investigation,
        "call_hosted_provider",
        hosted,
    )

    with pytest.raises(PermissionError, match="explicit cloud opt-in"):
        investigation.investigate_incident(
            incident,
            provider="hosted",
            cloud_opt_in=False,
        )

    hosted.assert_not_called()
    graph.invoke.assert_not_called()