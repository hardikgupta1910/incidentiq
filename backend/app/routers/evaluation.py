import time
from uuid import UUID
from app.auth.security import require_admin
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas import InvestigationResult
from app.storage import get_incident
from app.services.retrieval import retrieve_runbook_context
from app.services.privacy import ensure_provider_allowed, PrivacyViolation

from app.ai.ollama_provider import investigate_with_local_ai
from app.ai.groq_provider import investigate_with_groq
from app.ai.mistral_provider import investigate_with_mistral

router = APIRouter(prefix="/api/evaluations", tags=["Evaluations"])


PROVIDERS = {
    "ollama": investigate_with_local_ai,
    "groq": investigate_with_groq,
    "mistral": investigate_with_mistral,
}


def build_log_text(incident) -> str:
    return "\n".join(event.message for event in incident.events)


def calculate_evidence_coverage(
    result: InvestigationResult,
    total_log_lines: int,
) -> float:
    if not result.hypotheses or total_log_lines == 0:
        return 0.0

    cited_lines = {
        evidence.line_number
        for hypothesis in result.hypotheses
        for evidence in hypothesis.evidence
        if evidence.line_number is not None
    }

    valid_citations = {
        line
        for line in cited_lines
        if 1 <= line <= total_log_lines
    }

    return round(len(valid_citations) / total_log_lines, 4)


def calculate_diagnosis_quality(
    result: InvestigationResult,
    log_text: str,
) -> float:
    score = 0.0

    if result.hypotheses:
        score += 0.4

    hypotheses_text = " ".join(
        hypothesis.summary.lower()
        for hypothesis in result.hypotheses
    )

    log_text_lower = log_text.lower()

    if "timeout" in log_text_lower and (
        "timeout" in hypotheses_text or "connection" in hypotheses_text
    ):
        score += 0.3

    if "500" in log_text_lower and "500" in hypotheses_text:
        score += 0.3

    if any(hypothesis.evidence for hypothesis in result.hypotheses):
        score += 0.2

    return round(min(score, 1.0), 4)


@router.post("")
def run_evaluation(
    incident_id: UUID,
    providers: str = Query(
        default="ollama,groq,mistral",
        description="Comma-separated providers to evaluate",
    ),
    db: Session = Depends(get_db),
    current_user=Depends(require_admin),
):
    incident = get_incident(db, incident_id)

    if incident is None:
        raise HTTPException(
            status_code=404,
            detail="Incident not found.",
        )

    log_text = build_log_text(incident)

    try:
        runbook_context, retrieved_sources = retrieve_runbook_context(
            log_text[:1500]
        )
    except Exception as error:
        raise HTTPException(
            status_code=503,
            detail=f"Runbook retrieval failed: {error}",
        )

    selected_providers = [
        provider.strip().lower()
        for provider in providers.split(",")
        if provider.strip()
    ]

    results = []

    for provider_name in selected_providers:
        if provider_name not in PROVIDERS:
            results.append(
                {
                    "provider": provider_name,
                    "status": "error",
                    "error": "Unknown provider",
                }
            )
            continue

        try:
            ensure_provider_allowed(provider_name)

            started = time.perf_counter()

            result = PROVIDERS[provider_name](
                incident_id=str(incident.id),
                log_text=log_text,
                runbook_context=runbook_context,
            )

            latency_ms = int((time.perf_counter() - started) * 1000)

            results.append(
                {
                    "provider": provider_name,
                    "status": "completed",
                    "latency_ms": latency_ms,
                    "schema_valid": True,
                    "evidence_coverage": calculate_evidence_coverage(
                        result,
                        incident.total_log_lines,
                    ),
                    "diagnosis_quality": calculate_diagnosis_quality(
                        result,
                        log_text,
                    ),
                    "hypothesis_count": len(result.hypotheses),
                    "result": result.model_dump(),
                }
            )

        except PrivacyViolation as error:
            results.append(
                {
                    "provider": provider_name,
                    "status": "blocked",
                    "error": str(error),
                }
            )

        except Exception as error:
            results.append(
                {
                    "provider": provider_name,
                    "status": "error",
                    "error": str(error),
                }
            )

    return {
        "incident_id": str(incident.id),
        "providers": selected_providers,
        "retrieved_source_count": len(retrieved_sources),
        "results": results,
    }