from contextlib import asynccontextmanager

from fastapi import FastAPI
from app.routers.auth import router as auth_router
from app.database import Base, engine
from app.models import IncidentRecord

from app.routers.incidents import router as incidents_router
from app.routers.health import router as health_router
from app.routers.evaluation import router as evaluations_router
from app.routers.auth import router as auth_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title="IncidentIQ API",
    version="0.1.0",
    lifespan=lifespan,
)


app.include_router(incidents_router)
app.include_router(health_router)
app.include_router(evaluations_router)
app.include_router(auth_router)


@app.get("/api/health")
def health_check():
    return {
        "status": "ok",
        "service": "incidentiq-backend",
    }