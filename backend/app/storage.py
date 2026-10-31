from uuid import UUID

from sqlalchemy.orm import Session

from app.models import IncidentRecord
from app.schemas import Incident
from app.schemas import InvestigationResult


def create_incident(db: Session, incident: Incident) -> Incident:
    record = IncidentRecord(
        id=str(incident.id),
        title=incident.title,
        status=incident.status,
        created_at=incident.created_at,
        source_filename=incident.source_filename,
        total_log_lines=incident.total_log_lines,
        error_count=incident.error_count,
        events=[
            event.model_dump(mode="json")
            for event in incident.events
        ],
        investigation=(
            incident.investigation.model_dump(mode="json")
            if incident.investigation is not None
            else None
        ),
    )

    try:
        db.add(record)
        db.commit()
        db.refresh(record)
    except:
        db.rollback()
        raise

    return incident


def get_incident(db: Session, incident_id: UUID) -> Incident | None:
    record = db.get(IncidentRecord, str(incident_id))

    if record is None:
        return None

    return Incident(
        id=UUID(record.id),
        title=record.title,
        status=record.status,
        created_at=record.created_at,
        source_filename=record.source_filename,
        total_log_lines=record.total_log_lines,
        error_count=record.error_count,
        events=record.events,
        investigation=record.investigation,
    )



def save_investigation(db:Session, incident_id:UUID, result:InvestigationResult)->None:
    record=db.get(IncidentRecord, str(incident_id))

    if record is None:
        return


    record.investigation=result.model_dump(mode="json")
    record.status="completed"

    try:
        db.commit()
    except Exception:
        db.rollback()
        raise