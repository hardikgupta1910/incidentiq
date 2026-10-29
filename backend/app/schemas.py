from datetime import datetime
from enum import Enum
from typing import Optional
from uuid import UUID, uuid4

from pydantic import BaseModel, Field,model_validator


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
    line_number: Optional[int] = None
    source_file: Optional[str] = None
    chunk_index: Optional[int] = None
    message:str


class Hypothesis(BaseModel):
    rank: int
    summary: str
    confidence: float = Field(ge=0, le=1)
    evidence: list[EvidenceReference]
    suggested_checks: list[str]

    @model_validator(mode="after")
    def evidence_must_come_from_logs(self):
        invalid_evidence = [
            item
            for item in self.evidence
            if item.source_type != "log"
        ]

        if invalid_evidence:
            raise ValueError(
                "Hypothesis evidence must use source_type='log'. "
                "Runbook content may guide suggested checks but is not incident evidence."
            )

        return self

class InvestigationResult(BaseModel):
    incident_id:UUID
    status: str
    hypotheses: list[Hypothesis]
    retrieved_sources: list[RetrievedSource] = []




class RetrievedSource(BaseModel):
    source_file: str
    chunk_index: int
    score: float
    text: str