from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.auth.security import get_current_user
from app.database import get_db
from app.models import IncidentRecord, InvestigationHistoryRecord
from app.schemas import InvestigationResult

router = APIRouter(
    prefix="/api/investigations",
    tags=["Investigation History"],
    dependencies=[Depends(get_current_user)],
)


class HistorySummary(BaseModel):
    id: str
    incident_id: str
    incident_title: str
    status: str
    recorded_at: datetime


class HistoryPage(BaseModel):
    items: list[HistorySummary]
    total: int
    limit: int
    offset: int


class HistoryDetail(HistorySummary):
    result: InvestigationResult


def summary(record, title):
    return dict(
        id=record.id,
        incident_id=record.incident_id,
        incident_title=title,
        status=record.status,
        recorded_at=record.recorded_at.replace(tzinfo=timezone.utc),
    )


@router.get("", response_model=HistoryPage)
def list_history(
    search: str = Query(default="", max_length=255),
    incident_id: UUID | None = None,
    limit: int = Query(default=10, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
):
    history = InvestigationHistoryRecord
    filters = []
    if incident_id is not None:
        filters.append(history.incident_id == str(incident_id))
    if search.strip():
        filters.append(or_(
            IncidentRecord.title.icontains(search.strip(), autoescape=True),
            history.incident_id.icontains(search.strip(), autoescape=True),
            history.id.icontains(search.strip(), autoescape=True),
        ))

    total = db.scalar(
        select(func.count()).select_from(history)
        .join(IncidentRecord, IncidentRecord.id == history.incident_id)
        .where(*filters)
    ) or 0

    rows = db.execute(
        select(
            history.id, history.incident_id, history.status,
            history.recorded_at, IncidentRecord.title,
        )
        .join(IncidentRecord, IncidentRecord.id == history.incident_id)
        .where(*filters)
        .order_by(history.recorded_at.desc(), history.id.desc())
        .offset(offset).limit(limit)
    ).all()

    return HistoryPage(
        items=[HistorySummary(**summary(row, row.title)) for row in rows],
        total=total, limit=limit, offset=offset,
    )


@router.get("/{investigation_id}", response_model=HistoryDetail)
def read_history(investigation_id: UUID, db: Session = Depends(get_db)):
    row = db.execute(
        select(InvestigationHistoryRecord, IncidentRecord.title)
        .join(IncidentRecord, IncidentRecord.id == InvestigationHistoryRecord.incident_id)
        .where(InvestigationHistoryRecord.id == str(investigation_id))
    ).first()
    if row is None:
        raise HTTPException(status_code=404, detail="Investigation not found.")
    record, title = row
    return HistoryDetail(**summary(record, title), result=record.result)
