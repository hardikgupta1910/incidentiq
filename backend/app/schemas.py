from datetime import datetime
from enum import Enum
from typing import Optional
from uuid import UUID, uuid4

from pydantic import BaseModel, Field


class Severity(str, Enum):
    INFO="INFO"
    WARNING="WARNING"
    ERROR="ERROR"
    CRITICAL="CRITICAL"


class LogEvent(BaseModel):
    line_number:int
    timestamp: Optional[datetime]=None
    severity: Severity=Severity.INFO
    service:Optional[str]=None
    message: str

class Incident(BaseModel):
    id: UUID=Field(default_factory=uuid4)
    title:str
    status:str="created"
    created_at:datetime=Field(default_factory=datetime.now)
    source_filename:str
    total_log_lines:int
    error_count:int
    events: list[LogEvent]


class EvidenceReference(BaseModel):
    source_type:str
    line_number: int
    message:str


class Hypothesis(BaseModel):
    rank:int
    summary: str
    confidence: float=Field(ge=0, le=1)
    evidence: list[EvidenceReference]
    suggested_checks: list[str]

class InvestigationResult(BaseModel):
    incident_id:UUID
    status: str
    hypotheses: list[Hypothesis]