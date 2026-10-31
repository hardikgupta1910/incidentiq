from app.schemas import Severity
from app.services.log_parser import parse_logs


def test_parse_logs_extracts_fields_and_severity():
    log_content = (
        "2026-10-28 20:12:45 INFO service=payment Payment service started\n"
        "2026-10-28 20:13:01 ERROR service=payment Database connection timed out\n"
    )

    events = parse_logs(log_content)

    assert len(events) == 2

    assert events[0].line_number == 1
    assert events[0].severity == Severity.INFO
    assert events[0].service == "payment"

    assert events[1].line_number == 2
    assert events[1].severity == Severity.ERROR
    assert events[1].service == "payment"
    assert events[1].message.endswith("Database connection timed out")