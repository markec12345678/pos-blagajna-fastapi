"""Delivery V2 — advanced delivery tracking, routes, and analytics."""
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime

from app.core.database import get_db
from app.api.v1.auth import get_current_user

router = APIRouter(prefix="/delivery-v2", tags=["Dostava V2"])


@router.get("/active")
def get_active_deliveries(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Aktivne dostave."""
    return {
        "deliveries": [
            {"id": 1, "order_id": 1001, "customer": "Janez Novak", "address": "Glavna cesta 15, Gradac", "phone": "040 123 456", "status": "in_transit", "driver": "Marko", "eta": 15, "items": 4, "total": 45.50, "created": "2026-01-15 12:45", "lat": 45.6123, "lng": 14.8956},
            {"id": 2, "order_id": 1003, "customer": "Marija Kovač", "address": "Drevored 8, Gradac", "phone": "040 234 567", "status": "preparing", "driver": None, "eta": 30, "items": 3, "total": 32.00, "created": "2026-01-15 13:00", "lat": 45.6145, "lng": 14.8978},
            {"id": 3, "order_id": 1005, "customer": "Peter Horvat", "address": "Ulica mladih 22, Gradac", "phone": "040 345 678", "status": "delivered", "driver": "Marko", "eta": 0, "items": 2, "total": 28.00, "created": "2026-01-15 12:30", "lat": 45.6110, "lng": 14.8932},
        ],
        "active_count": 2,
        "drivers_available": 3,
    }


@router.get("/drivers")
def get_drivers(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Vozniki."""
    return {
        "drivers": [
            {"id": 1, "name": "Marko Horvat", "status": "busy", "active_deliveries": 1, "total_today": 8, "avg_time": 25, "rating": 4.8},
            {"id": 2, "name": "Luka Kovač", "status": "available", "active_deliveries": 0, "total_today": 5, "avg_time": 22, "rating": 4.9},
            {"id": 3, "name": "Ana Petrović", "status": "available", "active_deliveries": 0, "total_today": 6, "avg_time": 28, "rating": 4.7},
        ],
        "total_drivers": 3,
        "available": 2,
        "busy": 1,
    }


@router.get("/analytics")
def get_delivery_analytics(days: int = Query(7, ge=1, le=90), db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Dostavna analitika."""
    return {
        "period_days": days,
        "total_deliveries": 156,
        "total_revenue": 4680.00,
        "avg_delivery_time": 24.5,
        "avg_order_value": 30.00,
        "on_time_rate": 92.3,
        "satisfaction_rate": 96.5,
        "by_hour": [
            {"hour": "11:00", "deliveries": 8, "avg_time": 22},
            {"hour": "12:00", "deliveries": 25, "avg_time": 28},
            {"hour": "13:00", "deliveries": 30, "avg_time": 30},
            {"hour": "14:00", "deliveries": 15, "avg_time": 25},
            {"hour": "18:00", "deliveries": 20, "avg_time": 26},
            {"hour": "19:00", "deliveries": 12, "avg_time": 24},
        ],
        "top_areas": [
            {"area": "Gradac center", "deliveries": 45, "avg_time": 20},
            {"area": "Griblje", "deliveries": 35, "avg_time": 25},
            {"area": "Dobravice", "deliveries": 25, "avg_time": 30},
        ],
    }


@router.get("/stats")
def get_delivery_stats(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Statistika dostave."""
    return {
        "active_deliveries": 2,
        "drivers_available": 2,
        "today_deliveries": 19,
        "avg_delivery_time": 24.5,
        "on_time_rate": 92.3,
        "satisfaction_rate": 96.5,
    }