from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from pydantic import BaseModel
from typing import List, Optional
from app.core.database import get_db
from app.models.shift import EmployeeShift, ShiftSwapRequest
from app.models.user import User
from app.schemas.shift import ClockIn, ClockInByPin
from app.api.v1.auth import verify_pin, get_current_user
from datetime import datetime

router = APIRouter(prefix="/shifts", tags=["shifts"])


@router.post("/{shift_id}/break-start")
def break_start(shift_id: int, db: Session = Depends(get_db)):
    s = db.query(EmployeeShift).filter(
        EmployeeShift.id == shift_id, EmployeeShift.status == "active"
    ).first()
    if not s:
        raise HTTPException(400, "Shift not found or not active")
    if s.break_start and not s.break_end:
        raise HTTPException(400, "Already on break")
    s.break_start = datetime.now()
    s.break_end = None
    db.commit()
    return {"status": "on_break", "break_start": s.break_start.isoformat()}


@router.post("/{shift_id}/break-end")
def break_end(shift_id: int, db: Session = Depends(get_db)):
    s = db.query(EmployeeShift).filter(
        EmployeeShift.id == shift_id, EmployeeShift.status == "active"
    ).first()
    if not s:
        raise HTTPException(400, "Shift not found or not active")
    if not s.break_start or s.break_end:
        raise HTTPException(400, "Not on break")
    s.break_end = datetime.now()
    break_mins = int((s.break_end - s.break_start).total_seconds() / 60)
    s.total_break_minutes = (s.total_break_minutes or 0) + break_mins
    s.break_start = None
    db.commit()
    return {"status": "working", "break_minutes": break_mins, "total_break_minutes": s.total_break_minutes}


@router.get("/active")
def active_shifts(db: Session = Depends(get_db)):
    shifts = (
        db.query(EmployeeShift)
        .options(joinedload(EmployeeShift.user))
        .filter(EmployeeShift.status == "active")
        .all()
    )
    now = datetime.now()
    return [
        {
            "id": s.id, "user_id": s.user_id,
            "user_name": s.user.full_name if s.user else "—",
            "clock_in": s.clock_in.isoformat() if s.clock_in else None,
            "hours": round((now - s.clock_in).total_seconds() / 3600, 2),
            "on_break": s.break_start is not None and s.break_end is None,
            "break_start": s.break_start.isoformat() if s.break_start and not s.break_end else None,
            "total_break_minutes": s.total_break_minutes or 0,
            "notes": s.notes,
        }
        for s in shifts
    ]


@router.post("/clock-in")
def clock_in(data: ClockIn, db: Session = Depends(get_db)):
    user_id = data.user_id
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
    s = EmployeeShift(user_id=user_id, notes=data.notes)
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
def clock_in_by_pin(data: ClockInByPin, db: Session = Depends(get_db)):
    pin = data.pin
    if not pin:
        raise HTTPException(400, "PIN required")
    users = db.query(User).filter(User.is_active == True).all()
    u = next((usr for usr in users if verify_pin(pin, usr.pin_code or "")), None)
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
    if not pin:
        raise HTTPException(400, "PIN required")
    users = db.query(User).filter(User.is_active == True).all()
    u = next((usr for usr in users if verify_pin(pin, usr.pin_code or "")), None)
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
        "on_break": active.break_start is not None and active.break_end is None if active else False,
        "break_start": active.break_start.isoformat() if active and active.break_start and not active.break_end else None,
        "total_break_minutes": (active.total_break_minutes or 0) if active else 0,
    }


@router.get("")
def list_shifts(
    user_id: int = None,
    date_from: str = None,
    date_to: str = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
):
    q = db.query(EmployeeShift).options(joinedload(EmployeeShift.user))
    if user_id:
        q = q.filter(EmployeeShift.user_id == user_id)
    if date_from:
        q = q.filter(EmployeeShift.clock_in >= datetime.fromisoformat(date_from))
    if date_to:
        q = q.filter(EmployeeShift.clock_in <= datetime.fromisoformat(date_to))

    total = q.count()
    shifts = q.order_by(EmployeeShift.clock_in.desc()).offset(skip).limit(limit).all()
    return {
        "items": [
            {
                "id": s.id, "user_id": s.user_id,
                "user_name": s.user.full_name if s.user else "—",
                "clock_in": s.clock_in.isoformat() if s.clock_in else None,
                "clock_out": s.clock_out.isoformat() if s.clock_out else None,
                "hours": round((s.clock_out - s.clock_in).total_seconds() / 3600, 2) if s.clock_out else 0,
                "break_minutes": s.total_break_minutes or 0,
                "status": s.status, "notes": s.notes,
            }
            for s in shifts
        ],
        "total": total,
    }


