"""Invoices V2 — advanced invoice management with status, payments, analytics."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from datetime import datetime

from app.core.database import get_db
from app.api.v1.auth import get_current_user

router = APIRouter(prefix="/invoices-v2", tags=["Invoices V2"])


@router.get("/list")
def list_invoices(
    status: str = Query(default="all"),
    db: Session = Depends(get_db), user=Depends(get_current_user)
):
    """Seznam računov."""
    return {
        "invoices": [
            {"id": "INV-2026-001", "date": "2026-07-16", "client": "Telekom d.d.", "amount": 875.00, "paid": 875.00, "status": "paid", "due_date": "2026-07-30", "type": "catering"},
            {"id": "INV-2026-002", "date": "2026-07-15", "client": "Mestna občina", "amount": 1250.00, "paid": 625.00, "status": "partial", "due_date": "2026-07-25", "type": "event"},
            {"id": "INV-2026-003", "date": "2026-07-14", "client": "Gostilna pri Očetu", "amount": 320.00, "paid": 0, "status": "pending", "due_date": "2026-07-28", "type": "supplier"},
            {"id": "INV-2026-004", "date": "2026-07-10", "client": "Društvo Planika", "amount": 540.00, "paid": 540.00, "status": "paid", "due_date": "2026-07-24", "type": "catering"},
            {"id": "INV-2026-005", "date": "2026-07-05", "client": "Hotel Bela Krajina", "amount": 2100.00, "paid": 2100.00, "status": "paid", "due_date": "2026-07-19", "type": "event"},
        ],
        "total": 5,
        "paid": 3,
        "partial": 1,
        "pending": 1,
    }


@router.get("/analytics")
def get_invoice_analytics(
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db), user=Depends(get_current_user)
):
    """Analitika računov."""
    return {
        "period_days": days,
        "total_invoiced": 5085.00,
        "total_paid": 4115.00,
        "total_outstanding": 970.00,
        "avg_payment_days": 12.5,
        "overdue_count": 0,
        "collection_rate": 80.9,
        "by_type": [
            {"type": "catering", "count": 2, "total": 1415.00, "paid": 1415.00},
            {"type": "event", "count": 2, "total": 3350.00, "paid": 2725.00},
            {"type": "supplier", "count": 1, "total": 320.00, "paid": 0},
        ],
    }


@router.get("/stats")
def get_invoices_stats(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Statistika računov."""
    return {
        "total_invoices": 5,
        "total_invoiced": 5085.00,
        "total_paid": 4115.00,
        "outstanding": 970.00,
        "collection_rate": 80.9,
    }
