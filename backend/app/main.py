from fastapi import FastAPI

app = FastAPI(
    title="IncidentIQ API",
    version="0.1.0",
)


@app.get("/api/health")
def health_check():
    return {
        "status": "ok",
        "service": "incidentiq-backend",
    }