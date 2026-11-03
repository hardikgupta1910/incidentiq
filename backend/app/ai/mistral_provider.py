import json
import os
from pathlib import Path

from dotenv import load_dotenv
from openai import OpenAI

from app.ai.ollama_provider import SYSTEM_PROMPT
from app.schemas import InvestigationResult
from app.services.privacy import ensure_provider_allowed


load_dotenv(
    Path(__file__).resolve().parents[2] / ".env"
)


def investigate_with_mistral(
    incident_id: str,
    log_text: str,
    runbook_context: str,
) -> InvestigationResult:
    # Enforce policy before creating a request to an external provider.
    ensure_provider_allowed("mistral")

    api_key = os.getenv("MISTRAL_API_KEY", "").strip()

    if not api_key:
        raise RuntimeError("MISTRAL_API_KEY is not configured.")

    model = os.getenv(
        "MISTRAL_MODEL",
        "mistral-small-latest",
    ).strip()

    schema = json.dumps(
        InvestigationResult.model_json_schema(),
        indent=2,
    )

    prompt = f"""
Return one JSON object matching the supplied schema.

Incident ID:
{incident_id}

SUPPLIED LOGS:
{log_text}

RETRIEVED RUNBOOK CONTEXT:
{runbook_context}

OUTPUT JSON SCHEMA:
{schema}

STRICT RULES:
- Return JSON only, without Markdown fences.
- Set incident_id to the supplied incident ID.
- Set status to "completed".
- Use summary, not description.
- confidence must be between 0.0 and 1.0.
- suggested_checks must be a list of strings.
- Evidence must use source_type="log".
- Cite only original log line numbers supplied in the input.
- Copy the exact original log message into evidence.message.
- Do not treat runbooks as proof of an incident cause.
- Return retrieved_sources as an empty list.
- Return analysis_source as null; the application sets provenance.
"""

    with OpenAI(
        api_key=api_key,
        base_url="https://api.mistral.ai/v1",
        timeout=120.0,
        max_retries=1,
    ) as client:
        response = client.chat.completions.create(
            model=model,
            temperature=0,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
        )

    content = response.choices[0].message.content

    if not content or not content.strip():
        raise ValueError("Mistral returned an empty response.")

    parsed = InvestigationResult.model_validate_json(content)

    if str(parsed.incident_id) != str(incident_id):
        raise ValueError("Mistral returned a different incident ID.")

    if parsed.status != "completed" or not parsed.hypotheses:
        raise ValueError("Mistral returned an incomplete investigation.")

    return parsed.model_copy(
        update={
            "analysis_source": "mistral",
            # Retrieval metadata must not be invented by the model.
            "retrieved_sources": [],
        }
    )