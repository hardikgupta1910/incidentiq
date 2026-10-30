from sqlalchemy import create_engine, text


DATABASE_URL = (
    "mysql+pymysql://incidentiq:incidentiq-local-password"
    "@127.0.0.1:3307/incidentiq"
)

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
)

with engine.connect() as connection:
    result = connection.execute(
        text("SELECT DATABASE() AS database_name, VERSION() AS mysql_version")
    )
    row = result.mappings().one()

print(f"Connected database: {row['database_name']}")
print(f"MySQL version: {row['mysql_version']}")