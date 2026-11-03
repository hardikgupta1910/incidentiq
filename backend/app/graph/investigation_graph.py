import logging
from typing import TypedDict

from langgraph.graph import END, StateGraph

from app.ai.ollama_provider import investigate_with_local_ai
from app.schemas import Incident, InvestigationResult, RetrievedSource, Severity
from app.services.privacy import ensure_provider_allowed
from app.services.retrieval import retrieve_runbook_context

logger = logging.getLogger(__name__)


class InvestigationState(TypedDict, total=False):
    incident: Incident
    provider: str
    cloud_opt_in: bool
    runbook_context: str
    retrieved_sources: list[RetrievedSource]
    analysis_result: InvestigationResult | None
    final_result: InvestigationResult | None
    failure_stage: str | None


def authorize_node(state):
    provider = state.get("provider", "ollama")

    if provider not in {"ollama", "groq", "mistral"}:
        raise ValueError("Unknown investigation provider.")

    if provider != "ollama":
        ensure_provider_allowed(provider)

        if not state.get("cloud_opt_in", False):
            raise PermissionError(
                "Cloud investigation requires explicit confirmation."
            )

    return {"provider": provider}


def retrieve_evidence_node(state):
    incident = state["incident"]
    relevant = [
        event
        for event in incident.events
        if event.severity
        in {Severity.WARNING, Severity.ERROR, Severity.CRITICAL}
    ]
    query = "\n".join(
        event.message for event in (relevant or incident.events)[:10]
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
        logger.exception("Retrieval failed for incident %s", incident.id)

        if state["provider"] != "ollama":
            raise RuntimeError(
                "Ollama embedding or Qdrant retrieval failed. "
                "The selected cloud provider was not called."
            ) from None

        return {
            "runbook_context": "",
            "retrieved_sources": [],
            "failure_stage": "retrieval",
        }


def route_after_retrieval(state):
    return "fallback" if state.get("failure_stage") else "analyze"


def analyze_node(state):
    incident = state["incident"]
    provider = state["provider"]

    if provider == "ollama":
        adapter = investigate_with_local_ai
    else:
        # Recheck policy immediately before cloud inference.
        ensure_provider_allowed(provider)

        if provider == "groq":
            from app.ai.groq_provider import investigate_with_groq
            adapter = investigate_with_groq
        else:
            from app.ai.mistral_provider import investigate_with_mistral
            adapter = investigate_with_mistral

    log_text = "\n".join(
        f"Line {event.line_number}: {event.message}"
        for event in incident.events
    )

    try:
        result = adapter(
            incident_id=str(incident.id),
            log_text=log_text,
            runbook_context=state.get("runbook_context", ""),
        )
        return {"analysis_result": result, "failure_stage": None}
    except Exception:
        logger.exception(
            "Provider %s failed for incident %s", provider, incident.id
        )

        if provider != "ollama":
            raise RuntimeError(
                f"{provider.title()} investigation failed. "
                "Check backend logs and provider configuration. "
                "No other analysis provider was called."
            ) from None

        return {"analysis_result": None, "failure_stage": "inference"}


def validate_output_node(state):
    incident = state["incident"]

    if state.get("analysis_result") is None:
        return {
            "final_result": None,
            "failure_stage": state.get("failure_stage") or "validation",
        }

    try:
        result = InvestigationResult.model_validate(
            state["analysis_result"].model_dump(mode="json")
        )

        if result.incident_id != incident.id:
            raise ValueError("Incorrect incident ID.")

        if result.status != "completed" or not result.hypotheses:
            raise ValueError("Incomplete investigation.")

        ranks = [item.rank for item in result.hypotheses]
        if any(rank < 1 for rank in ranks) or len(set(ranks)) != len(ranks):
            raise ValueError("Invalid hypothesis ranks.")

        original = {
            event.line_number: event.message
            for event in incident.events
        }

        for hypothesis in result.hypotheses:
            for evidence in hypothesis.evidence:
                if evidence.source_type != "log":
                    raise ValueError("Evidence must reference logs.")
                if evidence.line_number not in original:
                    raise ValueError("Unknown evidence line.")
                if evidence.message != original[evidence.line_number]:
                    raise ValueError("Evidence text does not match the log.")

        provider = state["provider"]

        return {
            "final_result": result.model_copy(
                update={
                    "retrieved_sources": state.get("retrieved_sources", []),
                    "analysis_source": (
                        "local_ai" if provider == "ollama" else provider
                    ),
                    "requested_provider": provider,
                }
            ),
            "failure_stage": None,
        }
    except Exception:
        logger.exception(
            "Provider output validation failed for incident %s",
            incident.id,
        )

        if state["provider"] != "ollama":
            raise RuntimeError(
                "The selected cloud provider returned invalid evidence "
                "or an invalid result. No other provider was called."
            ) from None

        return {"final_result": None, "failure_stage": "validation"}


def route_after_validation(state):
    return "report" if state.get("final_result") is not None else "fallback"


def fallback_node(state):
    from app.services.investigation import investigate_with_rules

    logger.warning(
        "Local rule fallback for incident %s after %s",
        state["incident"].id,
        state.get("failure_stage"),
    )

    result = investigate_with_rules(state["incident"]).model_copy(
        update={
            "retrieved_sources": state.get("retrieved_sources", []),
            "analysis_source": "rule_based_fallback",
            "requested_provider": state["provider"],
        }
    )
    return {"final_result": result}


def report_node(state):
    if state.get("final_result") is None:
        raise RuntimeError("Workflow returned no result.")
    return {"final_result": state["final_result"]}


def build_investigation_graph():
    graph = StateGraph(InvestigationState)

    graph.add_node("authorize", authorize_node)
    graph.add_node("retrieve_evidence", retrieve_evidence_node)
    graph.add_node("analyze", analyze_node)
    graph.add_node("validate_output", validate_output_node)
    graph.add_node("fallback", fallback_node)
    graph.add_node("report", report_node)

    graph.set_entry_point("authorize")
    graph.add_edge("authorize", "retrieve_evidence")

    graph.add_conditional_edges(
        "retrieve_evidence",
        route_after_retrieval,
        {"analyze": "analyze", "fallback": "fallback"},
    )

    graph.add_edge("analyze", "validate_output")

    graph.add_conditional_edges(
        "validate_output",
        route_after_validation,
        {"report": "report", "fallback": "fallback"},
    )

    graph.add_edge("fallback", "report")
    graph.add_edge("report", END)

    return graph.compile()


investigation_graph = build_investigation_graph()