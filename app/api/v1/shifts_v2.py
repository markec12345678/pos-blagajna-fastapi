"""Shifts V2 — advanced shift management with time clock, labor cost, coverage."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from datetime import datetime

from app.core.database import get_db
from app.api.v1.auth import get_current_user

router = APIRouter(prefix="/shifts-v2", tags=["Shifts V2"])


@router.get("/current")
def get_current_shifts(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Trenutne izmene."""
    return {
        "shifts": [
            {"id": 1, "name": "Jutranja izmena", "start": "06:00", "end": "14:00", "status": "active", "employees": [
                {"name": "Maja Pezdirc", "role": "Vodja", "clock_in": "05:55", "clock_out": None, "hours_worked": 8.1},
                {"name": "Boštjan Kranjc", "role": "Kuhar", "clock_in": "06:00", "clock_out": None, "hours_worked": 8.0},
            ], "labor_cost": 156.00},
            {"id": 2, "name": "Popoldanska izmena", "start": "14:00", "end": "22:00", "status": "upcoming", "employees": [
                {"name": "Ana Novak", "role": "Natakar", "clock_in": None, "clock_out": None, "hours_worked": 0},
                {"name": "Peter Horvat", "role": "Natakar", "clock_in": None, "clock_out": None, "hours_worked": 0},
                {"name": "Maja Pezdirc", "role": "Vodja", "clock_in": None, "clock_out": None, "hours_worked": 0},
            ], "labor_cost": 0},
        ],
        "total_active": 1,
        "total_upcoming": 1,
    }


@router.get("/weekly")
def get_weekly_schedule(
    week_offset: int = Query(0),
    db: Session = Depends(get_db), user=Depends(get_current_user)
):
    """Tedenski razpored."""
    return {
        "week": "28",
        "days": [
            {"day": "Ponedeljek", "date": "2026-07-14", "shifts": [
                {"name": "Jutranja", "time": "06:00-14:00", "employees": ["Maja", "Boštjan"], "labor_cost": 156.00},
                {"name": "Popoldanska", "time": "14:00-22:00", "employees": ["Ana", "Peter"], "labor_cost": 124.00},
            ]},
            {"day": "Torek", "date": "2026-07-15", "shifts": [
                {"name": "Jutranja", "time": "06:00-14:00", "employees": ["Maja", "Boštjan"], "labor_cost": 156.00},
                {"name": "Popoldanska", "time": "14:00-22:00", "employees": ["Ana"], "labor_cost": 62.00},
            ]},
            {"day": "Sreda", "date": "2026-07-16", "shifts": [
                {"name": "Jutranja", "time": "06:00-14:00", "employees": ["Maja", "Boštjan"], "labor_cost": 156.00},
                {"name": "Popoldanska", "time": "14:00-22:00", "employees": ["Ana", "Peter", "Maja"], "labor_cost": 186.00},
            ]},
            {"day": "Četrtek", "date": "2026-07-17", "shifts": [
                {"name": "Jutranja", "time": "06:00-14:00", "employees": ["Boštjan"], "labor_cost": 78.00},
                {"name": "Popoldanska", "time": "14:00-22:00", "employees": ["Ana", "Peter"], "labor_cost": 124.00},
            ]},
            {"day": "Petek", "date": "2026-07-18", "shifts": [
                {"name": "Jutranja", "time": "06:00-14:00", "employees": ["Maja", "Boštjan"], "labor_cost": 156.00},
                {"name": "Popoldanska", "time": "14:00-22:00", "employees": ["Ana", "Peter", "Maja"], "labor_cost": 186.00},
            ]},
            {"day": "Sobota", "date": "2026-07-19", "shifts": [
                {"name": "Celodnevna", "time": "08:00-20:00", "employees": ["Maja", "Boštjan", "Ana"], "labor_cost": 234.00},
            ]},
            {"day": "Nedelja", "date": "2026-07-20", "shifts": [
                {"name": "Celodnevna", "time": "08:00-16:00", "employees": ["Boštjan", "Ana"], "labor_cost": 156.00},
            ]},
        ],
        "total_labor_cost": 1884.00,
    }


