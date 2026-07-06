from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.user import User
import hashlib

router = APIRouter(prefix="/users", tags=["users"])


@router.get("")
def get_users(db: Session = Depends(get_db)):
    users = db.query(User).all()
    return [{"id": u.id, "username": u.username, "full_name": u.full_name, "role": u.role} for u in users]


@router.post("")
def create_user(data: dict, db: Session = Depends(get_db)):
    if db.query(User).filter(User.username == data["username"]).first():
        raise HTTPException(400, "Uporabnik že obstaja")
    user = User(
        username=data["username"],
        hashed_password=hashlib.sha256(data["password"].encode()).hexdigest(),
        full_name=data.get("full_name", data["username"]),
        role=data.get("role", "cashier"),
        pin_code=data.get("pin_code")
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"id": user.id, "username": user.username, "full_name": user.full_name, "role": user.role}


@router.put("/{user_id}")
def update_user(user_id: int, data: dict, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "Uporabnik ne obstaja")
    if "full_name" in data:
        user.full_name = data["full_name"]
    if "role" in data:
        user.role = data["role"]
    if "password" in data and data["password"]:
        user.hashed_password = hashlib.sha256(data["password"].encode()).hexdigest()
    if "pin_code" in data:
        user.pin_code = data["pin_code"]
    db.commit()
    return {"id": user.id, "username": user.username, "full_name": user.full_name, "role": user.role}


@router.delete("/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "Uporabnik ne obstaja")
    if user.username == "admin":
        raise HTTPException(400, "Ne morem izbrisati admin računa")
    db.delete(user)
    db.commit()
    return {"ok": True}
