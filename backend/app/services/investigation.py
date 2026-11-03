from app.schemas import (
    EvidenceReference,
    Hypothesis,
    Incident,
    InvestigationResult,
    Severity,
)
import logging
from app.ai.ollama_provider import investigate_with_local_ai
from app.services.retrieval import retrieve_runbook_context
from app.services.privacy import privacy_mode_enabled


def call_hosted_provider(*args, **kwargs):
    raise NotImplementedError(
        "Hosted model adapters are not configured yet."
    )

logger = logging.getLogger(__name__)
def investigate_with_rules(incident: Incident) -> InvestigationResult:
    error_events = [
        event
        for event in incident.events
        if event.severity in {Severity.ERROR, Severity.CRITICAL}
    ]

    database_timeout_events = [
        event
        for event in error_events
        if "database" in event.message.lower()
        and any(
            phrase in event.message.lower()
            for phrase in ("timeout", "timed out")
        )
    ]

    hypotheses: list[Hypothesis] = []

    if database_timeout_events:
        evidence = [
            EvidenceReference(
                source_type="log",
                line_number=event.line_number,
                message=event.message,
            )
            for event in database_timeout_events[:3]
        ]

        hypotheses.append(
            Hypothesis(
                rank=1,
                summary=(
                    "The affected service may have database connectivity "
                    "or connection-pool exhaustion."
                ),
                confidence=0.75,
                evidence=evidence,
                suggested_checks=[
                    "Check database health and active connection count.",
                    "Check the payment service connection-pool usage and limits.",
                    "Inspect network connectivity between the payment service and database.",
                ],
            )
        )

    if not hypotheses and error_events:
        evidence = [
            EvidenceReference(
                source_type="log",
                line_number=event.line_number,
                message=event.message,
            )
            for event in error_events[:3]
        ]

        hypotheses.append(
            Hypothesis(
                rank=1,
                summary=(
                    "The service has repeated errors, but the current log "
                    "evidence is insufficient to identify a specific cause."
                ),
                confidence=0.35,
                evidence=evidence,
                suggested_checks=[
                    "Review the full stack traces around the error events.",
                    "Check recent deployments and configuration changes.",
                    "Inspect dependency health for the affected service.",
                ],
            )
        )

    if not hypotheses:
        hypotheses.append(
            Hypothesis(
                rank=1,
                summary="No error-level events were found in the uploaded log.",
                confidence=0.1,
                evidence=[],
                suggested_checks=[
                    "Upload a log window that includes the incident period.",
                    "Check metrics and service health for abnormal behavior.",
                ],
            )
        )

    return InvestigationResult(
        incident_id=incident.id,
        status="completed",
        hypotheses=hypotheses,
        analysis_source="rule_based_fallback",
    )

def investigate_incident(
    incident: Incident,
    *,
    provider: str = "local",
    cloud_opt_in: bool = False,
) -> InvestigationResult:
    if provider not in {"local", "hosted"}:
        raise ValueError("Provider must be 'local' or 'hosted'.")

    # Keep the existing hosted-provider restrictions.
    if provider == "hosted":
        if privacy_mode_enabled():
            raise PermissionError(
                "Local privacy mode is enabled. "
                "Hosted provider inference is not allowed."
            )

        if not cloud_opt_in:
            raise PermissionError(
                "Hosted inference requires explicit cloud opt-in."
            )

        return call_hosted_provider(incident=incident)

    # Import here to avoid a graph/service import cycle.
    from app.graph.investigation_graph import investigation_graph

    state = investigation_graph.invoke(
        {
            "incident": incident,
            "runbook_context": "",
            "retrieved_sources": [],
            "analysis_result": None,
            "final_result": None,
            "failure_stage": None,
        }
    )

    result = state.get("final_result")

    if not isinstance(result, InvestigationResult):
        raise RuntimeError(
            "Investigation workflow returned an invalid final result."
        )

    return result