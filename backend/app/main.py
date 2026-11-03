from contextlib import asynccontextmanager
from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI
from app.routers.auth import router as auth_router
from app.database import Base, engine
from app.models import IncidentRecord
from app.routers.incident_listing import router as incident_listing_router
from app.routers.incidents import router as incidents_router
from app.routers.health import router as health_router
from app.routers.evaluation import router as evaluations_router
from app.routers.auth import router as auth_router
from app.routers.privacy import router as privacy_router
@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title="IncidentIQ API",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


app.include_router(incidents_router)
app.include_router(incident_listing_router)
app.include_router(health_router)
app.include_router(evaluations_router)
app.include_router(privacy_router)
app.include_router(auth_router)


@app.get("/api/health")
def health_check():
    return {
        "status": "ok",
        "service": "incidentiq-backend",
    }