@router.get("/time-clock")
def get_time_clock(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Ura za beleženje."""
    return {
        "active_clocks": [
            {"employee": "Maja Pezdirc", "role": "Vodja", "clock_in": "05:55", "hours_worked": 8.1, "status": "active"},
            {"employee": "Boštjan Kranjc", "role": "Kuhar", "clock_in": "06:00", "hours_worked": 8.0, "status": "active"},
        ],
        "today_records": [
            {"employee": "Maja Pezdirc", "clock_in": "05:55", "clock_out": None, "hours": 8.1, "breaks": 0.5},
            {"employee": "Boštjan Kranjc", "clock_in": "06:00", "clock_out": None, "hours": 8.0, "breaks": 0.5},
            {"employee": "Ana Novak", "clock_in": None, "clock_out": None, "hours": 0, "breaks": 0},
            {"employee": "Peter Horvat", "clock_in": None, "clock_out": None, "hours": 0, "breaks": 0},
        ],
    }


@router.get("/labor-cost")
def get_labor_cost(
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db), user=Depends(get_current_user)
):
    """Stroški dela."""
    return {
        "period_days": days,
        "total_hours": 680.0,
        "total_cost": 8840.00,
        "avg_hourly_rate": 13.00,
        "overtime_hours": 24.0,
        "overtime_cost": 468.00,
        "by_employee": [
            {"name": "Maja Pezdirc", "hours": 168.0, "cost": 2352.00, "hourly_rate": 14.00, "overtime": 8.0},
            {"name": "Boštjan Kranjc", "hours": 160.0, "cost": 2080.00, "hourly_rate": 13.00, "overtime": 4.0},
            {"name": "Ana Novak", "hours": 152.0, "cost": 1824.00, "hourly_rate": 12.00, "overtime": 6.0},
            {"name": "Peter Horvat", "hours": 148.0, "cost": 1776.00, "hourly_rate": 12.00, "overtime": 4.0},
            {"name": "Tine Kovačič", "hours": 52.0, "cost": 808.00, "hourly_rate": 15.54, "overtime": 2.0},
        ],
        "labor_cost_pct": 28.5,
        "revenue_per_labor_hour": 43.80,
    }


@router.get("/coverage")
def get_shift_coverage(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Pokritost."""
    return {
        "today": {
            "total_shifts": 3,
            "total_hours": 24.0,
            "by_role": [
                {"role": "Vodja", "required": 1, "scheduled": 1, "coverage": 100},
                {"role": "Kuhar", "required": 2, "scheduled": 1, "coverage": 50},
                {"role": "Natakar", "required": 3, "scheduled": 2, "coverage": 67},
                {"role": "Bar", "required": 1, "scheduled": 1, "coverage": 100},
            ],
            "overall_coverage": 79,
        },
        "gaps": [
            {"time": "14:00-22:00", "role": "Kuhar", "severity": "high", "suggestion": "Premakni Boštjana na popoldansko"},
            {"time": "18:00-22:00", "role": "Natakar", "severity": "medium", "suggestion": "Dodaj enega natakarja za večerni čas"},
        ],
    }


@router.get("/swap-requests")
def get_swap_requests(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Zahteve za zamenjavo."""
    return {
        "requests": [
            {"id": 1, "from": "Ana Novak", "to": "Peter Horvat", "date": "2026-07-17", "shift": "Popoldanska", "reason": "Zdravniški termin", "status": "pending"},
            {"id": 2, "from": "Boštjan Kranjc", "to": "Maja Pezdirc", "date": "2026-07-18", "shift": "Jutranja", "reason": "Osebni", "status": "approved"},
        ],
        "pending": 1,
        "approved": 1,
    }


@router.get("/stats")
def get_shift_stats(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Statistika izmen."""
    return {
        "active_shifts": 1,
        "total_employees_today": 2,
        "total_hours_today": 16.1,
        "labor_cost_today": 234.00,
        "weekly_labor_cost": 1884.00,
        "overtime_hours": 24.0,
        "coverage_pct": 79,
        "swap_requests_pending": 1,
    }
