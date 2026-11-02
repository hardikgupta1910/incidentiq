import re


EMAIL_PATTERN = re.compile(
    r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}"
)

IPV4_PATTERN = re.compile(
    r"\b(?:\d{1,3}\.){3}\d{1,3}\b"
)

TOKEN_PATTERN = re.compile(
    r"(?i)\b(?:bearer|token|api[_-]?key|authorization)\s*[:=]\s*\S+"
)

UUID_PATTERN = re.compile(
    r"\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b",
    re.IGNORECASE,
)


def redact_text(text: str) -> str:
    text = TOKEN_PATTERN.sub("[REDACTED_CREDENTIAL]", text)
    text = EMAIL_PATTERN.sub("[REDACTED_EMAIL]", text)
    text = IPV4_PATTERN.sub("[REDACTED_IP]", text)
    text = UUID_PATTERN.sub("[REDACTED_ID]", text)
    return text