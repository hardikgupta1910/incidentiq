import logging
from typing import TypedDict

from langgraph.graph import END, StateGraph

from app.ai.ollama_provider import investigate_with_local_ai
from app.schemas import Incident, InvestigationResult, RetrievedSource, Severity
from app.services.retrieval import retrieve_runbook_context

logger = logging.getLogger(__name__)


class InvestigationState(TypedDict, total=False):
    incident: Incident
    runbook_context: str
    retrieved_sources: list[RetrievedSource]
    analysis_result: InvestigationResult | None
    final_result: InvestigationResult | None
    failure_stage: str | None


def retrieve_evidence_node(state: InvestigationState) -> dict:
    incident = state["incident"]

    relevant_events = [
        event
        for event in incident.events
        if event.severity
        in {Severity.WARNING, Severity.ERROR, Severity.CRITICAL}
    ]

    query = "\n".join(
        event.message
        for event in (relevant_events or incident.events)[:10]
    )

    try:
        if not query.strip():
            return {
                "runbook_context": "",
                "retrieved_sources": [],
                "failure_stage": None,
            }

        context, sources = retrieve_runbook_context(query)

        return {
            "runbook_context": context,
            "retrieved_sources": sources,
            "failure_stage": None,
        }
    except Exception:
        logger.exception(
            "Knowledge retrieval failed for incident %s",
            incident.id,
        )
        return {
            "runbook_context": "",
            "retrieved_sources": [],
            "failure_stage": "retrieval",
        }


def route_after_retrieval(state: InvestigationState) -> str:
    return "fallback" if state.get("failure_stage") else "analyze"


def analyze_node(state: InvestigationState) -> dict:
    incident = state["incident"]

    # Use original parsed events to preserve evidence text and line numbers.
    # This graph supports local Ollama only; it has no cloud-provider branch.
    log_text = "\n".join(
        f"Line {event.line_number}: {event.message}"
        for event in incident.events
    )

    try:
        result = investigate_with_local_ai(
            incident_id=str(incident.id),
            log_text=log_text,
            runbook_context=state.get("runbook_context", ""),
        )

        return {
            "analysis_result": result,
            "failure_stage": None,
        }
    except Exception:
        logger.exception(
            "Local AI inference failed for incident %s",
            incident.id,
        )
        return {
            "analysis_result": None,
            "failure_stage": "inference",
        }


def validate_output_node(state: InvestigationState) -> dict:
    incident = state["incident"]

    if state.get("analysis_result") is None:
        return {
            "final_result": None,
            "failure_stage": state.get("failure_stage") or "validation",
        }

    try:
        candidate = state["analysis_result"]

        # Revalidate even if the provider returned an existing model instance.
        result = InvestigationResult.model_validate(
            candidate.model_dump(mode="json")
        )

        if result.incident_id != incident.id:
            raise ValueError("Result belongs to a different incident.")

        if result.status != "completed":
            raise ValueError("Investigation did not complete.")

        if not result.hypotheses:
            raise ValueError("No hypotheses were returned.")

        ranks = [hypothesis.rank for hypothesis in result.hypotheses]

        if any(rank < 1 for rank in ranks) or len(set(ranks)) != len(ranks):
            raise ValueError("Hypothesis ranks must be positive and unique.")

        original_events = {
            event.line_number: event.message
            for event in incident.events
        }

        for hypothesis in result.hypotheses:
            for evidence in hypothesis.evidence:
                if evidence.source_type != "log":
                    raise ValueError("Incident evidence must reference logs.")

                if evidence.line_number not in original_events:
                    raise ValueError("Evidence references an unknown log line.")

                if evidence.message != original_events[evidence.line_number]:
                    raise ValueError("Evidence text does not match the log.")

        # The application—not the model—sets provenance and retrieved sources.
        result = result.model_copy(
            update={
                "retrieved_sources": state.get("retrieved_sources", []),
                "analysis_source": "local_ai",
            }
        )

        return {
            "final_result": result,
            "failure_stage": None,
        }
    except Exception:
        logger.exception(
            "Local AI output validation failed for incident %s",
            incident.id,
        )
        return {
            "final_result": None,
            "failure_stage": "validation",
        }


def route_after_validation(state: InvestigationState) -> str:
    return "report" if state.get("final_result") is not None else "fallback"


def fallback_node(state: InvestigationState) -> dict:
    # Lazy import avoids a graph/service import cycle.
    from app.services.investigation import investigate_with_rules

    incident = state["incident"]

    logger.warning(
        "Using rule-based fallback for incident %s after %s failure",
        incident.id,
        state.get("failure_stage") or "unknown",
    )

    result = investigate_with_rules(incident).model_copy(
        update={
            "retrieved_sources": state.get("retrieved_sources", []),
            "analysis_source": "rule_based_fallback",
        }
    )

    return {"final_result": result}


def report_node(state: InvestigationState) -> dict:
    result = state.get("final_result")

    if result is None:
        raise RuntimeError("Workflow finished without an investigation result.")

    return {"final_result": result}


def build_investigation_graph():
    graph = StateGraph(InvestigationState)

    graph.add_node("retrieve_evidence", retrieve_evidence_node)
    graph.add_node("analyze", analyze_node)
    graph.add_node("validate_output", validate_output_node)
    graph.add_node("fallback", fallback_node)
    graph.add_node("report", report_node)

    graph.set_entry_point("retrieve_evidence")

    graph.add_conditional_edges(
        "retrieve_evidence",
        route_after_retrieval,
        {
            "analyze": "analyze",
            "fallback": "fallback",
        },
    )

    graph.add_edge("analyze", "validate_output")

    graph.add_conditional_edges(
        "validate_output",
        route_after_validation,
        {
            "report": "report",
            "fallback": "fallback",
        },
    )

    graph.add_edge("fallback", "report")
    graph.add_edge("report", END)

    return graph.compile()


investigation_graph = build_investigation_graph()