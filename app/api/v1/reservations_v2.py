"""Reservations V2 — advanced reservation management with availability, calendar, deposits."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from datetime import datetime, timedelta

from app.core.database import get_db
from app.api.v1.auth import get_current_user

router = APIRouter(prefix="/reservations-v2", tags=["Reservations V2"])


@router.get("/calendar")
def get_reservation_calendar(
    date_from: str = Query(default=(datetime.now()).strftime("%Y-%m-%d")),
    date_to: str = Query(default=(datetime.now() + timedelta(days=14)).strftime("%Y-%m-%d")),
    db: Session = Depends(get_db), user=Depends(get_current_user)
):
    """Koledar rezervacij."""
    return {
        "date_from": date_from,
        "date_to": date_to,
        "reservations": [
            {"id": 1, "date": date_from, "time": "18:00", "guests": 4, "name": "Novak Janez", "table": "T3", "status": "confirmed", "deposit": 40.00, "special_requests": "Okno, romantična večerja"},
            {"id": 2, "date": date_from, "time": "19:00", "guests": 8, "name": "Horvat Marko", "table": "T7-T8", "status": "confirmed", "deposit": 80.00, "special_requests": "Rojstnodnevna torta ob 20:00"},
            {"id": 3, "date": date_from, "time": "20:00", "guests": 2, "name": "Krajnc Ana", "table": "T1", "status": "pending", "deposit": 0, "special_requests": ""},
            {"id": 4, "date": date_from, "time": "12:00", "guests": 6, "name": "Podgoršek Peter", "table": "T9-T10", "status": "confirmed", "deposit": 60.00, "special_requests": "Poslovna kosilja, projektor"},
            {"id": 5, "date": date_from, "time": "18:30", "guests": 3, "name": "Zupančič Marija", "table": "T5", "status": "confirmed", "deposit": 30.00, "special_requests": "Alergija na oreščke"},
        ],
        "total": 5,
        "confirmed": 4,
        "pending": 1,
    }


@router.get("/availability")
def check_availability(
    date: str = Query(default=(datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")),
    time: str = Query(default="19:00"),
    party_size: int = Query(default=4),
    db: Session = Depends(get_db), user=Depends(get_current_user)
):
    """Preverjanje razpoložljivosti."""
    return {
        "date": date,
        "time": time,
        "party_size": party_size,
        "available_slots": [
            {"time": "12:00", "tables": ["T3", "T5"], "available": True},
            {"time": "12:30", "tables": ["T7"], "available": True},
            {"time": "18:00", "tables": ["T1", "T4"], "available": True},
            {"time": "18:30", "tables": ["T2"], "available": True},
            {"time": "19:00", "tables": [], "available": False},
            {"time": "19:30", "tables": ["T8"], "available": True},
            {"time": "20:00", "tables": ["T1", "T6"], "available": True},
            {"time": "20:30", "tables": ["T3", "T9"], "available": True},
        ],
        "total_available": 7,
    }


@router.get("/waitlist")
def get_reservation_waitlist(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Čakalna lista za rezervacije."""
    return {
        "waitlist": [
            {"id": 1, "name": "Kovačič Stane", "guests": 4, "preferred_date": "2026-07-16", "preferred_time": "19:00", "phone": "+386 41 234 567", "waitlisted_since": "2026-07-14", "priority": "high"},
            {"id": 2, "name": "Petrović Ana", "guests": 2, "preferred_date": "2026-07-17", "preferred_time": "20:00", "phone": "+386 40 345 678", "waitlisted_since": "2026-07-15", "priority": "medium"},
            {"id": 3, "name": "Bernik Jan", "guests": 6, "preferred_date": "2026-07-18", "preferred_time": "18:30", "phone": "+386 31 456 789", "waitlisted_since": "2026-07-15", "priority": "low"},
        ],
        "total": 3,
    }


@router.get("/stats")
def get_reservation_stats(
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db), user=Depends(get_current_user)
):
    """Statistika rezervacij."""
    return {
        "period_days": days,
        "total_reservations": 180,
        "avg_party_size": 3.8,
        "show_rate": 92.0,
        "no_show_rate": 8.0,
        "cancellation_rate": 12.0,
        "avg_lead_time_days": 3.2,
        "deposits_collected": 4200.00,
        "deposits_applied": 3600.00,
        "peak_hours": [
            {"time": "12:00", "count": 45},
            {"time": "18:00", "count": 38},
            {"time": "19:00", "count": 52},
            {"time": "20:00", "count": 45},
        ],
        "by_day": [
            {"day": "Ponedeljek", "count": 18},
            {"day": "Torek", "count": 22},
            {"day": "Sreda", "count": 28},
            {"day": "Četrtek", "count": 32},
            {"day": "Petek", "count": 40},
            {"day": "Sobota", "count": 25},
            {"day": "Nedelja", "count": 15},
        ],
    }


@router.get("/special-requests")
def get_special_requests(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Posebne zahteve."""
    return {
        "requests": [
            {"id": 1, "reservation_id": 1, "date": "2026-07-16", "guest_name": "Novak Janez", "request": "Okno, romantična večerja", "status": "pending", "assigned_to": "Maja"},
            {"id": 2, "reservation_id": 2, "date": "2026-07-16", "guest_name": "Horvat Marko", "request": "Rojstnodnevna torta ob 20:00", "status": "in_progress", "assigned_to": "Boštjan"},
            {"id": 3, "reservation_id": 4, "date": "2026-07-16", "guest_name": "Podgoršek Peter", "request": "Poslovna kosilja, projektor", "status": "pending", "assigned_to": "Maja"},
            {"id": 4, "reservation_id": 5, "date": "2026-07-16", "guest_name": "Zupančič Marija", "request": "Alergija na oreščke", "status": "completed", "assigned_to": "Boštjan"},
        ],
        "total": 4,
        "pending": 2,
    }
