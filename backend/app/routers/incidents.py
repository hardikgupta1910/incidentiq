from fastapi import APIRouter, File, HTTPException, UploadFile, status

from app.schemas import Incident, Severity
from app.services.log_parser import parse_logs
from uuid import UUID
from app.schemas import Incident, InvestigationResult, Severity
from app.services.investigation import investigate_incident
from app.storage import incidents

router =APIRouter(prefix="/api/incidents", tags=["Incidents"])


ALLOWED_EXTENSIONS={".log", ".txt"}
MAX_FILE_SIZE_BYTES=1_000_000


@router.post("", response_model=Incident, status_code=status.HTTP_201_CREATED)

async def create_incident(file: UploadFile=File(...))-> Incident:

    filename=file.filename or""

    if not filename.lower().endswith(tuple(ALLOWED_EXTENSIONS)):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="only .log and .text files are allowed",
        )
    content= await file.read()

    if len(content)>MAX_FILE_SIZE_BYTES:
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

    events=parse_logs(log_content)
    error_count=sum(
        event.severity in {Severity.ERROR, Severity.CRITICAL}
        for event in events
    )

    # return Incident(
    #     title=f"Uploaded incident: {filename}",
    #     source_filename=filename,
    #     total_log_lines=len(events),
    #     error_count=error_count,
    #     events=events,
    #)
    incident = Incident(
        title=f"Uploaded incident: {filename}",
        source_filename=filename,
        total_log_lines=len(events),
        error_count=error_count,
        events=events,
    )

    incidents[incident.id] = incident

    return incident




@router.get("/{incident_id}", response_model=Incident)
def get_incident(incident_id: UUID) -> Incident:
    incident = incidents.get(incident_id)

    if incident is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Incident not found.",
        )

    return incident

@router.post("/{incident_id}/investigate", response_model=InvestigationResult)
def investigate(incident_id: UUID) -> InvestigationResult:
    incident = incidents.get(incident_id)

    if incident is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Incident not found. Upload the log again before investigating.",
        )

    return investigate_incident(incident)