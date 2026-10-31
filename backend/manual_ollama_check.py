from app.services.ollama_provider import investigate_with_local_ai

log_text = """\
2026-10-28 20:12:45 INFO service=payment Payment service started
2026-10-28 20:12:50 WARNING service=payment Database connection pool is high
2026-10-28 20:13:01 ERROR service=payment Database connection timed out
2026-10-28 20:13:05 ERROR service=payment Database connection timed out
"""

result = investigate_with_local_ai(
    incident_id="test-incident-001",
    log_text=log_text,
)

print(result.model_dump_json(indent=2))