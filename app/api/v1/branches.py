from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.branch import Branch

router = APIRouter(prefix="/branches", tags=["branches"])


@router.get("")
def list_branches(db: Session = Depends(get_db)):
    branches = db.query(Branch).order_by(Branch.name).all()
    return [{"id": b.id, "name": b.name, "address": b.address, "phone": b.phone,
             "email": b.email, "is_active": b.is_active} for b in branches]


@router.post("")
def create_branch(data: dict, db: Session = Depends(get_db)):
    b = Branch(
        name=data["name"],
        address=data.get("address", ""),
        phone=data.get("phone", ""),
        email=data.get("email", ""),
        is_active=data.get("is_active", True)
    )
    db.add(b)
    db.commit()
    db.refresh(b)
    return {"id": b.id, "name": b.name}


@router.put("/{branch_id}")
def update_branch(branch_id: int, data: dict, db: Session = Depends(get_db)):
    b = db.query(Branch).filter(Branch.id == branch_id).first()
    if not b:
        raise HTTPException(404, "Branch not found")
    for k in ("name", "address", "phone", "email", "is_active"):
        if k in data:
            setattr(b, k, data[k])
    db.commit()
    return {"ok": True}


@router.delete("/{branch_id}")
def delete_branch(branch_id: int, db: Session = Depends(get_db)):
    b = db.query(Branch).filter(Branch.id == branch_id).first()
    if not b:
        raise HTTPException(404, "Branch not found")
    db.delete(b)
    db.commit()
    return {"ok": True}


@router.get("/default")
def get_default_branch(db: Session = Depends(get_db)):
    b = db.query(Branch).first()
    if not b:
        raise HTTPException(404, "No branches")
    return {"id": b.id, "name": b.name, "address": b.address, "phone": b.phone, "email": b.email}
