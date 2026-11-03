from fastapi.testclient import TestClient

from app.main import app
import pytest

pytestmark = pytest.mark.usefixtures("authenticated_engineer")

def test_rejects_unsupported_file_extension():
    with TestClient(app) as client:
        response = client.post(
            "/api/incidents",
            files={
                "file": (
                    "sample.csv",
                    b"timestamp,message\n2026-10-28,example",
                    "text/csv",
                )
            },
        )

    assert response.status_code == 400
    assert response.json() == {
        "detail": "Only .log and .txt files are allowed.",
    }


def test_rejects_file_larger_than_one_mb():
    oversized_content = b"x" * 1_000_001

    with TestClient(app) as client:
        response = client.post(
            "/api/incidents",
            files={
                "file": (
                    "large.log",
                    oversized_content,
                    "text/plain",
                )
            },
        )

    assert response.status_code == 413
    assert response.json() == {
        "detail": "File must be 1 MB or smaller.",
    }

def test_upload_returns_schema_valid_incident():
    log_content = (
        "2026-10-28 20:12:45 INFO service=payment Payment service started\n"
        "2026-10-28 20:13:01 ERROR service=payment Database connection timed out\n"
    )

    with TestClient(app) as client:
        response = client.post(
            "/api/incidents",
            files={
                "file": (
                    "sample.log",
                    log_content.encode("utf-8"),
                    "text/plain",
                )
            },
        )

    assert response.status_code == 201

    body = response.json()

    assert body["status"] == "created"
    assert body["source_filename"] == "sample.log"
    assert body["total_log_lines"] == 2
    assert body["error_count"] == 1
    assert body["investigation"] is None
    assert len(body["events"]) == 2
    assert body["events"][1]["severity"] == "ERROR"