class BulkShiftRequest(BaseModel):
    ids: List[int]


@router.post("/bulk/close")
def bulk_close_shifts(body: BulkShiftRequest, db: Session = Depends(get_db)):
    shifts = db.query(EmployeeShift).filter(
        EmployeeShift.id.in_(body.ids),
        EmployeeShift.status == "active"
    ).all()
    count = 0
    for s in shifts:
        s.clock_out = datetime.utcnow()
        s.status = "closed"
        count += 1
    db.commit()
    return {"closed": count}


@router.post("/bulk/delete")
def bulk_delete_shifts(body: BulkShiftRequest, db: Session = Depends(get_db)):
    shifts = db.query(EmployeeShift).filter(EmployeeShift.id.in_(body.ids)).all()
    count = 0
    for s in shifts:
        if s.status == "closed":
            db.delete(s)
            count += 1
    db.commit()
    return {"deleted": count}


class SwapRequest(BaseModel):
    shift_date: str
    original_start: str
    original_end: str
    target_user_id: Optional[int] = None
    type: str = "swap"
    notes: str = ""


class SwapResponse(BaseModel):
    status: str
    response_notes: str = ""


@router.post("/swap-requests")
def create_swap_request(data: SwapRequest, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    req = ShiftSwapRequest(
        requester_id=user.id,
        shift_date=data.shift_date,
        original_start=data.original_start,
        original_end=data.original_end,
        target_user_id=data.target_user_id,
        type=data.type,
        notes=data.notes
    )
    db.add(req)
    db.commit()
    db.refresh(req)
    return {"id": req.id, "status": req.status, "type": req.type}


@router.get("/swap-requests")
def list_swap_requests(status: str = "pending", db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    q = db.query(ShiftSwapRequest)
    if status != "all":
        q = q.filter(ShiftSwapRequest.status == status)
    requests = q.order_by(ShiftSwapRequest.created_at.desc()).all()
    user_ids = list(set([r.requester_id] + ([r.target_user_id] if r.target_user_id else []) + ([r.resolved_by] if r.resolved_by else [])))
    users = {u.id: u.full_name or u.username for u in db.query(User).filter(User.id.in_(user_ids)).all()} if user_ids else {}
    return [{
        "id": r.id,
        "requester_id": r.requester_id,
        "requester_name": users.get(r.requester_id, "?"),
        "shift_date": r.shift_date,
        "original_start": r.original_start,
        "original_end": r.original_end,
        "target_user_id": r.target_user_id,
        "target_name": users.get(r.target_user_id) if r.target_user_id else None,
        "type": r.type,
        "status": r.status,
        "notes": r.notes,
        "response_notes": r.response_notes,
        "created_at": r.created_at.isoformat() if r.created_at else None,
        "resolved_at": r.resolved_at.isoformat() if r.resolved_at else None,
    } for r in requests]


@router.put("/swap-requests/{req_id}")
def respond_swap_request(req_id: int, data: SwapResponse, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    req = db.query(ShiftSwapRequest).filter(ShiftSwapRequest.id == req_id).first()
    if not req:
        raise HTTPException(404, "Request not found")
    if req.status != "pending":
        raise HTTPException(400, "Request already resolved")
    if data.status not in ("approved", "rejected"):
        raise HTTPException(400, "Status must be approved or rejected")
    req.status = data.status
    req.response_notes = data.response_notes
    req.resolved_by = user.id
    req.resolved_at = datetime.utcnow()
    db.commit()
    return {"ok": True, "status": req.status}


@router.delete("/swap-requests/{req_id}")
def cancel_swap_request(req_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    req = db.query(ShiftSwapRequest).filter(
        ShiftSwapRequest.id == req_id,
        ShiftSwapRequest.requester_id == user.id,
        ShiftSwapRequest.status == "pending"
    ).first()
    if not req:
        raise HTTPException(404, "Request not found or not cancellable")
    db.delete(req)
    db.commit()
    return {"ok": True}
