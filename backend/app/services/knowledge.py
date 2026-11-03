import logging
from datetime import datetime, timezone
from io import BytesIO
from pathlib import Path
from uuid import NAMESPACE_URL, uuid5

from fastapi import HTTPException
from pypdf import PdfReader
from qdrant_client import models
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models_knowledge import KnowledgeDocumentRecord
from app.services.retrieval import (
    COLLECTION_NAME, EMBEDDING_MODEL, ollama_client, qdrant_client,
)

logger = logging.getLogger(__name__)
MAX_BYTES = 5_000_000
MAX_TEXT_CHARS = 200_000
MAX_CHUNKS = 256


def split_document(text: str) -> list[str]:
    chunks = []
    for paragraph in text.split("\n\n"):
        paragraph = paragraph.strip()
        for start in range(0, len(paragraph), 1200):
            part = paragraph[start:start + 1200].strip()
            if part:
                chunks.append(part)
    if not chunks:
        raise ValueError("The document contains no extractable text.")
    if len(chunks) > MAX_CHUNKS:
        raise ValueError("Document produces too many chunks; split it into smaller documents.")
    return chunks


def extract_document(filename: str, content: bytes) -> tuple[str, str]:
    suffix = Path(filename).suffix.lower()
    if suffix not in {".pdf", ".md", ".txt"}:
        raise ValueError("Only PDF, Markdown (.md), and UTF-8 text files are supported.")
    if not content:
        raise ValueError("The file is empty.")
    if len(content) > MAX_BYTES:
        raise ValueError("File must be 5,000,000 bytes or smaller.")
    if suffix == ".pdf":
        reader = PdfReader(BytesIO(content))
        if reader.is_encrypted:
            raise ValueError("Encrypted PDFs are not supported.")
        if len(reader.pages) > 100:
            raise ValueError("PDF must contain no more than 100 pages.")
        parts = []
        count = 0
        for page in reader.pages:
            part = page.extract_text() or ""
            count += len(part) + 2
            if count > MAX_TEXT_CHARS:
                raise ValueError("Extracted text exceeds 200,000 characters.")
            parts.append(part)
        text = "\n\n".join(parts)
    else:
        text = content.decode("utf-8-sig")
    if len(text) > MAX_TEXT_CHARS:
        raise ValueError("Extracted text exceeds 200,000 characters.")
    split_document(text)
    return suffix.lstrip("."), text


def document_filter(document_id: str):
    return models.Filter(must=[models.FieldCondition(
        key="document_id", match=models.MatchValue(value=document_id)
    )])


def get_locked(db: Session, document_id: str):
    record = db.scalar(select(KnowledgeDocumentRecord)
                       .where(KnowledgeDocumentRecord.id == document_id)
                       .with_for_update())
    if record is None:
        raise HTTPException(status_code=404, detail="Document not found.")
    return record


def ingest_document(db: Session, document_id: str):
    record = get_locked(db, document_id)
    try:
        chunks = split_document(record.content["text"])
        record.status = "processing"
        record.error = None
        db.flush()
        for start in range(0, len(chunks), 16):
            batch = chunks[start:start + 16]
            response = ollama_client.embeddings.create(model=EMBEDDING_MODEL, input=batch)
            vectors = {item.index: item.embedding for item in response.data}
            if set(vectors) != set(range(len(batch))):
                raise ValueError("Embedding response does not match requested chunks.")
            points = [models.PointStruct(
                id=str(uuid5(NAMESPACE_URL, f"incidentiq-document:{record.id}:{start + index}")),
                vector=vectors[index],
                payload={
                    "document_id": record.id,
                    "source_type": "runbook",
                    "source_file": record.filename,
                    "chunk_index": start + index,
                    "text": text,
                },
            ) for index, text in enumerate(batch)]
            qdrant_client.upsert(collection_name=COLLECTION_NAME, points=points, wait=True)
        record.status = "indexed"
        record.chunk_count = len(chunks)
        record.error = None
        db.commit()
    except Exception:
        logger.exception("Knowledge ingestion failed for document_id=%s", document_id)
        db.rollback()
        try:
            qdrant_client.delete(
                collection_name=COLLECTION_NAME,
                points_selector=models.FilterSelector(filter=document_filter(document_id)),
                wait=True,
            )
        except Exception:
            logger.exception("Partial vector cleanup failed for document_id=%s", document_id)
        record = get_locked(db, document_id)
        record.status = "failed"
        record.chunk_count = 0
        record.error = "Indexing failed. Check backend logs, Ollama embeddings, and the Qdrant runbooks collection, then retry."
        db.commit()
    return record


def create_document(db: Session, filename: str, content: bytes):
    filename = filename.replace("\\", "/").rsplit("/", 1)[-1].strip()
    if not filename or len(filename) > 255:
        raise ValueError("Filename must contain between 1 and 255 characters.")
    kind, text = extract_document(filename, content)
    record = KnowledgeDocumentRecord(
        filename=filename, file_type=kind, size_bytes=len(content),
        created_at=datetime.now(timezone.utc).replace(tzinfo=None),
        status="uploaded", chunk_count=0, content={"text": text},
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return ingest_document(db, record.id)


def delete_document(db: Session, document_id: str):
    record = get_locked(db, document_id)
    try:
        qdrant_client.delete(
            collection_name=COLLECTION_NAME,
            points_selector=models.FilterSelector(filter=document_filter(record.id)),
            wait=True,
        )
        db.delete(record)
        db.commit()
    except Exception:
        logger.exception("Knowledge deletion failed for document_id=%s", document_id)
        db.rollback()
        record = get_locked(db, document_id)
        record.status = "delete_failed"
        record.error = "Deletion could not be confirmed. Retry deletion; the document may still have searchable vectors."
        db.commit()
        raise HTTPException(status_code=503, detail=record.error)
