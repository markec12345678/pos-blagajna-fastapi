from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.planned_shift import PlannedShift
from app.models.user import User
from app.schemas.schedule import CreateShift, UpdateShift
from datetime import datetime, timedelta

router = APIRouter(prefix="/schedule", tags=["schedule"])

@router.post("/shifts")
def create_shift(data: CreateShift, db: Session = Depends(get_db)):
    s = PlannedShift(
        user_id=data.user_id, date=datetime.fromisoformat(data.date).date(),
        start_time=data.start_time, end_time=data.end_time,
        role=data.role, notes=data.notes,
        branch_id=data.branch_id, created_by=data.created_by
    )
    db.add(s); db.commit(); db.refresh(s)
    return {"id": s.id, "user_id": s.user_id, "date": str(s.date), "start": s.start_time, "end": s.end_time}

@router.get("/shifts")
def list_shifts(date_from: str = "", date_to: str = "", user_id: int = 0, branch_id: int = 0, db: Session = Depends(get_db)):
    q = db.query(PlannedShift)
    if date_from: q = q.filter(PlannedShift.date >= datetime.fromisoformat(date_from).date())
    if date_to: q = q.filter(PlannedShift.date <= datetime.fromisoformat(date_to).date())
    if user_id: q = q.filter(PlannedShift.user_id == user_id)
    if branch_id: q = q.filter(PlannedShift.branch_id == branch_id)
    shifts = q.order_by(PlannedShift.date, PlannedShift.start_time).all()
    users = {u.id: u for u in db.query(User).all()}
    return [{
        "id": s.id, "user_id": s.user_id, "date": str(s.date),
        "start_time": s.start_time, "end_time": s.end_time,
        "role": s.role, "notes": s.notes, "branch_id": s.branch_id,
        "status": s.status, "user_name": users[s.user_id].username if s.user_id in users else "?",
        "created_at": str(s.created_at or "")
    } for s in shifts]

@router.put("/shifts/{shift_id}")
def update_shift(shift_id: int, data: UpdateShift, db: Session = Depends(get_db)):
    s = db.query(PlannedShift).filter(PlannedShift.id == shift_id).first()
    if not s: raise HTTPException(404, "Shift not found")
    update_data = data.model_dump(exclude_unset=True)
    for k, v in update_data.items():
        if k == "date": v = datetime.fromisoformat(v).date()
        setattr(s, k, v)
    db.commit()
    return {"ok": True}

@router.delete("/shifts/{shift_id}")
def delete_shift(shift_id: int, db: Session = Depends(get_db)):
    s = db.query(PlannedShift).filter(PlannedShift.id == shift_id).first()
    if not s: raise HTTPException(404, "Shift not found")
    db.delete(s); db.commit()
    return {"ok": True}

@router.get("/week")
def week_schedule(date: str = "", branch_id: int = 0, db: Session = Depends(get_db)):
    ref = datetime.fromisoformat(date).date() if date else datetime.now().date()
    monday = ref - timedelta(days=ref.weekday())
    sunday = monday + timedelta(days=6)
    q = db.query(PlannedShift).filter(PlannedShift.date >= monday, PlannedShift.date <= sunday)
    if branch_id: q = q.filter(PlannedShift.branch_id == branch_id)
    shifts = q.order_by(PlannedShift.date, PlannedShift.start_time).all()
    users = {u.id: u for u in db.query(User).all()}
    days = []
    for i in range(7):
        d = monday + timedelta(days=i)
        day_shifts = [{
            "id": s.id, "user_id": s.user_id, "start_time": s.start_time, "end_time": s.end_time,
            "role": s.role, "notes": s.notes, "user_name": users[s.user_id].username if s.user_id in users else "?",
            "status": s.status
        } for s in shifts if s.date == d]
        days.append({"date": str(d), "dow": d.strftime("%A"), "shifts": day_shifts})
    return {"monday": str(monday), "sunday": str(sunday), "days": days}

@router.get("/employees")
def available_employees(db: Session = Depends(get_db)):
    users = db.query(User).filter(User.is_active == True).order_by(User.username).all()
    return [{"id": u.id, "name": u.username, "role": u.role, "branch_id": u.branch_id} for u in users]
