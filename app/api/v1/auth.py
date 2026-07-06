from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.user import User
from app.schemas.auth import LoginRequest, TokenResponse
import hashlib
import jwt
from app.core.config import get_settings

router = APIRouter(prefix="/auth", tags=["auth"])


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


@router.post("/login")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(
        User.username == req.username,
        User.hashed_password == hash_password(req.password),
        User.is_active == True
    ).first()

    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    settings = get_settings()
    token = jwt.encode(
        {"sub": str(user.id), "role": user.role},
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM
    )

    return TokenResponse(
        access_token=token,
        user={
            "id": user.id,
            "username": user.username,
            "full_name": user.full_name,
            "role": user.role,
            "pin_code": user.pin_code
        }
    )


@router.get("/me")
def get_me(request: Request, db: Session = Depends(get_db)):
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    settings = get_settings()
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = db.query(User).filter(User.id == int(payload["sub"])).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return {"id": user.id, "username": user.username, "full_name": user.full_name, "role": user.role}


@router.post("/pin")
def get_current_user(request: Request, db: Session = Depends(get_db)):
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user = db.query(User).filter(User.id == int(token)).first() if token.isdigit() else None
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    return {"id": user.id, "username": user.username, "role": user.role}


def pin_login(data: dict, db: Session = Depends(get_db)):
    pin = data.get("pin", "")
    user = db.query(User).filter(
        User.pin_code == pin,
        User.is_active == True
    ).first()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid PIN")
    settings = get_settings()
    token = jwt.encode(
        {"sub": str(user.id), "role": user.role},
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM
    )
    return TokenResponse(
        access_token=token,
        user={
            "id": user.id,
            "username": user.username,
            "full_name": user.full_name,
            "role": user.role,
            "pin_code": user.pin_code
        }
    )
