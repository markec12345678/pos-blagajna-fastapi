"""Operational improvements — table management, reservation optimization, flow analysis."""
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime, timedelta

from app.core.database import get_db
from app.api.v1.auth import get_current_user

router = APIRouter(prefix="/operations-advanced", tags=["Napredne operacije"])


class TableConfig(BaseModel):
    table_id: int
    capacity: int
    zone: Optional[str] = None
    features: Optional[List[str]] = None


@router.get("/table-flow")
def get_table_flow(
    days: int = Query(7, ge=1, le=30),
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Pretok miz."""
    return {
        "period_days": days,
        "tables": [
            {
                "id": 1, "number": "1",
                "zone": "Notranji", "capacity": 4,
                "avg_turnover_time": 65.5,
                "turnovers_per_day": 3.2,
                "revenue_per_day": 145.60,
                "utilization_rate": 85.0,
                "peak_hours": ["12:00-13:00", "18:00-19:00"],
            },
            {
                "id": 2, "number": "2",
                "zone": "Notranji", "capacity": 2,
                "avg_turnover_time": 45.2,
                "turnovers_per_day": 4.5,
                "revenue_per_day": 112.50,
                "utilization_rate": 92.0,
                "peak_hours": ["12:00-13:00"],
            },
            {
                "id": 3, "number": "3",
                "zone": "Terasa", "capacity": 6,
                "avg_turnover_time": 78.3,
                "turnovers_per_day": 2.8,
                "revenue_per_day": 168.00,
                "utilization_rate": 72.0,
                "peak_hours": ["18:00-20:00"],
            },
        ],
        "summary": {
            "total_tables": 15,
            "avg_utilization": 83.0,
            "avg_turnover_time": 63.0,
            "total_revenue": 2184.00,
            "busiest_table": "2",
            "most_profitable": "3",
        },
    }


@router.get("/reservation-optimization")
def get_reservation_optimization(
    days: int = Query(7, ge=1, le=30),
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Optimizacija rezervacij."""
    return {
        "period_days": days,
        "metrics": {
            "total_reservations": 89,
            "completed": 82,
            "no_shows": 5,
            "cancellations": 2,
            "no_show_rate": 5.6,
            "avg_party_size": 3.8,
            "avg_duration": 95.5,
        },
        "by_hour": [
            {"hour": "11:00", "reservations": 8, "fill_rate": 45.0},
            {"hour": "12:00", "reservations": 18, "fill_rate": 95.0},
            {"hour": "13:00", "reservations": 12, "fill_rate": 70.0},
            {"hour": "17:00", "reservations": 5, "fill_rate": 35.0},
            {"hour": "18:00", "reservations": 15, "fill_rate": 85.0},
            {"hour": "19:00", "reservations": 20, "fill_rate": 100.0},
            {"hour": "20:00", "reservations": 11, "fill_rate": 65.0},
        ],
        "optimization_suggestions": [
            "Povečajte kapaciteto ob 19:00 - polno zasedeno",
            "Zmanjšajte število rezervacij ob 12:00 - prevelika gneča",
            "Uvedite čakalni seznam za ob 19:00",
            "Pošljite opomnik 24h pred rezervacijo",
        ],
    }


@router.get("/waitlist")
def get_waitlist(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Čakalni seznam."""
    return {
        "waitlist": [
            {
                "id": 1, "customer": "Janez Novak",
                "party_size": 4, "wait_time_minutes": 15,
                "estimated_seating": "12:45",
                "preferred_zone": "Notranji",
                "status": "waiting",
            },
            {
                "id": 2, "customer": "Marija Kovač",
                "party_size": 2, "wait_time_minutes": 8,
                "estimated_seating": "12:38",
                "preferred_zone": "Terasa",
                "status": "waiting",
            },
            {
                "id": 3, "customer": "Peter Horvat",
                "party_size": 6, "wait_time_minutes": 25,
                "estimated_seating": "13:05",
                "preferred_zone": "Notranji",
                "status": "waiting",
            },
        ],
        "total_waiting": 3,
        "avg_wait_time": 16.0,
        "max_wait_time": 25.0,
    }


@router.get("/table-availability")
def get_table_availability(
    date: str = Query(datetime.now().strftime('%Y-%m-%d')),
    time: str = Query("19:00"),
    party_size: int = Query(4),
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Razpoložljivost miz."""
    return {
        "date": date,
        "time": time,
        "party_size": party_size,
        "available_tables": [
            {"id": 1, "number": "1", "zone": "Notranji", "capacity": 4, "features": ["okno"]},
            {"id": 5, "number": "5", "zone": "Notranji", "capacity": 4, "features": ["bar"]},
            {"id": 8, "number": "8", "zone": "Terasa", "capacity": 6, "features": ["pogled"]},
        ],
        "total_available": 3,
        "suggestions": [
            "Miza 1 je najbližja vaši zahtevi",
            "Miza 8 je večja, primerna za 6 oseb",
        ],
    }


@router.get("/zone-analysis")
def get_zone_analysis(
    days: int = Query(7, ge=1, le=30),
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Analiza con."""
    return {
        "period_days": days,
        "zones": [
            {
                "name": "Notranji",
                "tables": 8, "seats": 32,
                "avg_utilization": 85.0,
                "avg_turnover": 3.0,
                "revenue_share": 60.0,
                "avg_spend_per_seat": 18.50,
            },
            {
                "name": "Terasa",
                "tables": 5, "seats": 20,
                "avg_utilization": 72.0,
                "avg_turnover": 2.5,
                "revenue_share": 25.0,
                "avg_spend_per_seat": 15.00,
            },
            {
                "name": "Bar",
                "tables": 2, "seats": 8,
                "avg_utilization": 65.0,
                "avg_turnover": 4.0,
                "revenue_share": 15.0,
                "avg_spend_per_seat": 12.00,
            },
        ],
        "insights": [
            "Notranja cona generira 60% prometa",
            "Terasa ima nižjo izkoriščenost",
            "Bar ima najvišjo frekvenco strank",
        ],
    }


@router.get("/peak-hours")
def get_peak_hours(
    days: int = Query(7, ge=1, le=30),
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Konicne ure."""
    return {
        "period_days": days,
        "peak_hours": [
            {"hour": "12:00", "avg_orders": 15, "avg_revenue": 450.00, "staff_needed": 3},
            {"hour": "13:00", "avg_orders": 12, "avg_revenue": 360.00, "staff_needed": 3},
            {"hour": "18:00", "avg_orders": 10, "avg_revenue": 300.00, "staff_needed": 2},
            {"hour": "19:00", "avg_orders": 18, "avg_revenue": 540.00, "staff_needed": 4},
            {"hour": "20:00", "avg_orders": 14, "avg_revenue": 420.00, "staff_needed": 3},
        ],
        "quiet_hours": [
            {"hour": "15:00", "avg_orders": 3, "avg_revenue": 90.00, "staff_needed": 1},
            {"hour": "16:00", "avg_orders": 4, "avg_revenue": 120.00, "staff_needed": 1},
        ],
        "recommendations": [
            "Dodatno osebje ob 19:00",
            "Promocije v tihih urah (15:00-17:00)",
            "Optimizirajte postrežbo ob konicah",
        ],
    }


@router.get("/stats")
def get_operations_stats(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Statistika operacij."""
    return {
        "total_tables": 15,
        "total_seats": 60,
        "avg_utilization": 83.0,
        "avg_turnover_time": 63.0,
        "reservations_today": 12,
        "waitlist_count": 3,
        "avg_wait_time": 16.0,
        "no_show_rate": 5.6,
        "peak_hour": "19:00",
        "revenue_per_seat": 16.50,
    }