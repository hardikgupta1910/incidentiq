from app.schemas import InvestigationResult, Severity

from typing import TypedDict

from langgraph.graph import StateGraph, END

from app.services.log_parser import parse_logs
from app.services.retrieval import retrieve_runbook_context
from app.services.redaction import redact_text
from app.schemas import InvestigationResult
from app.ai.ollama_provider import investigate_with_local_ai
from app.ai.groq_provider import investigate_with_groq
from app.ai.openrouter_provider import investigate_with_openrouter

class InvestigationState(TypedDict):
    incident_id: str
    raw_log: str
    provider: str
    parsed_events: list
    runbook_context: str
    retrieved_sources: list
    sanitized_log: str
    analysis_result: InvestigationResult | None
    validation_error: str | None
    final_result: InvestigationResult | None


def parse_logs_node(state: InvestigationState) -> InvestigationState:
    state["parsed_events"] = parse_logs(state["raw_log"])
    return state


def retrieve_evidence_node(state: InvestigationState) -> InvestigationState:
    error_lines = [
        event.message
        for event in state["parsed_events"]
        if event.severity in {Severity.WARNING, Severity.ERROR, Severity.CRITICAL}
    ]

    query = "\n".join(error_lines[:10]) or state["raw_log"][:1000]

    context, sources = retrieve_runbook_context(query)

    state["runbook_context"] = context
    state["retrieved_sources"] = sources
    return state


def sanitize_input_node(state: InvestigationState) -> InvestigationState:
    state["sanitized_log"] = redact_text(state["raw_log"])
    return state


def analyze_node(state: InvestigationState) -> InvestigationState:
    provider = state["provider"].lower()

    providers = {
        "ollama": investigate_with_local_ai,
        "groq": investigate_with_groq,
        "openrouter": investigate_with_openrouter,
    }

    if provider not in providers:
        raise ValueError(f"Unknown provider: {provider}")

    result = providers[provider](
        incident_id=state["incident_id"],
        log_text=state["sanitized_log"],
        runbook_context=state["runbook_context"],
    )

    state["analysis_result"] = result
    return state


def validate_output_node(state: InvestigationState) -> InvestigationState:
    result = state.get("analysis_result")

    if result is None:
        state["validation_error"] = "Model returned no result"
        return state

    if not result.hypotheses:
        state["validation_error"] = "Model returned no hypotheses"
        return state

    state["final_result"] = result
    return state


def route_after_validation(state: InvestigationState) -> str:
    if state.get("final_result"):
        return "report"

    return END


def report_node(state: InvestigationState) -> InvestigationState:
    return state


def build_investigation_graph():
    graph = StateGraph(InvestigationState)

    graph.add_node("parse_logs", parse_logs_node)
    graph.add_node("retrieve_evidence", retrieve_evidence_node)
    graph.add_node("sanitize_input", sanitize_input_node)
    graph.add_node("analyze", analyze_node)
    graph.add_node("validate_output", validate_output_node)
    graph.add_node("report", report_node)

    graph.set_entry_point("parse_logs")

    graph.add_edge("parse_logs", "retrieve_evidence")
    graph.add_edge("retrieve_evidence", "sanitize_input")
    graph.add_edge("sanitize_input", "analyze")
    graph.add_edge("analyze", "validate_output")

    graph.add_conditional_edges(
        "validate_output",
        route_after_validation,
        {
            "report": "report",
            END: END,
        },
    )

    graph.add_edge("report", END)

    return graph.compile()


investigation_graph = build_investigation_graph()