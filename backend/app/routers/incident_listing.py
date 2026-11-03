from datetime import datetime

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.auth.security import get_current_user
from app.database import get_db
from app.models import IncidentRecord


router = APIRouter(
    prefix="/api/incidents",
    tags=["Incidents"],
    dependencies=[Depends(get_current_user)],
)


class IncidentSummary(BaseModel):
    id: str
    title: str
    status: str
    created_at: datetime
    source_filename: str
    total_log_lines: int
    error_count: int


class IncidentListResponse(BaseModel):
    items: list[IncidentSummary]
    total: int
    limit: int
    offset: int


@router.get("", response_model=IncidentListResponse)
def list_incidents(
    search: str = Query(default="", max_length=255),
    status: str | None = Query(default=None, max_length=50),
    limit: int = Query(default=10, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
) -> IncidentListResponse:
    filters = []

    cleaned_search = search.strip()

    if cleaned_search:
        filters.append(
            or_(
                IncidentRecord.title.icontains(
                    cleaned_search,
                    autoescape=True,
                ),
                IncidentRecord.source_filename.icontains(
                    cleaned_search,
                    autoescape=True,
                ),
                IncidentRecord.id.icontains(
                    cleaned_search,
                    autoescape=True,
                ),
            )
        )

    if status:
        filters.append(IncidentRecord.status == status)

    total = db.scalar(
        select(func.count())
        .select_from(IncidentRecord)
        .where(*filters)
    ) or 0

    rows = db.execute(
        select(
            IncidentRecord.id,
            IncidentRecord.title,
            IncidentRecord.status,
            IncidentRecord.created_at,
            IncidentRecord.source_filename,
            IncidentRecord.total_log_lines,
            IncidentRecord.error_count,
        )
        .where(*filters)
        .order_by(
            IncidentRecord.created_at.desc(),
            IncidentRecord.id.desc(),
        )
        .offset(offset)
        .limit(limit)
    ).mappings().all()

    return IncidentListResponse(
        items=[
            IncidentSummary(**dict(row))
            for row in rows
        ],
        total=total,
        limit=limit,
        offset=offset,
    )