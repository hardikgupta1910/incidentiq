import re
from datetime import datetime
from typing import Optional

from app.schemas import LogEvent, Severity


TIMESTAMP_PATTERN=re.compile(r"(?P<timestamp>\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2})")

SEVERITY_PATTERN = re.compile(
    r"\b(?P<severity>DEBUG|INFO|WARNING|WARN|ERROR|CRITICAL|FATAL)\b",
    re.IGNORECASE,
)

SERVICE_PATTERN = re.compile(
    r"(?:service|app|application)[=:]\s*(?P<service>[\w-]+)",
    re.IGNORECASE,
)




def parse_timestamp(value:str)-> Optional[datetime]:
    try:
        return datetime.fromisoformat(value.replace(" ","T"))
    except ValueError:
        return None


def parse_severity(line: str) -> Severity:
    match = SEVERITY_PATTERN.search(line)

    if not match:
        return Severity.INFO

    value = match.group("severity").upper()

    if value == "WARN":
        return Severity.WARNING

    if value == "FATAL":
        return Severity.CRITICAL

    return Severity(value)


def parse_service(line: str) -> Optional[str]:
    match = SERVICE_PATTERN.search(line)
    return match.group("service") if match else None
        


def parse_logs(log_content:str)->list[LogEvent]:
    events: list[LogEvent]=[]

    for line_number, raw_line in enumerate(log_content.splitlines(), start=1):
        line=raw_line.strip()

        if not line:
            continue

        timestamp_match=TIMESTAMP_PATTERN.search(line)
        timestamp=(
            parse_timestamp(timestamp_match.group("timestamp"))
            if timestamp_match
            else None
        )

        events.append(
            LogEvent(
                line_number=line_number,
                timestamp=timestamp,
                severity=parse_severity(line),
                service=parse_service(line),
                message=line

            )
        )

    return events