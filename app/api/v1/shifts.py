from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.shift import EmployeeShift
from app.models.user import User
from datetime import datetime

router = APIRouter(prefix="/shifts", tags=["shifts"])


@router.get("/active")
def active_shifts(db: Session = Depends(get_db)):
    shifts = db.query(EmployeeShift).filter(EmployeeShift.status == "active").all()
    result = []
    for s in shifts:
        u = db.query(User).filter(User.id == s.user_id).first()
        now = datetime.now()
        hours = round((now - s.clock_in).total_seconds() / 3600, 2)
        result.append({
            "id": s.id, "user_id": s.user_id,
            "user_name": u.full_name if u else "—",
            "clock_in": s.clock_in.isoformat() if s.clock_in else None,
            "hours": hours, "notes": s.notes
        })
    return result


@router.post("/clock-in")
def clock_in(data: dict, db: Session = Depends(get_db)):
    user_id = data.get("user_id")
    u = db.query(User).filter(User.id == user_id).first()
    if not u:
        raise HTTPException(404, "User not found")
    active = db.query(EmployeeShift).filter(
        EmployeeShift.user_id == user_id, EmployeeShift.status == "active"
    ).first()
    if active:
        # Auto-clockout previous shift
        active.clock_out = datetime.now()
        active.status = "completed"
    s = EmployeeShift(user_id=user_id, notes=data.get("notes", ""))
    db.add(s)
    db.commit()
    db.refresh(s)
    return {"id": s.id, "clock_in": s.clock_in.isoformat()}


@router.post("/{shift_id}/clock-out")
def clock_out(shift_id: int, db: Session = Depends(get_db)):
    s = db.query(EmployeeShift).filter(
        EmployeeShift.id == shift_id, EmployeeShift.status == "active"
    ).first()
    if not s:
        raise HTTPException(400, "Shift not found or already closed")
    s.clock_out = datetime.now()
    s.status = "completed"
    db.commit()
    hours = round((s.clock_out - s.clock_in).total_seconds() / 3600, 2)
    return {"status": "completed", "hours": hours}


@router.post("/clock-in-pin")
def clock_in_by_pin(data: dict, db: Session = Depends(get_db)):
    import hashlib
    pin = data.get("pin", "")
    if not pin:
        raise HTTPException(400, "PIN required")
    hashed = hashlib.sha256(pin.encode()).hexdigest()
    u = db.query(User).filter(User.pin_code == hashed).first()
    if not u:
        raise HTTPException(401, "Invalid PIN")
    active = db.query(EmployeeShift).filter(
        EmployeeShift.user_id == u.id, EmployeeShift.status == "active"
    ).first()
    if active:
        active.clock_out = datetime.now()
        active.status = "completed"
        db.commit()
        hours = round((active.clock_out - active.clock_in).total_seconds() / 3600, 2)
        return {"action": "clock_out", "user_name": u.full_name, "hours": round(hours, 2), "shift_id": active.id}
    s = EmployeeShift(user_id=u.id)
    db.add(s)
    db.commit()
    db.refresh(s)
    return {"action": "clock_in", "user_name": u.full_name, "clock_in": s.clock_in.isoformat(), "shift_id": s.id}


@router.get("/status-pin")
def status_by_pin(pin: str = "", db: Session = Depends(get_db)):
    import hashlib
    if not pin:
        raise HTTPException(400, "PIN required")
    hashed = hashlib.sha256(pin.encode()).hexdigest()
    u = db.query(User).filter(User.pin_code == hashed).first()
    if not u:
        raise HTTPException(401, "Invalid PIN")
    active = db.query(EmployeeShift).filter(
        EmployeeShift.user_id == u.id, EmployeeShift.status == "active"
    ).first()
    today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    today_shifts = db.query(EmployeeShift).filter(
        EmployeeShift.user_id == u.id,
        EmployeeShift.clock_in >= today_start
    ).all()
    total_hours = sum(
        round((s.clock_out - s.clock_in).total_seconds() / 3600, 2)
        for s in today_shifts if s.clock_out
    )
    return {
        "user_name": u.full_name,
        "is_clocked_in": active is not None,
        "clock_in": active.clock_in.isoformat() if active else None,
        "today_hours": round(total_hours, 2),
        "shift_id": active.id if active else None,
    }


@router.get("")
def list_shifts(user_id: int = None, date_from: str = None, date_to: str = None, db: Session = Depends(get_db)):
    q = db.query(EmployeeShift)
    if user_id:
        q = q.filter(EmployeeShift.user_id == user_id)
    if date_from:
        q = q.filter(EmployeeShift.clock_in >= datetime.fromisoformat(date_from))
    if date_to:
        q = q.filter(EmployeeShift.clock_in <= datetime.fromisoformat(date_to))
    shifts = q.order_by(EmployeeShift.clock_in.desc()).all()
    result = []
    for s in shifts:
        u = db.query(User).filter(User.id == s.user_id).first()
        hours = round((s.clock_out - s.clock_in).total_seconds() / 3600, 2) if s.clock_out else 0
        result.append({
            "id": s.id, "user_id": s.user_id,
            "user_name": u.full_name if u else "—",
            "clock_in": s.clock_in.isoformat() if s.clock_in else None,
            "clock_out": s.clock_out.isoformat() if s.clock_out else None,
            "hours": hours, "status": s.status, "notes": s.notes
        })
    return result
