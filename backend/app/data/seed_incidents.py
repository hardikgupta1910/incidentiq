from app.schemas import Incident, LogEvent, Severity


def database_connection_incident() -> Incident:
    events = [
        LogEvent(
            line_number=1,
            timestamp=None,
            severity=Severity.INFO,
            service="payment",
            message="Payment service started",
        ),
        LogEvent(
            line_number=2,
            timestamp=None,
            severity=Severity.WARNING,
            service="payment",
            message="Database connection pool is high",
        ),
        LogEvent(
            line_number=3,
            timestamp=None,
            severity=Severity.ERROR,
            service="payment",
            message="Database connection timed out",
        ),
    ]

    return Incident(
        title="Seeded: Database connection failures",
        source_filename="seeded-database-connection.log",
        total_log_lines=len(events),
        error_count=1,
        events=events,
    )


SEED_INCIDENTS = [
    database_connection_incident(),
]