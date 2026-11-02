from uuid import UUID
from app.auth.security import get_current_user
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session
from app.auth.security import get_current_user
from app.database import get_db
from app.schemas import Incident, InvestigationResult, Severity
from app.services.investigation import investigate_incident
from app.services.log_parser import parse_logs
from app.storage import create_incident, get_incident, save_investigation
from app.data.seed_incidents import (
    SEED_INCIDENTS,
    database_connection_incident,
)
router = APIRouter(
    prefix="/api/incidents",
    tags=["Incidents"],
    dependencies=[Depends(get_current_user)],
)
ALLOWED_EXTENSIONS = {".log", ".txt"}
MAX_FILE_SIZE_BYTES = 1_000_000


@router.post("", response_model=Incident, status_code=status.HTTP_201_CREATED)
async def create_incident_route(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
) -> Incident:
    filename = file.filename or ""

    if not filename.lower().endswith(tuple(ALLOWED_EXTENSIONS)):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only .log and .txt files are allowed.",
        )

    content = await file.read()

    if len(content) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File must be 1 MB or smaller.",
        )

    try:
        log_content = content.decode("utf-8")
    except UnicodeDecodeError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be UTF-8 encoded text.",
        ) from error

    events = parse_logs(log_content)

    error_count = sum(
        event.severity in {Severity.ERROR, Severity.CRITICAL}
        for event in events
    )

    incident = Incident(
        title=f"Uploaded incident: {filename}",
        source_filename=filename,
        total_log_lines=len(events),
        error_count=error_count,
        events=events,
    )

    return create_incident(db, incident)


@router.get("/seed", response_model=list[Incident])
def list_seed_incidents():
    return SEED_INCIDENTS


@router.post(
    "/seed/{scenario_key}",
    response_model=Incident,
    status_code=status.HTTP_201_CREATED,
)
def create_seed_incident(
    scenario_key: str,
    db: Session = Depends(get_db),
) -> Incident:
    if scenario_key != "database-connection":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Seed scenario not found.",
        )

    incident = database_connection_incident()

    return create_incident(db, incident)



@router.get("/{incident_id}", response_model=Incident)
def get_incident_route(incident_id: UUID,db: Session = Depends(get_db),) -> Incident:
    
    incident = get_incident(db, incident_id)

    if incident is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Incident not found.",
        )

    return incident


@router.post(
    "/{incident_id}/investigate",
    response_model=InvestigationResult,
)
def investigate(
    incident_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
) -> InvestigationResult:
    incident = get_incident(db, incident_id)

    if incident is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Incident not found. Upload the log again before investigating.",
        )

    result = investigate_incident(incident)


    save_investigation(
        db=db,
        incident_id=incident_id,
        result=result
    )

    return result


