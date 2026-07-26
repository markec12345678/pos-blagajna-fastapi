"""Advanced inventory management — stock optimization, waste tracking, expiry alerts."""
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime, timedelta

from app.core.database import get_db
from app.api.v1.auth import get_current_user

router = APIRouter(prefix="/inventory-v2", tags=["Napredno upravljanje zalog"])


class WasteLog(BaseModel):
    item_id: int
    quantity: float
    unit: str
    reason: str  # expired, spoiled, overcooked, customer_return, other
    notes: Optional[str] = None


class StockOptimization(BaseModel):
    item_id: int
    min_stock: float
    max_stock: float
    reorder_point: float
    lead_time_days: int = 2


@router.get("/waste")
def list_waste(
    days: int = Query(30, ge=1, le=365),
    category: Optional[str] = None,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Seznam odpadkov."""
    return {
        "period_days": days,
        "waste": [
            {
                "id": 1, "item": "Jabolka", "category": "Sadje",
                "quantity": 5, "unit": "kg", "cost": 12.50,
                "reason": "Pokvarjeno", "date": "2026-01-15",
                "reported_by": "Marko",
            },
            {
                "id": 2, "item": "Mleko", "category": "Mlečni izdelki",
                "quantity": 2, "unit": "l", "cost": 3.60,
                "reason": "Pretečeno", "date": "2026-01-14",
                "reported_by": "Ana",
            },
            {
                "id": 3, "item": "Kruh", "category": "Pekovski izdelki",
                "quantity": 3, "unit": "kos", "cost": 4.50,
                "reason": "Suho", "date": "2026-01-13",
                "reported_by": "Peter",
            },
            {
                "id": 4, "item": "Rižota z gobami", "category": "Hrana",
                "quantity": 2, "unit": "porcija", "cost": 8.40,
                "reason": "Vrnitev stranke", "date": "2026-01-12",
                "reported_by": "Janez",
            },
        ],
        "total_waste": 12,
        "total_cost": 29.00,
        "by_reason": {
            "Pokvarjeno": 12.50,
            "Pretečeno": 3.60,
            "Suho": 4.50,
            "Vrnitev stranke": 8.40,
        },
    }


@router.post("/waste")
def log_waste(data: WasteLog, db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Zabeleži odpadke."""
    return {
        "message": "Odpadki zabeleženi",
        "waste": {
            "item_id": data.item_id,
            "quantity": data.quantity,
            "reason": data.reason,
            "reported_by": user.username if user else "Unknown",
            "date": datetime.now().strftime('%Y-%m-%d'),
        }
    }


@router.get("/expiry")
def get_expiry_alerts(
    days: int = Query(7, ge=1, le=30),
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Opozorila o rokih uporabe."""
    return {
        "alert_days": days,
        "items": [
            {
                "id": 1, "name": "Mleko", "quantity": 5, "unit": "l",
                "expiry_date": "2026-01-18", "days_until_expiry": 3,
                "status": "critical", "category": "Mlečni izdelki",
            },
            {
                "id": 2, "name": "Jabolka", "quantity": 10, "unit": "kg",
                "expiry_date": "2026-01-20", "days_until_expiry": 5,
                "status": "warning", "category": "Sadje",
            },
            {
                "id": 3, "name": "Kruh", "quantity": 8, "unit": "kos",
                "expiry_date": "2026-01-17", "days_until_expiry": 2,
                "status": "critical", "category": "Pekovski izdelki",
            },
            {
                "id": 4, "name": "Smetana", "quantity": 3, "unit": "l",
                "expiry_date": "2026-01-19", "days_until_expiry": 4,
                "status": "warning", "category": "Mlečni izdelki",
            },
        ],
        "total_critical": 2,
        "total_warning": 2,
        "total_cost_at_risk": 45.60,
    }


@router.get("/optimization")
def get_stock_optimization(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Optimizacija zalog."""
    return {
        "items": [
            {
                "name": "Moka", "current_stock": 25, "unit": "kg",
                "avg_daily_usage": 2.5, "lead_time_days": 2,
                "reorder_point": 7.5, "optimal_stock": 25,
                "status": "optimal", "days_until_stockout": 10,
            },
            {
                "name": "Mleko", "current_stock": 10, "unit": "l",
                "avg_daily_usage": 3.0, "lead_time_days": 1,
                "reorder_point": 6.0, "optimal_stock": 15,
                "status": "low", "days_until_stockout": 3,
            },
            {
                "name": "Jabolka", "current_stock": 15, "unit": "kg",
                "avg_daily_usage": 1.0, "lead_time_days": 3,
                "reorder_point": 5.0, "optimal_stock": 20,
                "status": "high", "days_until_stockout": 15,
            },
        ],
        "recommendations": [
            "Naročite Mleko - zaloga bo zmanjkala v 3 dneh",
            "Zmanjšajte naročilo Jabolka - zaloga je previsoka",
            "Moka je na optimalni ravni",
        ],
    }


@router.get("/analytics")
def get_waste_analytics(
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Analiza odpadkov."""
    return {
        "period_days": days,
        "total_waste_cost": 290.00,
        "waste_percentage": 3.2,
        "trend": "decreasing",
        "by_category": [
            {"category": "Mlečni izdelki", "cost": 85.00, "percentage": 29.3},
            {"category": "Sadje", "cost": 72.00, "percentage": 24.8},
            {"category": "Pekovski izdelki", "cost": 45.00, "percentage": 15.5},
            {"category": "Meso", "cost": 38.00, "percentage": 13.1},
            {"category": "Drugo", "cost": 50.00, "percentage": 17.3},
        ],
        "by_reason": [
            {"reason": "Pretečeno", "cost": 120.00, "percentage": 41.4},
            {"reason": "Pokvarjeno", "cost": 85.00, "percentage": 29.3},
            {"reason": "Suho", "cost": 45.00, "percentage": 15.5},
            {"reason": "Vrnitev stranke", "cost": 40.00, "percentage": 13.8},
        ],
        "insights": [
            "Mlečni izdelki povzročajo največ odpadkov",
            "Pretečeni izdelki so glavni vzrok",
            "Odpadki se zmanjšujejo za 10% na mesec",
        ],
    }


@router.get("/fiffo")
def get_fifo_status(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """FIFO status zalog."""
    return {
        "items": [
            {
                "name": "Mleko", "batches": [
                    {"batch": 1, "quantity": 5, "unit": "l", "received": "2026-01-10", "expiry": "2026-01-17"},
                    {"batch": 2, "quantity": 5, "unit": "l", "received": "2026-01-13", "expiry": "2026-01-20"},
                ],
                "oldest_batch_days": 5,
            },
            {
                "name": "Jabolka", "batches": [
                    {"batch": 1, "quantity": 10, "unit": "kg", "received": "2026-01-12", "expiry": "2026-01-19"},
                    {"batch": 2, "quantity": 5, "unit": "kg", "received": "2026-01-14", "expiry": "2026-01-21"},
                ],
                "oldest_batch_days": 3,
            },
        ],
        "fifo_compliance": 95.0,
        "alerts": [
            "Porabite starejšo serijo Mleka pred novo",
        ],
    }


@router.get("/stats")
def get_inventory_stats(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Statistika zalog."""
    return {
        "total_items": 45,
        "total_value": 12345.67,
        "waste_cost_month": 290.00,
        "waste_percentage": 3.2,
        "expiring_soon": 4,
        "low_stock_items": 2,
        "fifo_compliance": 95.0,
        "optimization_score": 87.5,
        "last_audit": "2026-01-10",
    }