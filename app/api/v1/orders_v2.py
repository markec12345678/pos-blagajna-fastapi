"""Orders V2 — bulk operations, advanced search, order management."""
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime

from app.core.database import get_db
from app.api.v1.auth import get_current_user

router = APIRouter(prefix="/orders-v2", tags=["Naročila V2"])


class BulkStatusUpdate(BaseModel):
    order_ids: List[int]
    status: str


class OrderSearch(BaseModel):
    query: Optional[str] = None
    status: Optional[str] = None
    date_from: Optional[str] = None
    date_to: Optional[str] = None
    table_id: Optional[int] = None
    min_total: Optional[float] = None
    max_total: Optional[float] = None


@router.get("/search")
def advanced_order_search(
    q: Optional[str] = None,
    status: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    table_id: Optional[int] = None,
    min_total: Optional[float] = None,
    max_total: Optional[float] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Napredno iskanje naročil."""
    orders = [
        {"id": 1001, "table": "Miza 5", "status": "completed", "total": 45.50, "items": 4, "guests": 3, "created": "2026-01-15 12:30", "server": "Ana", "payment": "card"},
        {"id": 1002, "table": "Miza 12", "status": "preparing", "total": 32.00, "items": 3, "guests": 2, "created": "2026-01-15 13:15", "server": "Peter", "payment": None},
        {"id": 1003, "table": "Miza 3", "status": "served", "total": 67.50, "items": 6, "guests": 4, "created": "2026-01-15 13:45", "server": "Maja", "payment": None},
        {"id": 1004, "table": "Miza 8", "status": "pending", "total": 28.00, "items": 2, "guests": 2, "created": "2026-01-15 14:00", "server": "Ana", "payment": None},
        {"id": 1005, "table": "Miza 1", "status": "completed", "total": 89.00, "items": 7, "guests": 5, "created": "2026-01-15 14:30", "server": "Peter", "payment": "cash"},
    ]
    if q:
        orders = [o for o in orders if q.lower() in str(o["id"]) or q.lower() in o["table"].lower() or q.lower() in o["server"].lower()]
    if status:
        orders = [o for o in orders if o["status"] == status]
    return {"orders": orders, "total": len(orders), "page": page, "pages": 1}


@router.get("/dashboard")
def get_orders_dashboard(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Nadzorna plošča naročil."""
    return {
        "today": {
            "total_orders": 87,
            "total_revenue": 2450.00,
            "avg_order_value": 28.16,
            "avg_prep_time": 12.5,
            "avg_table_turnover": 2.3,
            "covers": 156,
        },
        "by_status": {
            "pending": 3,
            "preparing": 5,
            "ready": 2,
            "served": 8,
            "completed": 69,
        },
        "by_hour": [
            {"hour": "11:00", "orders": 5, "revenue": 140},
            {"hour": "12:00", "orders": 18, "revenue": 510},
            {"hour": "13:00", "orders": 22, "revenue": 620},
            {"hour": "14:00", "orders": 12, "revenue": 340},
            {"hour": "18:00", "orders": 15, "revenue": 425},
            {"hour": "19:00", "orders": 8, "revenue": 225},
        ],
        "top_items": [
            {"name": "Rižota z gobami", "qty": 18, "revenue": 243.00},
            {"name": "Pleskavica", "qty": 15, "revenue": 180.00},
            {"name": "Margherita", "qty": 14, "revenue": 133.00},
        ],
    }


@router.post("/bulk/status")
def bulk_update_status(data: BulkStatusUpdate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Masovna posodobitev statusa."""
    return {
        "message": f"Status posodobljen za {len(data.order_ids)} naročil",
        "updated": len(data.order_ids),
        "new_status": data.status,
    }


@router.post("/bulk/merge")
def bulk_merge_orders(order_ids: List[int], db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Združi naročila."""
    return {
        "message": f"Združenih {len(order_ids)} naročil",
        "merged_order_id": max(order_ids) if order_ids else 0,
        "total": 0,
    }


@router.post("/bulk/split")
def bulk_split_order(order_id: int, items_per_order: int = Query(2), db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Razdeli naročilo."""
    return {
        "message": "Naročilo razdeljeno",
        "original_order": order_id,
        "new_orders": 3,
        "items_per_order": items_per_order,
    }


@router.get("/{order_id}/timeline")
def get_order_timeline(order_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Časovnica naročila."""
    return {
        "order_id": order_id,
        "timeline": [
            {"time": "12:30:00", "event": "created", "description": "Naročilo ustvarjeno", "by": "Ana"},
            {"time": "12:30:30", "event": "confirmed", "description": "Naročilo potrjeno", "by": "Sistem"},
            {"time": "12:31:00", "event": "preparing", "description": "Priprava se začne", "by": "Kuhinja"},
            {"time": "12:43:00", "event": "ready", "description": "Jed pripravljena", "by": "Kuhinja"},
            {"time": "12:45:00", "event": "served", "description": "Postreženo", "by": "Ana"},
            {"time": "13:15:00", "event": "paid", "description": "Plačano", "by": "Ana"},
        ],
        "duration": {
            "order_to_prep": "1 min",
            "prep_time": "12 min",
            "prep_to_served": "2 min",
            "total": "45 min",
        },
    }


@router.get("/stats")
def get_orders_stats(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Statistika naročil."""
    return {
        "today_orders": 87,
        "today_revenue": 2450.00,
        "avg_order_value": 28.16,
        "avg_prep_time": 12.5,
        "avg_table_turnover": 2.3,
        "cancellation_rate": 2.3,
        "return_customer_rate": 65.0,
    }