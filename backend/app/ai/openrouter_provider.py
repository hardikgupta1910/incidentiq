import json
import os
import time

from dotenv import load_dotenv
from openai import OpenAI

from app.schemas import InvestigationResult
from app.ai.ollama_provider import SYSTEM_PROMPT


load_dotenv()


def get_openrouter_client():
    api_key = os.getenv("OPENROUTER_API_KEY")

    if not api_key:
        return None

    return OpenAI(
        api_key=api_key,
        base_url="https://openrouter.ai/api/v1",
    )


def get_openrouter_model():
    return os.getenv(
        "OPENROUTER_MODEL",
        "meta-llama/llama-3.3-70b-instruct",
    )


def build_openrouter_user_prompt(
    incident_id: str,
    log_text: str,
    runbook_context: str,
) -> str:
    schema = json.dumps(
        InvestigationResult.model_json_schema(),
        indent=2,
    )

    return f"""Incident ID: {incident_id}

SUPPLIED LOGS:
{log_text}

RETRIEVED RUNBOOK CONTEXT:
{runbook_context}

OUTPUT JSON SCHEMA:
{schema}

STRICT OUTPUT RULES:
- Return exactly one JSON object.
- Do not return markdown, explanations, or text outside JSON.
- The top-level object must contain:
  incident_id, status, hypotheses, retrieved_sources.
- status must be "completed".
- Each hypothesis must contain:
  rank, summary, confidence, evidence, suggested_checks.
- Use "summary", not "description".
- Every evidence item must use source_type="log".
- Use only real line numbers from the supplied logs.
- confidence must be a decimal between 0.0 and 1.0.
"""


def investigate_with_openrouter(
    incident_id: str,
    log_text: str,
    runbook_context: str,
) -> InvestigationResult:
    client = get_openrouter_client()

    if client is None:
        raise RuntimeError("OPENROUTER_API_KEY is not configured")

    model = get_openrouter_model()

    started = time.perf_counter()

    response = client.chat.completions.create(
        model=model,
        temperature=0,
        response_format={"type": "json_object"},
        messages=[
            {
                "role": "system",
                "content": SYSTEM_PROMPT,
            },
            {
                "role": "user",
                "content": build_openrouter_user_prompt(
                    incident_id,
                    log_text,
                    runbook_context,
                ),
            },
        ],
    )

    content = response.choices[0].message.content or ""
    content = content.strip()

    if content.startswith("```"):
        content = content.strip("`")

        if content.lower().startswith("json"):
            content = content[4:]

    if not content:
        raise ValueError("OpenRouter model returned empty response")

    model_result = InvestigationResult.model_validate_json(content)

    latency_ms = int((time.perf_counter() - started) * 1000)

    return InvestigationResult(
        incident_id=incident_id,
        status="completed",
        hypotheses=model_result.hypotheses,
        retrieved_sources=model_result.retrieved_sources,
    )