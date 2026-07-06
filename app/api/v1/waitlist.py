from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.waitlist import WaitlistEntry
from datetime import datetime

router = APIRouter(prefix="/waitlist", tags=["waitlist"])


@router.get("")
def list_waitlist(branch_id: int = 0, db: Session = Depends(get_db)):
    q = db.query(WaitlistEntry)
    if branch_id:
        q = q.filter(WaitlistEntry.branch_id == branch_id)
    q = q.order_by(WaitlistEntry.created_at.desc())
    return [{
        "id": e.id, "name": e.name, "phone": e.phone,
        "party_size": e.party_size, "status": e.status,
        "notes": e.notes, "branch_id": e.branch_id,
        "created_at": e.created_at.isoformat() if e.created_at else None,
        "notified_at": e.notified_at.isoformat() if e.notified_at else None,
        "seated_at": e.seated_at.isoformat() if e.seated_at else None,
    } for e in q.all()]


@router.post("")
def add_waitlist(data: dict, db: Session = Depends(get_db)):
    entry = WaitlistEntry(
        name=data["name"],
        phone=data.get("phone"),
        party_size=data.get("party_size", 2),
        notes=data.get("notes"),
        branch_id=data.get("branch_id"),
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return {"ok": True, "id": entry.id}


@router.post("/{entry_id}/notify")
def notify_waitlist(entry_id: int, db: Session = Depends(get_db)):
    entry = db.query(WaitlistEntry).filter(WaitlistEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(404, "Entry not found")
    entry.status = "notified"
    entry.notified_at = datetime.now()
    db.commit()
    return {"ok": True}


@router.post("/{entry_id}/seat")
def seat_waitlist(entry_id: int, db: Session = Depends(get_db)):
    entry = db.query(WaitlistEntry).filter(WaitlistEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(404, "Entry not found")
    entry.status = "seated"
    entry.seated_at = datetime.now()
    db.commit()
    return {"ok": True}


@router.post("/{entry_id}/cancel")
def cancel_waitlist(entry_id: int, db: Session = Depends(get_db)):
    entry = db.query(WaitlistEntry).filter(WaitlistEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(404, "Entry not found")
    entry.status = "cancelled"
    db.commit()
    return {"ok": True}


@router.delete("/{entry_id}")
def delete_waitlist(entry_id: int, db: Session = Depends(get_db)):
    entry = db.query(WaitlistEntry).filter(WaitlistEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(404, "Entry not found")
    db.delete(entry)
    db.commit()
    return {"ok": True}


# Public endpoint for customers to add themselves
@router.post("/public")
def public_add_waitlist(data: dict, db: Session = Depends(get_db)):
    if not data.get("name"):
        raise HTTPException(400, "Name is required")
    entry = WaitlistEntry(
        name=data["name"],
        phone=data.get("phone"),
        party_size=data.get("party_size", 2),
        notes=data.get("notes"),
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return {"ok": True, "id": entry.id, "position": db.query(WaitlistEntry).filter(
        WaitlistEntry.status == "waiting", WaitlistEntry.id < entry.id
    ).count() + 1}
