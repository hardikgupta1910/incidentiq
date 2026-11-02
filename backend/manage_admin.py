import argparse
from getpass import getpass

from pathlib import Path
from dotenv import load_dotenv


from sqlalchemy import select
load_dotenv(Path(__file__).resolve().parent / ".env")

from app.database import Base, SessionLocal, engine
from app.models import UserRecord
from app.auth.security import hash_password


def main():
    parser = argparse.ArgumentParser(
        description="Create or recover an IncidentIQ administrator."
    )
    parser.add_argument("username")
    args = parser.parse_args()

    username = args.username.strip()

    if not 3 <= len(username) <= 100:
        raise SystemExit("Username must contain 3–100 characters.")

    Base.metadata.create_all(bind=engine)

    with SessionLocal() as db:
        user = db.scalar(
            select(UserRecord).where(
                UserRecord.username == username
            )
        )

        if user is not None:
            confirmation = input(
                f"Promote existing user '{username}' to admin? Type YES: "
            )

            if confirmation != "YES":
                raise SystemExit("Cancelled.")

            user.role = "admin"
            db.commit()
            print("User promoted. Existing password remains unchanged.")
            return

        password = getpass("New admin password (12–128 characters): ")
        confirmation = getpass("Confirm password: ")

        if password != confirmation:
            raise SystemExit("Passwords do not match.")

        if not 12 <= len(password) <= 128:
            raise SystemExit("Password must contain 12–128 characters.")

        db.add(
            UserRecord(
                username=username,
                hashed_password=hash_password(password),
                role="admin",
            )
        )
        db.commit()
        print("Administrator created successfully.")


if __name__ == "__main__":
    main()