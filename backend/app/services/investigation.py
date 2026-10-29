from app.schemas import (
    EvidenceReference,
    Hypothesis,
    Incident,
    InvestigationResult,
    Severity,
)
import logging
from app.services.ollama_provider import investigate_with_local_ai


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
        and "timeout" in event.message.lower()
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
    )


def investigate_incident(incident:Incident)-> InvestigationResult:
    log_text="\n".join(event.message for event in incident.events)

    try:
        return investigate_with_local_ai(
            incident_id=str(incident.id),
            log_text=log_text)
    except Exception:
        logger.exception(
            "Local AI investigation failed for incident %S; using rule-based fallback",
            incident.id
        )
        return investigate_with_rules(incident)

      