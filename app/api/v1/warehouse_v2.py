"""Warehouse V2 — advanced warehouse management, stock movements, analytics."""
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime

from app.core.database import get_db
from app.api.v1.auth import get_current_user

router = APIRouter(prefix="/warehouse-v2", tags=["Zaloge V2"])


class StockMovement(BaseModel):
    item_id: int
    quantity: float
    type: str  # in, out, adjustment
    notes: Optional[str] = None


@router.get("/stock")
def get_stock_levels(
    category: Optional[str] = None,
    low_stock: bool = Query(False),
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Stanje zalog."""
    items = [
        {"id": 1, "name": "Moka", "category": "Osnove", "stock": 25.0, "unit": "kg", "min_stock": 10, "max_stock": 50, "cost": 1.20, "value": 30.00, "status": "ok"},
        {"id": 2, "name": "Paradižnik", "category": "Zelenjava", "stock": 15.0, "unit": "kg", "min_stock": 8, "max_stock": 30, "cost": 2.50, "value": 37.50, "status": "ok"},
        {"id": 3, "name": "Mozzarella", "category": "Mlečni", "stock": 3.0, "unit": "kg", "min_stock": 5, "max_stock": 15, "cost": 8.00, "value": 24.00, "status": "low"},
        {"id": 4, "name": "Olivno olje", "category": "Omake", "stock": 8.0, "unit": "l", "min_stock": 3, "max_stock": 20, "cost": 6.00, "value": 48.00, "status": "ok"},
        {"id": 5, "name": "Gobe", "category": "Zelenjava", "stock": 2.0, "unit": "kg", "min_stock": 4, "max_stock": 10, "cost": 5.00, "value": 10.00, "status": "low"},
        {"id": 6, "name": "Vino", "category": "Pijače", "stock": 24.0, "unit": "fl", "min_stock": 10, "max_stock": 50, "cost": 4.00, "value": 96.00, "status": "ok"},
    ]
    if category:
        items = [i for i in items if i["category"] == category]
    if low_stock:
        items = [i for i in items if i["status"] == "low"]
    return {"items": items, "total": len(items), "total_value": sum(i["value"] for i in items)}


@router.get("/movements")
def get_stock_movements(days: int = Query(30, ge=1, le=365), db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Premiki zalog."""
    return {
        "movements": [
            {"id": 1, "item": "Moka", "type": "in", "quantity": 10.0, "unit": "kg", "date": "2026-01-15", "by": "Peter", "notes": "Tedensko naročilo"},
            {"id": 2, "item": "Moka", "type": "out", "quantity": 2.5, "unit": "kg", "date": "2026-01-15", "by": "Sistem", "notes": "Dnevna poraba"},
            {"id": 3, "item": "Mozzarella", "type": "in", "quantity": 5.0, "unit": "kg", "date": "2026-01-14", "by": "Peter", "notes": "Naročilo"},
            {"id": 4, "item": "Gobe", "type": "adjustment", "quantity": -1.0, "unit": "kg", "date": "2026-01-13", "by": "Ana", "notes": "Inventura - manko"},
        ],
        "total_in": 15.0,
        "total_out": 3.5,
        "total_adjustments": 1,
    }


@router.get("/analytics")
def get_warehouse_analytics(days: int = Query(30, ge=1, le=365), db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Analiza zalog."""
    return {
        "period_days": days,
        "total_value": 245.50,
        "total_items": 6,
        "low_stock_items": 2,
        "turnover_rate": 8.5,
        "waste_rate": 2.3,
        "stock_accuracy": 98.5,
        "by_category": [
            {"name": "Osnove", "value": 30.00, "items": 1, "turnover": 10},
            {"name": "Zelenjava", "value": 47.50, "items": 2, "turnover": 12},
            {"name": "Mlečni", "value": 24.00, "items": 1, "turnover": 6},
            {"name": "Omake", "value": 48.00, "items": 1, "turnover": 4},
            {"name": "Pijače", "value": 96.00, "items": 1, "turnover": 3},
        ],
        "top_movers": [
            {"name": "Moka", "turnover": 15, "velocity": "high"},
            {"name": "Paradižnik", "turnover": 12, "velocity": "high"},
            {"name": "Mozzarella", "turnover": 6, "velocity": "medium"},
        ],
    }


@router.post("/movements")
def create_stock_movement(data: StockMovement, db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Ustvari premik zalog."""
    return {"message": "Premik zabeležen", "movement": {"id": 5, "item_id": data.item_id, "quantity": data.quantity, "type": data.type, "notes": data.notes, "by": user.username if user else "Unknown", "date": datetime.now().isoformat()}}


@router.get("/categories")
def get_stock_categories(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Kategorije zalog."""
    return {
        "categories": [
            {"name": "Osnove", "items": 5, "total_value": 125.00},
            {"name": "Zelenjava", "items": 8, "total_value": 180.00},
            {"name": "Mlečni", "items": 4, "total_value": 95.00},
            {"name": "Meso", "items": 6, "total_value": 220.00},
            {"name": "Omake", "items": 3, "total_value": 48.00},
            {"name": "Pijače", "items": 10, "total_value": 320.00},
        ],
        "total_categories": 6,
        "total_items": 36,
    }


@router.get("/stats")
def get_warehouse_stats(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Statistika zalog."""
    return {
        "total_value": 245.50,
        "total_items": 36,
        "low_stock_items": 2,
        "turnover_rate": 8.5,
        "waste_rate": 2.3,
        "stock_accuracy": 98.5,
    }