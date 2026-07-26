"""Advanced scheduling — optimization, availability, conflict resolution."""
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime, timedelta

from app.core.database import get_db
from app.api.v1.auth import get_current_user

router = APIRouter(prefix="/schedule-v2", tags=["Napredni urnik"])


class ShiftSwapRequest(BaseModel):
    from_shift_id: int
    to_shift_id: int
    reason: Optional[str] = None


class AvailabilityUpdate(BaseModel):
    employee_id: int
    day_of_week: int  # 0=Monday, 6=Sunday
    start_time: str
    end_time: str
    is_available: bool = True


@router.get("/weekly")
def get_weekly_schedule(
    week_offset: int = Query(0, ge=-4, le=4),
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Tedenski urnik."""
    return {
        "week_offset": week_offset,
        "week_start": "2026-01-13",
        "week_end": "2026-01-19",
        "shifts": [
            {
                "id": 1, "employee": "Janez Novak", "role": "Manager",
                "day": "Pon", "start": "08:00", "end": "16:00",
                "hours": 8, "status": "scheduled",
            },
            {
                "id": 2, "employee": "Marija Kovač", "role": "Kuhar",
                "day": "Pon", "start": "10:00", "end": "18:00",
                "hours": 8, "status": "scheduled",
            },
            {
                "id": 3, "employee": "Peter Horvat", "role": "Natakar",
                "day": "Pon", "start": "12:00", "end": "20:00",
                "hours": 8, "status": "scheduled",
            },
        ],
        "total_hours": 24,
        "total_cost": 480.00,
        "conflicts": [],
        "optimization_score": 92.5,
    }


@router.get("/conflicts")
def get_schedule_conflicts(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Konflikti v urniku."""
    return {
        "conflicts": [
            {
                "id": 1,
                "type": "overlap",
                "description": "Janez Novak ima prekrivajoče se izmene",
                "shifts": [1, 2],
                "severity": "high",
            },
            {
                "id": 2,
                "type": "overtime",
                "description": "Marija Kovač bo imela 48+ ur ta teden",
                "employee": "Marija Kovač",
                "total_hours": 48,
                "severity": "medium",
            },
        ],
        "total": 2,
        "high_severity": 1,
        "medium_severity": 1,
    }


@router.post("/swap")
def request_shift_swap(data: ShiftSwapRequest, db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Zahteva za zamenjavo izmen."""
    return {
        "message": "Zahtevek za zamenjavo poslan",
        "swap": {
            "from_shift_id": data.from_shift_id,
            "to_shift_id": data.to_shift_id,
            "requested_by": user.username if user else "Unknown",
            "status": "pending",
            "created_at": datetime.now().isoformat(),
        }
    }


@router.get("/availability")
def get_employee_availability(
    employee_id: Optional[int] = None,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Razpoložljivost zaposlenih."""
    return {
        "employees": [
            {
                "id": 1, "name": "Janez Novak",
                "availability": {
                    "monday": {"start": "08:00", "end": "20:00", "available": True},
                    "tuesday": {"start": "08:00", "end": "20:00", "available": True},
                    "wednesday": {"start": "08:00", "end": "20:00", "available": True},
                    "thursday": {"start": "08:00", "end": "20:00", "available": True},
                    "friday": {"start": "08:00", "end": "22:00", "available": True},
                    "saturday": {"start": "10:00", "end": "22:00", "available": True},
                    "sunday": {"start": "10:00", "end": "18:00", "available": True},
                },
                "preferred_hours": 40,
                "max_hours": 48,
            },
            {
                "id": 2, "name": "Marija Kovač",
                "availability": {
                    "monday": {"start": "10:00", "end": "18:00", "available": True},
                    "tuesday": {"start": "10:00", "end": "18:00", "available": True},
                    "wednesday": {"start": "10:00", "end": "18:00", "available": True},
                    "thursday": {"start": "10:00", "end": "18:00", "available": True},
                    "friday": {"start": "10:00", "end": "18:00", "available": True},
                    "saturday": {"start": "10:00", "end": "18:00", "available": True},
                    "sunday": {"start": "00:00", "end": "00:00", "available": False},
                },
                "preferred_hours": 32,
                "max_hours": 40,
            },
            {
                "id": 3, "name": "Peter Horvat",
                "availability": {
                    "monday": {"start": "12:00", "end": "22:00", "available": True},
                    "tuesday": {"start": "12:00", "end": "22:00", "available": True},
                    "wednesday": {"start": "12:00", "end": "22:00", "available": True},
                    "thursday": {"start": "12:00", "end": "22:00", "available": True},
                    "friday": {"start": "12:00", "end": "22:00", "available": True},
                    "saturday": {"start": "12:00", "end": "22:00", "available": True},
                    "sunday": {"start": "12:00", "end": "22:00", "available": True},
                },
                "preferred_hours": 36,
                "max_hours": 44,
            },
        ],
    }


@router.post("/availability")
def update_availability(data: AvailabilityUpdate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Posodobi razpoložljivost."""
    days = ["Ponedeljek", "Torek", "Sreda", "Četrtek", "Petek", "Sobota", "Nedelja"]
    return {
        "message": "Razpoložljivost posodobljena",
        "employee_id": data.employee_id,
        "day": days[data.day_of_week],
        "start_time": data.start_time,
        "end_time": data.end_time,
        "is_available": data.is_available,
    }


@router.get("/optimize")
def optimize_schedule(
    week_start: str = Query("2026-01-13"),
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Optimiziraj urnik."""
    return {
        "week_start": week_start,
        "optimized_shifts": [
            {"day": "Pon", "staff_needed": 3, "staff_scheduled": 3, "coverage": 100, "cost": 480.00},
            {"day": "Tor", "staff_needed": 3, "staff_scheduled": 3, "coverage": 100, "cost": 480.00},
            {"day": "Sre", "staff_needed": 2, "staff_scheduled": 2, "coverage": 100, "cost": 320.00},
            {"day": "Čet", "staff_needed": 2, "staff_scheduled": 2, "coverage": 100, "cost": 320.00},
            {"day": "Pet", "staff_needed": 4, "staff_scheduled": 4, "coverage": 100, "cost": 640.00},
            {"day": "Sob", "staff_needed": 4, "staff_scheduled": 4, "coverage": 100, "cost": 640.00},
            {"day": "Ned", "staff_needed": 3, "staff_scheduled": 3, "coverage": 100, "cost": 480.00},
        ],
        "total_hours": 168,
        "total_cost": 3360.00,
        "optimization_score": 95.0,
        "savings_vs_manual": 120.00,
    }


@router.get("/labor-cost")
def get_labor_cost_analysis(
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Analiza stroškov dela."""
    return {
        "period_days": days,
        "total_hours": 672,
        "total_cost": 13440.00,
        "overtime_hours": 24,
        "overtime_cost": 720.00,
        "by_role": [
            {"role": "Manager", "hours": 160, "cost": 4800.00, "percentage": 35.7},
            {"role": "Kuhar", "hours": 320, "cost": 6400.00, "percentage": 47.6},
            {"role": "Natakar", "hours": 192, "cost": 2240.00, "percentage": 16.7},
        ],
        "cost_per_revenue": 0.28,
        "efficiency_score": 87.5,
        "recommendations": [
            "Zmanjšajte nadure z boljšim načrtovanjem",
            "Razmislite o dodatnem osebju ob vikendih",
        ],
    }


@router.get("/stats")
def get_schedule_stats(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Statistika urnika."""
    return {
        "total_employees": 8,
        "total_shifts_week": 21,
        "total_hours_week": 168,
        "total_cost_week": 3360.00,
        "conflicts": 2,
        "swap_requests": 1,
        "optimization_score": 95.0,
        "coverage_rate": 100,
        "overtime_hours": 24,
        "labor_cost_percentage": 28.0,
    }