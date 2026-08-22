import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# For local dev, SQLite is fine and needs zero setup.
# Swap to Postgres for anything beyond your laptop:
#   DATABASE_URL=postgresql://user:pass@localhost:5432/ml_monitor
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./ml_monitor.db")

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
