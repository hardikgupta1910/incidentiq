import json
import os
import time

from dotenv import load_dotenv
from openai import OpenAI
from pydantic import ValidationError

from app.schemas import InvestigationResult
from app.ai.ollama_provider import SYSTEM_PROMPT


load_dotenv()


def get_cloudflare_client():
    account_id = os.getenv("CLOUDFLARE_ACCOUNT_ID")
    api_token = os.getenv("CLOUDFLARE_API_TOKEN")

    if not account_id or not api_token:
        return None

    return OpenAI(
        api_key=api_token,
        base_url=(
            f"https://api.cloudflare.com/client/v4/accounts/"
            f"{account_id}/ai/v1"
        ),
    )


def get_cloudflare_model():
    return os.getenv(
        "CLOUDFLARE_WORKERS_AI_MODEL",
        "@cf/meta/llama-3.1-8b-instruct-fp8",
    )


def extract_first_json_object(content: str) -> str:
    """
    Extracts the first complete JSON object from model output.

    This handles cases where a small model returns:
    - JSON with leading/trailing text
    - An array followed by another object
    - Markdown fences
    """
    content = content.strip()

    if content.startswith("```"):
        content = content.strip("`")

        if content.lower().startswith("json"):
            content = content[4:]

    start = content.find("{")

    if start == -1:
        raise ValueError("Model response did not contain a JSON object")

    depth = 0
    in_string = False
    escaped = False

    for index in range(start, len(content)):
        character = content[index]

        if in_string:
            if escaped:
                escaped = False
            elif character == "\\":
                escaped = True
            elif character == '"':
                in_string = False
            continue

        if character == '"':
            in_string = True
        elif character == "{":
            depth += 1
        elif character == "}":
            depth -= 1

            if depth == 0:
                return content[start:index + 1]

    raise ValueError("Model returned incomplete JSON")


def build_cloudflare_user_prompt(
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
- Do not return an array.
- Do not return multiple JSON objects.
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


def investigate_with_cloudflare(
    incident_id: str,
    log_text: str,
    runbook_context: str,
) -> InvestigationResult:
    client = get_cloudflare_client()

    if client is None:
        raise RuntimeError("Cloudflare Workers AI is not configured")

    model = get_cloudflare_model()

    started = time.perf_counter()

    response = client.chat.completions.create(
        model=model,
        temperature=0,
        max_tokens=2000,
        response_format={
            "type": "json_schema",
            "json_schema": InvestigationResult.model_json_schema(),
        },
        messages=[
            {
                "role": "system",
                "content": SYSTEM_PROMPT,
            },
            {
                "role": "user",
                "content": build_cloudflare_user_prompt(
                    incident_id,
                    log_text,
                    runbook_context,
                ),
            },
        ],
    )

    content = response.choices.message.content or ""[0]

    if not content:
        raise ValueError("Cloudflare model returned empty response")

    json_content = extract_first_json_object(content)

    try:
        model_result = InvestigationResult.model_validate_json(json_content)
    except ValidationError:
        raise ValueError(
            "Cloudflare returned JSON that did not match "
            "the InvestigationResult schema"
        )

    latency_ms = int((time.perf_counter() - started) * 1000)

    return InvestigationResult(
        incident_id=incident_id,
        status="completed",
        hypotheses=model_result.hypotheses,
        retrieved_sources=model_result.retrieved_sources,
    )