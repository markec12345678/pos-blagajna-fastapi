"""Waitlist V2 — advanced virtual queue management with notifications, analytics."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from datetime import datetime

from app.core.database import get_db
from app.api.v1.auth import get_current_user

router = APIRouter(prefix="/waitlist-v2", tags=["Waitlist V2"])


@router.get("/queue")
def get_waitlist_queue(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Čakalna vrsta."""
    return {
        "queue": [
            {"id": 1, "name": "Kovačič Stane", "party_size": 4, "phone": "+386 41 234 567", "joined_at": "18:15", "wait_minutes": 25, "status": "waiting", "notified": False, "priority": "high"},
            {"id": 2, "name": "Petrović Ana", "party_size": 2, "phone": "+386 40 345 678", "joined_at": "18:20", "wait_minutes": 20, "status": "waiting", "notified": False, "priority": "medium"},
            {"id": 3, "name": "Bernik Jan", "party_size": 6, "phone": "+386 31 456 789", "joined_at": "18:30", "wait_minutes": 10, "status": "waiting", "notified": False, "priority": "low"},
            {"id": 4, "name": "Zupančič Marija", "party_size": 3, "phone": "+386 41 567 890", "joined_at": "18:00", "wait_minutes": 40, "status": "notified", "notified": True, "priority": "medium"},
        ],
        "total": 4,
        "avg_wait_minutes": 24,
        "estimated_next_available": "18:45",
    }


@router.get("/analytics")
def get_waitlist_analytics(
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db), user=Depends(get_current_user)
):
    """Analitika čakalne liste."""
    return {
        "period_days": days,
        "total_guests": 285,
        "avg_wait_minutes": 22,
        "show_rate": 88.0,
        "no_show_rate": 12.0,
        "avg_party_size": 3.5,
        "conversion_rate": 78.0,
        "peak_wait_times": [
            {"time": "18:00-19:00", "avg_wait": 30},
            {"time": "19:00-20:00", "avg_wait": 25},
            {"time": "20:00-21:00", "avg_wait": 15},
        ],
        "by_priority": [
            {"priority": "high", "count": 45, "avg_wait": 18},
            {"priority": "medium", "count": 150, "avg_wait": 24},
            {"priority": "low", "count": 90, "avg_wait": 28},
        ],
    }


@router.get("/notifications")
def get_notification_stats(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Statistika obvestil."""
    return {
        "sent_today": 35,
        "delivered": 33,
        "failed": 2,
        "delivery_rate": 94.3,
        "avg_response_time_min": 5,
        "by_type": [
            {"type": "SMS", "count": 20, "delivery_rate": 95.0},
            {"type": "Klic", "count": 10, "delivery_rate": 90.0},
            {"type": "Email", "count": 5, "delivery_rate": 100.0},
        ],
    }


@router.get("/stats")
def get_waitlist_stats(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Statistika čakalne liste."""
    return {
        "in_queue": 4,
        "avg_wait": 22,
        "show_rate": 88.0,
        "notifications_sent": 35,
    }
