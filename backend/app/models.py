from datetime import datetime
from uuid import uuid4

from sqlalchemy import DateTime, Integer, JSON, String
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
    investigation=Mapped[dict|None]=mapped_column(
        JSON,
        nullable=True,
    )