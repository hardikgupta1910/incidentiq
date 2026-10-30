from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker



DATABASE_URL = (
    "mysql+pymysql://incidentiq:incidentiq-local-password"
    "@127.0.0.1:3307/incidentiq"
)

engine=create_engine(
    DATABASE_URL,
    pool_pre_ping=True
)



SessionLocal= sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
)



class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()