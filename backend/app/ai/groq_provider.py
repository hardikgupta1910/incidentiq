import json
import os
import time

from dotenv import load_dotenv
from openai import OpenAI

from app.schemas import InvestigationResult
from app.ai.ollama_provider import SYSTEM_PROMPT


load_dotenv()


def get_groq_client():
    api_key = os.getenv("GROQ_API_KEY")

    if not api_key:
        return None

    return OpenAI(
        api_key=api_key,
        base_url="https://api.groq.com/openai/v1",
    )


def get_groq_model():
    return os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")


def build_groq_user_prompt(
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
- Return only one JSON object.
- Do not return markdown, explanations, or text outside JSON.
- The top-level object must contain exactly these fields:
  incident_id, status, hypotheses, retrieved_sources.
- status must be the string "completed".
- Each hypothesis must contain exactly these fields:
  rank, summary, confidence, evidence, suggested_checks.
- Do not use "description". Use "summary".
- Every evidence item must contain:
  source_type, line_number, source_file, chunk_index, message.
- Every evidence item must use source_type="log".
- Use the exact original log message in evidence.message.
- Use only line numbers that exist in the supplied logs.
- confidence must be a decimal between 0.0 and 1.0.
- suggested_checks must be a list of strings.
"""


def investigate_with_groq(
    incident_id: str,
    log_text: str,
    runbook_context: str,
) -> InvestigationResult:
    client = get_groq_client()

    if client is None:
        raise RuntimeError("GROQ_API_KEY is not configured")

    model = get_groq_model()

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
                "content": build_groq_user_prompt(
                    incident_id,
                    log_text,
                    runbook_context,
                ),
            },
        ],
    )

    content = response.choices[0].message.content or ""
    content = content.strip()

    if not content:
        raise ValueError("Groq model returned empty response")

    model_result = InvestigationResult.model_validate_json(content)

    latency_ms = int((time.perf_counter() - started) * 1000)

    return InvestigationResult(
        incident_id=incident_id,
        status="completed",
        hypotheses=model_result.hypotheses,
        retrieved_sources=model_result.retrieved_sources,
    )