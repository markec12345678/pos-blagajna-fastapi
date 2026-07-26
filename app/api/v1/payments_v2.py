"""Payments V2 — advanced payment management with split, refunds, tips, reconciliation."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from datetime import datetime

from app.core.database import get_db
from app.api.v1.auth import get_current_user

router = APIRouter(prefix="/payments-v2", tags=["Payments V2"])


@router.get("/methods")
def get_payment_methods(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Plačilna sredstva."""
    return {
        "methods": [
            {"name": "Gotovina", "total": 8500.00, "count": 145, "percentage": 28.5},
            {"name": "Kartica", "total": 15200.00, "count": 280, "percentage": 51.0},
            {"name": "Kartica - Visa", "total": 6800.00, "count": 120, "percentage": 22.8},
            {"name": "Kartica - Mastercard", "total": 5400.00, "count": 95, "percentage": 18.1},
            {"name": "Kartica - Maestro", "total": 3000.00, "count": 65, "percentage": 10.1},
            {"name": "Darilni bon", "total": 1200.00, "count": 18, "percentage": 4.0},
            {"name": "Račun", "total": 4800.00, "count": 42, "percentage": 16.1},
            {"name": "Spletno", "total": 2400.00, "count": 35, "percentage": 8.0},
        ],
        "total_revenue": 29780.00,
    }


@router.get("/transactions")
def list_transactions(
    days: int = Query(7, ge=1, le=90),
    db: Session = Depends(get_db), user=Depends(get_current_user)
):
    """Seznam transakcij."""
    return {
        "transactions": [
            {"id": 1001, "date": "2026-07-16 12:30", "order_id": 101, "amount": 45.80, "tip": 5.00, "method": "Kartica", "status": "completed", "server": "Maja"},
            {"id": 1002, "date": "2026-07-16 12:45", "order_id": 102, "amount": 28.50, "tip": 3.00, "method": "Gotovina", "status": "completed", "server": "Boštjan"},
            {"id": 1003, "date": "2026-07-16 13:00", "order_id": 103, "amount": 62.30, "tip": 6.00, "method": "Kartica - Visa", "status": "completed", "server": "Maja"},
            {"id": 1004, "date": "2026-07-16 13:15", "order_id": 104, "amount": 18.90, "tip": 2.00, "method": "Gotovina", "status": "completed", "server": "Boštjan"},
            {"id": 1005, "date": "2026-07-16 13:30", "order_id": 105, "amount": 89.20, "tip": 10.00, "method": "Kartica - Mastercard", "status": "refunded", "server": "Maja"},
        ],
        "total": 5,
        "total_amount": 244.70,
        "total_tips": 26.00,
    }


@router.get("/tips")
def get_tip_analytics(
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db), user=Depends(get_current_user)
):
    """Analitika napitnin."""
    return {
        "period_days": days,
        "total_tips": 1250.00,
        "avg_tip": 4.80,
        "avg_tip_pct": 14.2,
        "tip_rate": 68.0,
        "by_employee": [
            {"name": "Maja Pezdirc", "tips": 480.00, "count": 95, "avg_tip": 5.05, "tip_pct": 15.2},
            {"name": "Boštjan Kranjc", "tips": 420.00, "count": 82, "avg_tip": 5.12, "tip_pct": 14.8},
            {"name": "Ana Novak", "tips": 350.00, "count": 78, "avg_tip": 4.49, "tip_pct": 12.8},
        ],
        "by_method": [
            {"method": "Gotovina", "total": 680.00, "percentage": 54.4},
            {"method": "Kartica", "total": 570.00, "percentage": 45.6},
        ],
        "by_shift": [
            {"shift": "Kosilo", "total": 380.00, "percentage": 30.4},
            {"shift": "Večerja", "total": 870.00, "percentage": 69.6},
        ],
    }


@router.get("/refunds")
def get_refunds(
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db), user=Depends(get_current_user)
):
    """Vračila."""
    return {
        "period_days": days,
        "total_refunds": 342.50,
        "refund_count": 5,
        "refund_rate": 1.2,
        "refunds": [
            {"id": 1, "date": "2026-07-16", "order_id": 105, "amount": 89.20, "reason": "Napačna jed", "status": "completed", "processed_by": "Maja"},
            {"id": 2, "date": "2026-07-14", "order_id": 98, "amount": 45.00, "reason": "Pozna dostava", "status": "completed", "processed_by": "Boštjan"},
            {"id": 3, "date": "2026-07-12", "order_id": 87, "amount": 78.30, "reason": "Gost nezadovoljen", "status": "pending", "processed_by": "Maja"},
        ],
        "by_reason": [
            {"reason": "Napačna jed", "count": 2, "total": 134.20},
            {"reason": "Pozna dostava", "count": 1, "total": 45.00},
            {"reason": "Gost nezadovoljen", "count": 2, "total": 163.30},
        ],
    }


@router.get("/reconciliation")
def get_reconciliation(
    date: str = Query(default=datetime.now().strftime("%Y-%m-%d")),
    db: Session = Depends(get_db), user=Depends(get_current_user)
):
    """Usklajevanje."""
    return {
        "date": date,
        "expected": {
            "cash": 2450.00,
            "card": 4200.00,
            "other": 180.00,
            "total": 6830.00,
        },
        "actual": {
            "cash": 2445.00,
            "card": 4200.00,
            "other": 180.00,
            "total": 6825.00,
        },
        "difference": -5.00,
        "status": "discrepancy",
        "notes": "Manjka 5€ v gotovini - verjetno napačno vračilo",
    }


@router.get("/analytics")
def get_payment_analytics(
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db), user=Depends(get_current_user)
):
    """Analitika plačil."""
    return {
        "period_days": days,
        "total_revenue": 29780.00,
        "total_tips": 1250.00,
        "total_refunds": 342.50,
        "net_revenue": 29437.50,
        "avg_order_value": 38.50,
        "avg_tip_pct": 14.2,
        "tip_rate": 68.0,
        "cash_percentage": 28.5,
        "card_percentage": 51.0,
    }


@router.get("/stats")
def get_payment_stats(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Statistika plačil."""
    return {
        "total_revenue": 29780.00,
        "total_tips": 1250.00,
        "total_refunds": 342.50,
        "net_revenue": 29437.50,
        "avg_order_value": 38.50,
        "card_percentage": 51.0,
        "cash_percentage": 28.5,
        "refund_rate": 1.2,
    }
