"""Schedule Calendar API — vizualni koledar urnika z vleci in spusti."""
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime, timedelta

from app.core.database import get_db
from app.api.v1.auth import get_current_user

router = APIRouter(prefix="/schedule-calendar", tags=["Koledar urnika"])


class ShiftEntry(BaseModel):
    user_id: int
    date: str
    start_time: str
    end_time: str
    role: Optional[str] = None
    notes: Optional[str] = None


class ShiftUpdate(BaseModel):
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    notes: Optional[str] = None


@router.get("/")
def get_calendar(
    start: str = Query(None, description="YYYY-MM-DD"),
    end: str = Query(None, description="YYYY-MM-DD"),
    user_id: Optional[int] = None,
    branch_id: Optional[int] = None,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Vrni urnik za koledarsko obdobje."""
    from app.models.shift import EmployeeShift
    from app.models.user import User

    if not start:
        today = datetime.now()
        start_dt = today - timedelta(days=today.weekday())
    else:
        start_dt = datetime.strptime(start, '%Y-%m-%d')

    if not end:
        end_dt = start_dt + timedelta(days=27)
    else:
        end_dt = datetime.strptime(end, '%Y-%m-%d')

    q = db.query(EmployeeShift).filter(
        EmployeeShift.date >= start_dt.strftime('%Y-%m-%d'),
        EmployeeShift.date <= end_dt.strftime('%Y-%m-%d')
    )
    if user_id:
        q = q.filter(EmployeeShift.user_id == user_id)
    if branch_id:
        q = q.filter(EmployeeShift.branch_id == branch_id)

    shifts = q.all()

    employees = db.query(User).filter(User.is_active == True).all()
    employee_map = {e.id: getattr(e, 'full_name', e.username) for e in employees}

    calendar_data = []
    for s in shifts:
        employee_name = employee_map.get(getattr(s, 'user_id', 0), 'Neznan')
        calendar_data.append({
            "id": s.id,
            "user_id": getattr(s, 'user_id', 0),
            "employee_name": employee_name,
            "date": s.date.strftime('%Y-%m-%d') if hasattr(s.date, 'strftime') else str(s.date),
            "start_time": getattr(s, 'start_time', ''),
            "end_time": getattr(s, 'end_time', ''),
            "role": getattr(s, 'role', ''),
            "notes": getattr(s, 'notes', ''),
        })

    # Also return employees list for dropdown
    employee_list = [
        {"id": e.id, "name": employee_map.get(e.id, e.username), "role": getattr(e, 'role', '')}
        for e in employees
    ]

    return {
        "shifts": calendar_data,
        "employees": employee_list,
        "period": {
            "start": start_dt.strftime('%Y-%m-%d'),
            "end": end_dt.strftime('%Y-%m-%d'),
        }
    }


@router.post("/")
def create_shift(shift: ShiftEntry, db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Ustvari novo izmeno v koledarju."""
    from app.models.shift import EmployeeShift

    new_shift = EmployeeShift(
        user_id=shift.user_id,
        date=shift.date,
        start_time=shift.start_time,
        end_time=shift.end_time,
        role=shift.role,
        notes=shift.notes,
    )
    db.add(new_shift)
    db.commit()
    db.refresh(new_shift)

    return {"id": new_shift.id, "message": "Izmena dodana"}


@router.put("/{shift_id}")
def update_shift(shift_id: int, update: ShiftUpdate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Posodobi izmeno (premakni v koledarju)."""
    from app.models.shift import EmployeeShift

    s = db.query(EmployeeShift).filter(EmployeeShift.id == shift_id).first()
    if not s:
        return {"error": "Izmena ni najdena"}

    if update.start_time is not None:
        s.start_time = update.start_time
    if update.end_time is not None:
        s.end_time = update.end_time
    if update.notes is not None:
        s.notes = update.notes
    db.commit()

    return {"message": "Izmena posodobljena"}


@router.delete("/{shift_id}")
def delete_shift(shift_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Izbriši izmeno."""
    from app.models.shift import EmployeeShift

    s = db.query(EmployeeShift).filter(EmployeeShift.id == shift_id).first()
    if not s:
        return {"error": "Izmena ni najdena"}

    db.delete(s)
    db.commit()
    return {"message": "Izmena izbrisana"}


@router.get("/stats")
def get_schedule_stats(
    start: str = Query(None),
    end: str = Query(None),
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Statistika urnika — ure po zaposlenem, stroški."""
    from app.models.shift import EmployeeShift
    from app.models.user import User

    if not start:
        today = datetime.now()
        start_dt = today - timedelta(days=today.weekday())
    else:
        start_dt = datetime.strptime(start, '%Y-%m-%d')

    if not end:
        end_dt = start_dt + timedelta(days=6)
    else:
        end_dt = datetime.strptime(end, '%Y-%m-%d')

    shifts = db.query(EmployeeShift).filter(
        EmployeeShift.date >= start_dt.strftime('%Y-%m-%d'),
        EmployeeShift.date <= end_dt.strftime('%Y-%m-%d')
    ).all()

    employees = db.query(User).filter(User.is_active == True).all()
    employee_map = {e.id: e for e in employees}

    stats = {}
    for s in shifts:
        uid = getattr(s, 'user_id', 0)
        if uid not in stats:
            emp = employee_map.get(uid)
            stats[uid] = {
                "user_id": uid,
                "name": getattr(emp, 'full_name', 'Neznan') if emp else 'Neznan',
                "total_hours": 0,
                "shift_count": 0,
                "roles": set()
            }
        stats[uid]["shift_count"] += 1
        # Calculate hours
        try:
            start_parts = str(getattr(s, 'start_time', '0:0')).split(':')
            end_parts = str(getattr(s, 'end_time', '0:0')).split(':')
            hours = (int(end_parts[0]) + int(end_parts[1])/60) - (int(start_parts[0]) + int(start_parts[1])/60)
            if hours > 0:
                stats[uid]["total_hours"] += round(hours, 1)
        except:
            pass
        role = getattr(s, 'role', '')
        if role:
            stats[uid]["roles"].add(role)

    # Convert sets to lists for JSON
    for uid in stats:
        stats[uid]["roles"] = list(stats[uid]["roles"])

    total_hours = sum(s["total_hours"] for s in stats.values())

    return {
        "period": {"start": start_dt.strftime('%Y-%m-%d'), "end": end_dt.strftime('%Y-%m-%d')},
        "total_hours": total_hours,
        "employee_stats": list(stats.values()),
    }


class AutoScheduleRequest(BaseModel):
    start_date: str
    end_date: str
    min_per_shift: int = 2
    max_per_shift: int = 5
    shifts_per_day: List[dict] = []  # [{"start": "06:00", "end": "14:00"}, ...]
    role_requirements: Optional[dict] = None  # {"chef": 1, "waiter": 2}


@router.post("/auto-schedule")
def auto_schedule(req: AutoScheduleRequest, db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Avtomatsko generiraj urnik glede na preference zaposlenih in potrebe."""
    from app.models.shift import EmployeeShift
    from app.models.user import User
    import random

    start_dt = datetime.strptime(req.start_date, '%Y-%m-%d')
    end_dt = datetime.strptime(req.end_date, '%Y-%m-%d')

    employees = db.query(User).filter(User.is_active == True).all()
    if not employees:
        return {"error": "Ni aktivnih zaposlenih"}

    # Default shifts if none specified
    default_shifts = [{"start": "06:00", "end": "14:00"}, {"start": "14:00", "end": "22:00"}, {"start": "22:00", "end": "06:00"}]
    shifts_to_fill = req.shifts_per_day if req.shifts_per_day else default_shifts

    created = []
    current = start_dt
    while current <= end_dt:
        for shift in shifts_to_fill:
            # Get available employees (no overlapping shifts)
            shift_start = shift["start"]
            shift_end = shift["end"]

            available = []
            for emp in employees:
                # Check if employee already has a shift at this time
                overlap = db.query(EmployeeShift).filter(
                    EmployeeShift.user_id == emp.id,
                    EmployeeShift.date == current.strftime('%Y-%m-%d'),
                    EmployeeShift.start_time < shift_end,
                    EmployeeShift.end_time > shift_start
                ).first()

                if not overlap:
                    available.append(emp)

            if not available:
                continue

            # Randomly select employees based on requirements
            count = random.randint(req.min_per_shift, min(req.max_per_shift, len(available)))
            selected = random.sample(available, count)

            for emp in selected:
                new_shift = EmployeeShift(
                    user_id=emp.id,
                    date=current.strftime('%Y-%m-%d'),
                    start_time=shift_start,
                    end_time=shift_end,
                    role=getattr(emp, 'role', ''),
                    notes='Avtomatsko generirano'
                )
                db.add(new_shift)
                created.append({
                    "user_id": emp.id,
                    "employee_name": getattr(emp, 'full_name', emp.username),
                    "date": current.strftime('%Y-%m-%d'),
                    "start_time": shift_start,
                    "end_time": shift_end,
                })

        current += timedelta(days=1)

    db.commit()

    return {
        "message": f"Generiranih {len(created)} izmen",
        "created": len(created),
        "period": {"start": req.start_date, "end": req.end_date}
    }
