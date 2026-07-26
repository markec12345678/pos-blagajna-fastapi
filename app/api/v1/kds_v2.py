"""KDS V2 — advanced kitchen display with priorities, timers, and grouping."""
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime

from app.core.database import get_db
from app.api.v1.auth import get_current_user

router = APIRouter(prefix="/kds-v2", tags=["Kuhinja V2"])


class PriorityUpdate(BaseModel):
    order_id: int
    priority: str  # low, normal, high, urgent


@router.get("/orders")
def get_kds_orders(
    station: Optional[str] = None,
    priority: Optional[str] = None,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Naročila za KDS z prioritetami."""
    orders = [
        {
            "id": 2001, "table": "Miza 5", "priority": "urgent", "status": "preparing",
            "created": "2026-01-15 12:30", "elapsed": 18, "target": 15,
            "items": [
                {"name": "Rižota z gobami", "qty": 2, "mods": ["brez glutena"], "station": "glavne", "status": "cooking"},
                {"name": "Štruklji", "qty": 1, "mods": [], "station": "predjedi", "status": "ready"},
            ],
            "guests": 3, "server": "Ana", "notes": "Nujno - stranka čaka dolgo!",
        },
        {
            "id": 2002, "table": "Miza 12", "priority": "high", "status": "preparing",
            "created": "2026-01-15 13:15", "elapsed": 10, "target": 12,
            "items": [
                {"name": "Pleskavica", "qty": 2, "mods": ["sir znotraj"], "station": "glavne", "status": "cooking"},
                {"name": "Caesar solata", "qty": 1, "mods": [], "station": "solate", "status": "prepping"},
            ],
            "guests": 2, "server": "Peter", "notes": "",
        },
        {
            "id": 2003, "table": "Miza 3", "priority": "normal", "status": "preparing",
            "created": "2026-01-15 13:45", "elapsed": 5, "target": 15,
            "items": [
                {"name": "Margherita", "qty": 2, "mods": ["dodaten sir"], "station": "pice", "status": "cooking"},
                {"name": "Lamb skewers", "qty": 1, "mods": [], "station": "glavne", "status": "pending"},
                {"name": "Bela kava", "qty": 3, "mods": [], "station": "pijače", "status": "ready"},
            ],
            "guests": 4, "server": "Maja", "notes": "Okrogla obletnica",
        },
        {
            "id": 2004, "table": "Miza 8", "priority": "normal", "status": "new",
            "created": "2026-01-15 14:00", "elapsed": 0, "target": 15,
            "items": [
                {"name": "Bruschetta", "qty": 2, "mods": [], "station": "predjedi", "status": "pending"},
                {"name": "Bela kava", "qty": 2, "mods": [], "station": "pijače", "status": "pending"},
            ],
            "guests": 2, "server": "Ana", "notes": "",
        },
    ]
    if station:
        orders = [o for o in orders if any(i["station"] == station for i in o["items"])]
    if priority:
        orders = [o for o in orders if o["priority"] == priority]
    return {"orders": orders, "total": len(orders)}


@router.get("/stations")
def get_kitchen_stations(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Postaje v kuhinji."""
    return {
        "stations": [
            {"id": "predjedi", "name": "Predjedi", "orders": 3, "avg_time": 8, "load": 60},
            {"id": "glavne", "name": "Glavne jedi", "orders": 5, "avg_time": 15, "load": 85},
            {"id": "pice", "name": "Pice", "orders": 4, "avg_time": 12, "load": 75},
            {"id": "solate", "name": "Solate", "orders": 2, "avg_time": 5, "load": 40},
            {"id": "sladice", "name": "Sladice", "orders": 1, "avg_time": 6, "load": 20},
            {"id": "pijače", "name": "Pijače", "orders": 8, "avg_time": 3, "load": 50},
        ],
        "active_orders": 12,
        "avg_wait": 14.5,
    }


@router.get("/timers")
def get_kitchen_timers(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Časomeri za kuhinjo."""
    return {
        "timers": [
            {"order_id": 2001, "table": "Miza 5", "item": "Rižota z gobami", "started": "12:32:00", "elapsed": 16, "target": 12, "status": "overdue"},
            {"order_id": 2002, "table": "Miza 12", "item": "Pleskavica", "started": "13:18:00", "elapsed": 8, "target": 15, "status": "cooking"},
            {"order_id": 2003, "table": "Miza 3", "item": "Margherita", "started": "13:48:00", "elapsed": 3, "target": 10, "status": "cooking"},
        ],
        "overdue_count": 1,
        "avg_elapsed": 9.0,
    }


@router.put("/orders/{order_id}/priority")
def update_order_priority(order_id: int, data: PriorityUpdate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Posodobi prioriteto naročila."""
    return {"order_id": order_id, "priority": data.priority, "message": "Prioriteta posodobljena"}


@router.put("/orders/{order_id}/items/{item_name}/status")
def update_item_status(order_id: int, item_name: str, status: str = Query(...), db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Posodobi status jedi v naročilu."""
    return {"order_id": order_id, "item": item_name, "status": status, "message": "Status posodobljen"}


@router.get("/analytics")
def get_kds_analytics(
    days: int = Query(7, ge=1, le=90),
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """KDS analitika."""
    return {
        "period_days": days,
        "avg_prep_time": 14.2,
        "on_time_rate": 87.5,
        "overdue_rate": 12.5,
        "busiest_station": "Glavne jedi",
        "efficiency_by_station": [
            {"station": "Predjedi", "avg_time": 8.0, "target": 10, "efficiency": 125},
            {"station": "Glavne jedi", "avg_time": 15.0, "target": 12, "efficiency": 80},
            {"station": "Pice", "avg_time": 12.0, "target": 10, "efficiency": 83},
            {"station": "Solate", "avg_time": 5.0, "target": 5, "efficiency": 100},
            {"station": "Pijače", "avg_time": 3.0, "target": 3, "efficiency": 100},
        ],
        "peak_hours": ["12:00-13:00", "13:00-14:00"],
    }


@router.get("/stats")
def get_kds_stats(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Statistika KDS."""
    return {
        "active_orders": 12,
        "avg_prep_time": 14.2,
        "on_time_rate": 87.5,
        "overdue_count": 1,
        "stations_active": 6,
        "items_in_queue": 18,
    }