"""Tables V2 — advanced table management with status, layout, QR, orders."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.v1.auth import get_current_user

router = APIRouter(prefix="/tables-v2", tags=["Tables V2"])


@router.get("/status")
def get_table_status(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Stanje miz."""
    return {
        "tables": [
            {"id": 1, "number": "T1", "status": "occupied", "guests": 2, "server": "Ana Novak", "since": "12:30", "order_total": 45.80, "qr_url": "/order/1"},
            {"id": 2, "number": "T2", "status": "occupied", "guests": 4, "server": "Peter Horvat", "since": "12:45", "order_total": 78.50, "qr_url": "/order/2"},
            {"id": 3, "number": "T3", "status": "reserved", "guests": 4, "reservation_time": "18:00", "guest_name": "Novak Janez", "qr_url": "/order/3"},
            {"id": 4, "number": "T4", "status": "free", "guests": 0, "qr_url": "/order/4"},
            {"id": 5, "number": "T5", "status": "occupied", "guests": 3, "server": "Ana Novak", "since": "13:00", "order_total": 62.30, "qr_url": "/order/5"},
            {"id": 6, "number": "T6", "status": "free", "guests": 0, "qr_url": "/order/6"},
            {"id": 7, "number": "T7", "status": "reserved", "guests": 8, "reservation_time": "19:00", "guest_name": "Horvat Marko", "qr_url": "/order/7"},
            {"id": 8, "number": "T8", "status": "free", "guests": 0, "qr_url": "/order/8"},
            {"id": 9, "number": "T9", "status": "occupied", "guests": 6, "server": "Peter Horvat", "since": "12:00", "order_total": 125.40, "qr_url": "/order/9"},
            {"id": 10, "number": "T10", "status": "free", "guests": 0, "qr_url": "/order/10"},
        ],
        "summary": {"total": 10, "occupied": 4, "reserved": 2, "free": 4, "occupancy": 60},
    }


@router.get("/layout")
def get_table_layout(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Postavitev miz."""
    return {
        "areas": [
            {"name": "Glavna dvorana", "tables": [1, 2, 3, 4, 5, 6], "capacity": 24},
            {"name": "Vrt", "tables": [7, 8, 9, 10], "capacity": 20},
        ],
        "total_capacity": 44,
        "current_guests": 15,
    }


@router.get("/table-orders")
def get_table_orders(table_id: int = Query(...), db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Naročila za mizo."""
    return {
        "table_id": table_id,
        "orders": [
            {"id": 101, "time": "12:30", "items": [{"name": "Štruklji", "qty": 2, "price": 14.50}, {"name": "Jota", "qty": 1, "price": 7.50}], "total": 36.50, "status": "served"},
            {"id": 102, "time": "13:00", "items": [{"name": "Kava", "qty": 2, "price": 2.00}], "total": 4.00, "status": "served"},
        ],
        "total": 40.50,
        "items_count": 5,
    }


@router.get("/analytics")
def get_table_analytics(
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db), user=Depends(get_current_user)
):
    """Analitika miz."""
    return {
        "period_days": days,
        "avg_turnover": 3.2,
        "avg_seating_time_min": 65,
        "peak_hours": ["12:00-13:00", "19:00-20:00"],
        "busiest_table": "T9",
        "revenue_per_table": 2978.00,
        "by_area": [
            {"area": "Glavna dvorana", "revenue": 17868.00, "covers": 1209, "avg_turnover": 3.5},
            {"area": "Vrt", "revenue": 11912.00, "covers": 806, "avg_turnover": 2.8},
        ],
    }


@router.get("/stats")
def get_tables_stats(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Statistika miz."""
    return {
        "total_tables": 10,
        "total_capacity": 44,
        "occupied": 4,
        "reserved": 2,
        "free": 4,
        "occupancy": 60,
        "current_guests": 15,
    }
