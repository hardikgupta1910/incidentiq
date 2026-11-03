from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, Query, Response, UploadFile
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.auth.security import get_current_user, require_admin
from app.database import get_db
from app.models_knowledge import KnowledgeDocumentRecord
from app.services.knowledge import MAX_BYTES, create_document, delete_document, ingest_document

router = APIRouter(prefix="/api/knowledge/documents", tags=["Knowledge Base"])


class DocumentSummary(BaseModel):
    id: str
    filename: str
    file_type: str
    size_bytes: int
    created_at: datetime
    status: str
    chunk_count: int
    error: str | None


class DocumentPage(BaseModel):
    items: list[DocumentSummary]
    total: int
    limit: int
    offset: int


def summary(record):
    return DocumentSummary(
        id=record.id, filename=record.filename, file_type=record.file_type,
        size_bytes=record.size_bytes,
        created_at=record.created_at.replace(tzinfo=timezone.utc),
        status=record.status, chunk_count=record.chunk_count, error=record.error,
    )


@router.get("", response_model=DocumentPage)
def list_documents(
    search: str = Query(default="", max_length=255),
    status: str | None = Query(default=None, max_length=30),
    limit: int = Query(default=10, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db), current_user=Depends(get_current_user),
):
    model = KnowledgeDocumentRecord
    filters = []
    if search.strip():
        filters.append(model.filename.icontains(search.strip(), autoescape=True))
    if status:
        filters.append(model.status == status)
    total = db.scalar(select(func.count()).select_from(model).where(*filters)) or 0
    columns = (model.id, model.filename, model.file_type, model.size_bytes,
               model.created_at, model.status, model.chunk_count, model.error)
    rows = db.execute(select(*columns).where(*filters)
        .order_by(model.created_at.desc(), model.id.desc()).offset(offset).limit(limit)).all()
    return DocumentPage(items=[summary(row) for row in rows], total=total, limit=limit, offset=offset)


@router.post("", response_model=DocumentSummary, status_code=201)
def upload_document(
    file: UploadFile = File(...), db: Session = Depends(get_db),
    current_user=Depends(require_admin),
):
    content = file.file.read(MAX_BYTES + 1)
    if len(content) > MAX_BYTES:
        raise HTTPException(status_code=413, detail="File must be 5,000,000 bytes or smaller.")
    try:
        record = create_document(db, file.filename or "", content)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    except HTTPException:
        raise
    except Exception as error:
        db.rollback()
        raise HTTPException(status_code=400, detail="Unable to read this document. Use a valid text-based PDF or UTF-8 Markdown/text file.") from error
    return summary(record)


@router.post("/{document_id}/retry", response_model=DocumentSummary)
def retry_document(document_id: UUID, db: Session = Depends(get_db), current_user=Depends(require_admin)):
    return summary(ingest_document(db, str(document_id)))


@router.delete("/{document_id}", status_code=204)
def remove_document(document_id: UUID, db: Session = Depends(get_db), current_user=Depends(require_admin)):
    delete_document(db, str(document_id))
    return Response(status_code=204)
