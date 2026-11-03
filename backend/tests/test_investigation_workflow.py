from unittest.mock import Mock

import pytest

from app.graph import investigation_graph as workflow
from app.schemas import (
    EvidenceReference,
    Hypothesis,
    Incident,
    InvestigationResult,
    LogEvent,
    RetrievedSource,
    Severity,
)
from app.services.investigation import investigate_incident


@pytest.fixture
def incident():
    return Incident(
        title="Workflow test",
        source_filename="workflow.log",
        total_log_lines=1,
        error_count=1,
        events=[
            LogEvent(
                line_number=7,
                severity=Severity.ERROR,
                message="Database connection timed out",
            )
        ],
    )


def make_result(incident, line_number=7):
    return InvestigationResult(
        incident_id=incident.id,
        status="completed",
        hypotheses=[
            Hypothesis(
                rank=1,
                summary="Database connectivity may be degraded.",
                confidence=0.4,
                evidence=[
                    EvidenceReference(
                        source_type="log",
                        line_number=line_number,
                        message="Database connection timed out",
                    )
                ],
                suggested_checks=["Check database connectivity."],
            )
        ],
        retrieved_sources=[],
        # A model-supplied provenance value must not be authoritative.
        analysis_source="rule_based_fallback",
    )


def test_local_ai_success_preserves_sources_and_line_numbers(
    monkeypatch, incident
):
    source = RetrievedSource(
        source_file="database.md",
        chunk_index=2,
        score=0.7,
        text="Check database connectivity.",
    )

    monkeypatch.setattr(
        workflow,
        "retrieve_runbook_context",
        Mock(return_value=("Runbook context", [source])),
    )
    ai = Mock(return_value=make_result(incident))
    monkeypatch.setattr(workflow, "investigate_with_local_ai", ai)

    result = investigate_incident(incident)

    assert result.analysis_source == "local_ai"
    assert result.retrieved_sources == [source]
    assert result.hypotheses[0].evidence[0].line_number == 7
    assert "Line 7: Database connection timed out" in (
        ai.call_args.kwargs["log_text"]
    )


def test_ai_failure_uses_labeled_fallback(monkeypatch, incident):
    monkeypatch.setattr(
        workflow,
        "retrieve_runbook_context",
        Mock(return_value=("", [])),
    )
    monkeypatch.setattr(
        workflow,
        "investigate_with_local_ai",
        Mock(side_effect=RuntimeError("Simulated inference failure")),
    )

    result = investigate_incident(incident)

    assert result.analysis_source == "rule_based_fallback"
    assert result.incident_id == incident.id
    assert result.hypotheses


def test_invented_evidence_line_uses_fallback(monkeypatch, incident):
    monkeypatch.setattr(
        workflow,
        "retrieve_runbook_context",
        Mock(return_value=("", [])),
    )
    monkeypatch.setattr(
        workflow,
        "investigate_with_local_ai",
        Mock(return_value=make_result(incident, line_number=999)),
    )

    result = investigate_incident(incident)

    assert result.analysis_source == "rule_based_fallback"
    assert all(
        evidence.line_number != 999
        for hypothesis in result.hypotheses
        for evidence in hypothesis.evidence
    )


def test_retrieval_failure_skips_ai(monkeypatch, incident):
    monkeypatch.setattr(
        workflow,
        "retrieve_runbook_context",
        Mock(side_effect=RuntimeError("Simulated retrieval failure")),
    )
    ai = Mock()
    monkeypatch.setattr(workflow, "investigate_with_local_ai", ai)

    result = investigate_incident(incident)

    assert result.analysis_source == "rule_based_fallback"
    assert result.retrieved_sources == []
    ai.assert_not_called()


def test_privacy_blocks_hosted_inference(monkeypatch, incident):
    from app.services import investigation

    monkeypatch.setattr(
        investigation, "privacy_mode_enabled", lambda: True
    )
    hosted = Mock()
    monkeypatch.setattr(
        investigation, "call_hosted_provider", hosted
    )

    with pytest.raises(PermissionError, match="Local privacy mode"):
        investigate_incident(
            incident,
            provider="hosted",
            cloud_opt_in=True,
        )

    hosted.assert_not_called()