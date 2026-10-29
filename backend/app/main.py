from fastapi import FastAPI

from app.routers.incidents import router as incidents_router

app = FastAPI(
    title="IncidentIQ API",
    version="0.1.0",
)

app.include_router(incidents_router)


@app.get("/api/health")
def health_check():
    return {
        "status": "ok",
        "service": "incidentiq-backend",
    }