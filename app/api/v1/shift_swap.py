"""Shift swap between employees."""
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime, timedelta

from app.core.database import get_db
from app.api.v1.auth import get_current_user

router = APIRouter(prefix="/shift-swap", tags=["Menjava izmen"])


class SwapRequest(BaseModel):
    shift_id: int
    target_user_id: int
    reason: Optional[str] = None


class SwapApproval(BaseModel):
    swap_id: int
    approved: bool
    note: Optional[str] = None


@router.get("/requests")
def get_swap_requests(
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Vrni zahteve za menjavo izmen."""
    from app.models.shift import EmployeeShift
    from app.models.user import User

    # Get current user's shifts
    current_user_id = user.id

    # For now, return all pending swaps
    # In production, you'd have a ShiftSwapRequest table
    shifts = db.query(EmployeeShift).filter(
        EmployeeShift.user_id == current_user_id
    ).all()

    # Get other employees
    employees = db.query(User).filter(User.is_active == True, User.id != current_user_id).all()
    employee_map = {e.id: getattr(e, 'full_name', e.username) for e in employees}

    return {
        "my_shifts": [{
            "id": s.id,
            "date": s.date.strftime('%Y-%m-%d') if hasattr(s.date, 'strftime') else str(s.date),
            "start_time": getattr(s, 'start_time', ''),
            "end_time": getattr(s, 'end_time', ''),
            "role": getattr(s, 'role', ''),
        } for s in shifts],
        "available_swaps": [{
            "id": e.id,
            "name": employee_map.get(e.id, e.username),
            "role": getattr(e, 'role', ''),
        } for e in employees],
        "pending_requests": [],  # Would come from SwapRequest table
    }


@router.post("/request")
def request_swap(data: SwapRequest, db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Zahtevaj menjavo izme z drugim zaposlenim."""
    from app.models.shift import EmployeeShift
    from app.models.user import User

    shift = db.query(EmployeeShift).filter(EmployeeShift.id == data.shift_id).first()
    if not shift:
        return {"error": "Izmena ni najdena"}

    if getattr(shift, 'user_id', None) != user.id:
        return {"error": "To ni vaša izmena"}

    target = db.query(User).filter(User.id == data.target_user_id).first()
    if not target:
        return {"error": "Zaposleni ni najden"}

    # In production: create SwapRequest record
    # For now: return confirmation
    return {
        "message": f"Zahteva za menjavo poslana {getattr(target, 'full_name', target.username)}",
        "swap_request": {
            "shift_id": data.shift_id,
            "from_user": user.id,
            "to_user": data.target_user_id,
            "reason": data.reason,
            "status": "pending"
        }
    }


@router.post("/approve")
def approve_swap(data: SwapApproval, db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Odobri ali zavrni zahtevo za menjavo."""
    # In production: update SwapRequest status
    return {
        "message": "Zahteva odobrena" if data.approved else "Zahteva zavrnjena",
        "swap_id": data.swap_id,
        "approved": data.approved
    }


@router.get("/my-schedule")
def get_my_schedule(
    weeks: int = Query(2, ge=1, le=4),
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Vrni urnik trenutnega uporabnika za naslednjih N tednov."""
    from app.models.planned_shift import PlannedShift

    start = datetime.now()
    end = start + timedelta(weeks=weeks)

    shifts = db.query(PlannedShift).filter(
        PlannedShift.user_id == user.id,
        PlannedShift.date >= start.date(),
        PlannedShift.date <= end.date()
    ).order_by(PlannedShift.date).all()

    schedule = []
    for s in shifts:
        schedule.append({
            "id": s.id,
            "date": str(s.date),
            "day": s.date.strftime('%A') if hasattr(s.date, 'strftime') else '',
            "start_time": s.start_time,
            "end_time": s.end_time,
            "role": s.role or '',
            "notes": s.notes or '',
        })

    return {
        "user_id": user.id,
        "period": {
            "start": start.strftime('%Y-%m-%d'),
            "end": end.strftime('%Y-%m-%d')
        },
        "shifts": schedule,
        "total_hours": sum(_calc_hours(s) for s in shifts)
    }


def _calc_hours(shift) -> float:
    try:
        start_parts = str(getattr(shift, 'start_time', '0:0')).split(':')
        end_parts = str(getattr(shift, 'end_time', '0:0')).split(':')
        hours = (int(end_parts[0]) + int(end_parts[1])/60) - (int(start_parts[0]) + int(start_parts[1])/60)
        return max(0, round(hours, 1))
    except:
        return 0


@router.get("/availability")
def check_swap_availability(
    shift_id: int,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Preveri, kdo je na voljo za menjavo določene izmene."""
    from app.models.shift import EmployeeShift
    from app.models.user import User

    shift = db.query(EmployeeShift).filter(EmployeeShift.id == shift_id).first()
    if not shift:
        return {"error": "Izmena ni najdena"}

    shift_date = shift.date
    shift_start = getattr(shift, 'start_time', '')
    shift_end = getattr(shift, 'end_time', '')

    # Find employees who don't have overlapping shifts
    all_employees = db.query(User).filter(User.is_active == True, User.id != user.id).all()

    available = []
    for emp in all_employees:
        overlap = db.query(EmployeeShift).filter(
            EmployeeShift.user_id == emp.id,
            EmployeeShift.date == shift_date,
            EmployeeShift.start_time < shift_end,
            EmployeeShift.end_time > shift_start
        ).first()

        if not overlap:
            # Check their total hours for the week
            week_start = shift_date - timedelta(days=shift_date.weekday())
            week_end = week_start + timedelta(days=6)
            week_shifts = db.query(EmployeeShift).filter(
                EmployeeShift.user_id == emp.id,
                EmployeeShift.date >= week_start.strftime('%Y-%m-%d'),
                EmployeeShift.date <= week_end.strftime('%Y-%m-%d')
            ).all()
            total_hours = sum(_calc_hours(s) for s in week_shifts)

            available.append({
                "user_id": emp.id,
                "name": getattr(emp, 'full_name', emp.username),
                "role": getattr(emp, 'role', ''),
                "weekly_hours": total_hours,
                "can_swap": total_hours < 40  # Max 40 hours/week
            })

    return {
        "shift_id": shift_id,
        "date": shift_date.strftime('%Y-%m-%d') if hasattr(shift_date, 'strftime') else str(shift_date),
        "time": f"{shift_start} - {shift_end}",
        "available_employees": available
    }
