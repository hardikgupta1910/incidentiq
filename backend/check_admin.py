from pathlib import Path
from getpass import getpass

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent / ".env")

from sqlalchemy import select

from app.database import SessionLocal
from app.models import UserRecord
from app.auth.security import verify_password


with SessionLocal() as db:
    user = db.scalar(
        select(UserRecord).where(
            UserRecord.username == "admin"
        )
    )

    if user is None:
        print("Admin user NOT FOUND in this database.")
    else:
        print(f"Admin user found. Role: {user.role}")
        password = getpass("Enter the admin password to check: ")

        try:
            matched = verify_password(
                password,
                user.hashed_password,
            )
            print(f"Password matches: {matched}")
        except Exception as error:
            print(
                "Password verification failed with:",
                type(error).__name__,
            )