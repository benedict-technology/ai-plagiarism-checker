import os
from pathlib import Path
from passlib.context import CryptContext
from jose import jwt
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv

# Load environment variables from the project root .env file.
env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(env_path)

# SECRET_KEY must be set to a secure value in production.
SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY or SECRET_KEY == "your-secure-random-key-change-this-in-production":
    raise ValueError(
        "SECRET_KEY is not set or is using the default value. "
        "Please set a secure SECRET_KEY in the .env file."
    )
ALGORITHM = "HS256"

# Password hashing context for secure password storage.
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password):
    """Hash a plain-text password for storing in the database."""
    return pwd_context.hash(password)


def verify_password(plain_password, hashed_password):
    """Compare a plain-text password against the stored hash."""
    return pwd_context.verify(plain_password, hashed_password)


def create_token(data: dict):
    """Create a signed JWT token with a short expiration window."""
    to_encode = data.copy()
    to_encode["exp"] = datetime.now(timezone.utc) + timedelta(hours=2)
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str):
    """Decode and validate a JWT token."""
    return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
