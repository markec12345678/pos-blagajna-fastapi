from datetime import datetime, timedelta, timezone
import hashlib
import secrets
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.user import User
from app.schemas.auth import LoginRequest, PinLogin, TokenResponse
import bcrypt
import jwt
from app.core.config import get_settings

router = APIRouter(prefix="/auth", tags=["auth"])


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode(), hashed.encode())
    except Exception:
        return False


def hash_pin(pin: str) -> str:
    salt = secrets.token_hex(16)
    h = hashlib.sha256(f"{salt}:{pin}".encode()).hexdigest()
    return f"{salt}:{h}"


def verify_pin(pin: str, stored: str) -> bool:
    if ":" not in stored:
        return stored == pin
    salt, h = stored.split(":", 1)
    return hashlib.sha256(f"{salt}:{pin}".encode()).hexdigest() == h


def _create_token(user: User) -> str:
    settings = get_settings()
    exp_minutes = settings.ACCESS_TOKEN_EXPIRE_MINUTES
    return jwt.encode(
        {
            "sub": str(user.id),
            "role": user.role,
            "exp": datetime.now(timezone.utc) + timedelta(minutes=exp_minutes),
        },
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM,
    )


def _user_payload(user: User) -> dict:
    return {
        "id": user.id,
        "username": user.username,
        "full_name": user.full_name,
        "role": user.role,
    }


def get_current_user(request: Request, db: Session = Depends(get_db)):
    token = request.headers.get("Authorization", "").removeprefix("Bearer ")
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    settings = get_settings()
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = db.query(User).filter(User.id == int(payload["sub"])).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found or inactive")
    return user


def require_role(*allowed_roles):
    def dep(user: User = Depends(get_current_user)):
        if user.role not in allowed_roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return user
    return Depends(dep)


require_admin = require_role("admin")
require_manager = require_role("admin", "manager")
require_staff = require_role("admin", "manager", "cashier", "waiter", "kitchen", "staff")


@router.post("/login")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(
        User.username == req.username,
        User.is_active == True
    ).first()

    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    return TokenResponse(access_token=_create_token(user), user=_user_payload(user))


@router.get("/me")
def get_me(user: User = Depends(get_current_user)):
    return {"id": user.id, "username": user.username, "full_name": user.full_name, "role": user.role}


@router.post("/pin")
def pin_login(data: PinLogin, db: Session = Depends(get_db)):
    pin = data.pin.strip()
    if not pin or not pin.isdigit() or len(pin) < 3 or len(pin) > 8:
        raise HTTPException(400, "PIN must be 3-8 digits")

    user = db.query(User).filter(
        User.is_active == True
    ).first()
    if not user or not verify_pin(pin, user.pin_code or ""):
        raise HTTPException(status_code=401, detail="Invalid PIN")

    return TokenResponse(access_token=_create_token(user), user=_user_payload(user))
