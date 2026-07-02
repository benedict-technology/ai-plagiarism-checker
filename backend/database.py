from pathlib import Path
import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# Load environment variables from the project root .env file if present.
env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(env_path)

BASE_DIR = Path(__file__).resolve().parent.parent

# Use DATABASE_URL if configured, otherwise fall back to a local SQLite database.
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    # Construct a safe SQLite path relative to the repository root.
    db_path = BASE_DIR / "plagiarism.db"
    db_path_str = str(db_path).replace("\\", "/")
    DATABASE_URL = f"sqlite:///{db_path_str}"

# SQLite requires check_same_thread=False for multi-threaded FastAPI usage.
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args)

# Session factory used by endpoint dependencies.
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)

# Base class for SQLAlchemy ORM models.
Base = declarative_base()
