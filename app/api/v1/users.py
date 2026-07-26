from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.user import User
from app.api.v1.auth import hash_password, hash_pin, get_current_user
from app.schemas.user import UserCreate, UserUpdate

router = APIRouter(prefix="/users", tags=["users"])


@router.get("")
def get_users(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    users = db.query(User).all()
    return [{"id": u.id, "username": u.username, "full_name": u.full_name, "role": u.role} for u in users]


@router.post("")
def create_user(data: UserCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if db.query(User).filter(User.username == data.username).first():
        raise HTTPException(400, "Uporabnik že obstaja")
    user = User(
        username=data.username,
        hashed_password=hash_password(data.password),
        full_name=data.full_name or data.username,
        role=data.role,
        pin_code=hash_pin(data.pin_code) if data.pin_code else None
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"id": user.id, "username": user.username, "full_name": user.full_name, "role": user.role}


@router.put("/{user_id}")
def update_user(user_id: int, data: UserUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "Uporabnik ne obstaja")
    if data.full_name is not None:
        user.full_name = data.full_name
    if data.role is not None:
        user.role = data.role
    if data.password:
        user.hashed_password = hash_password(data.password)
    if data.pin_code is not None:
        user.pin_code = hash_pin(data.pin_code) if data.pin_code else None
    db.commit()
    return {"id": user.id, "username": user.username, "full_name": user.full_name, "role": user.role}


@router.delete("/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "Uporabnik ne obstaja")
    if user.username == "admin":
        raise HTTPException(400, "Ne morem izbrisati admin računa")
    db.delete(user)
    db.commit()
    return {"ok": True}
