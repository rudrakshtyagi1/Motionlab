"""
database.py — SQLAlchemy database setup.

Step 1: SQLite engine + session factory placeholder.
Step 11: Session persistence API will use this.

Architecture note: SQLite is used for the MVP.
For production, change DATABASE_URL to postgresql://... and
install psycopg2-binary. No other code changes required because
SQLAlchemy abstracts the dialect.
"""

import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

# ── Connection string ─────────────────────────────────────────────────────────
# Default: SQLite in the project root.
# Override with DATABASE_URL env var for Postgres in production.
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./motionlab.db")

# connect_args is SQLite-specific — required for thread safety in FastAPI.
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, connect_args=connect_args)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


# ── Base class for ORM models ─────────────────────────────────────────────────
class Base(DeclarativeBase):
    pass


# ── Dependency for FastAPI route injection ────────────────────────────────────
def get_db():
    """FastAPI dependency that yields a database session and closes it after use."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
