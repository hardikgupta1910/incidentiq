from datetime import datetime
from uuid import uuid4
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Integer, JSON, String, Boolean
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base



class IncidentRecord(Base):

    __tablename__="incidents"

    id:Mapped[str]=mapped_column(
        String(36),
        primary_key=True,
        default=lambda:str(uuid4()),
    )

    title:Mapped[str]=mapped_column(String(255), nullable=False)

    status:Mapped[str]=mapped_column( String(50), nullable=False, default="created")

    created_at:Mapped[datetime]=mapped_column(
        DateTime,
        nullable=False,
        default=datetime.now,
    )

    source_filename: Mapped[str]=mapped_column(
        String(255),
        nullable=False
    )
    total_log_lines: Mapped[int]=mapped_column(
        Integer,
        nullable=False
    )

    error_count: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    events:Mapped[list]=mapped_column(
        JSON,
        nullable=False
    )
    investigation:Mapped[dict | None]=mapped_column(
        JSON,
        nullable=True,
    )



class UserRecord(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )

    username: Mapped[str] = mapped_column(
        String(100),
        unique=True,
        index=True,
    )

    hashed_password: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(20), default="engineer")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
    )



class PrivacyPolicyRecord(Base):
    __tablename__ = "privacy_policy"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
    )

    enabled: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
    )

class InvestigationHistoryRecord(Base):
    __tablename__ = "investigation_history"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid4())
    )
    incident_id: Mapped[str] = mapped_column(
        String(36), nullable=False, index=True
    )
    status: Mapped[str] = mapped_column(String(50), nullable=False)
    recorded_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    result: Mapped[dict] = mapped_column(JSON, nullable=False)
