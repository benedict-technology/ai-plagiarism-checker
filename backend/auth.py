from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session

from .database import SessionLocal
from .models import User
from .security import create_token, decode_token, hash_password, verify_password


# Request model used when a new user registers.
class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


# Request model used for login.
class LoginRequest(BaseModel):
    email: EmailStr
    password: str


router = APIRouter()
# HTTP bearer token scheme used for protected endpoint authentication.
bearer_scheme = HTTPBearer()


def get_db():
    """Provide a database session for request handlers and close it afterward."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
):
    """Validate the bearer token and return the authenticated user."""
    auth_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired token",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_token(credentials.credentials)
        email = payload.get("sub")
    except JWTError as exc:
        raise auth_error from exc

    if not email:
        raise auth_error

    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise auth_error
    return user


@router.post("/register")
def register(request: RegisterRequest, db: Session = Depends(get_db)):
    """Register a new user and store a hashed password."""
    email = request.email.lower()
    user = db.query(User).filter(User.email == email).first()
    if user:
        raise HTTPException(status_code=400, detail="User already exists")

    new_user = User(email=email, password=hash_password(request.password))
    db.add(new_user)
    db.commit()
    return {"message": "User created successfully", "email": email}


@router.post("/login")
def login(request: LoginRequest, db: Session = Depends(get_db)):
    """Authenticate a user and return a JWT access token."""
    user = db.query(User).filter(User.email == request.email.lower()).first()
    if not user or not verify_password(request.password, user.password):
        raise HTTPException(status_code=400, detail="Invalid credentials")

    token = create_token({"sub": user.email})
    return {
        "access_token": token,
        "token_type": "bearer"
    }


@router.get("/me")
def me(user: User = Depends(get_current_user)):
    """Return details for the currently logged-in user."""
    return {"id": user.id, "email": user.email}
