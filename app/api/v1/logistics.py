"""Logistics — inventory optimization, supplier management, supply chain."""
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime, timedelta

from app.core.database import get_db
from app.api.v1.auth import get_current_user

router = APIRouter(prefix="/logistics", tags=["Logistika"])


class PurchaseOrder(BaseModel):
    supplier_id: int
    items: List[dict]
    expected_delivery: str
    notes: Optional[str] = None


class StockAdjustment(BaseModel):
    item_id: int
    adjustment: float
    reason: str
    notes: Optional[str] = None


@router.get("/inventory-status")
def get_inventory_status(
    category: Optional[str] = None,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Stanje zalog."""
    return {
        "items": [
            {
                "id": 1, "name": "Moka", "category": "Osnovne sestavine",
                "stock": 25, "unit": "kg", "min_stock": 10, "max_stock": 50,
                "status": "optimal", "reorder_point": 15,
                "avg_daily_usage": 2.5, "days_until_stockout": 10,
                "last_ordered": "2026-01-10", "supplier": "Mlin Korošec",
            },
            {
                "id": 2, "name": "Mleko", "category": "Mlečni izdelki",
                "stock": 10, "unit": "l", "min_stock": 5, "max_stock": 20,
                "status": "low", "reorder_point": 8,
                "avg_daily_usage": 3.0, "days_until_stockout": 3,
                "last_ordered": "2026-01-12", "supplier": "Kmetija Poljane",
            },
            {
                "id": 3, "name": "Jabolka", "category": "Sadje",
                "stock": 15, "unit": "kg", "min_stock": 5, "max_stock": 25,
                "status": "optimal", "reorder_point": 8,
                "avg_daily_usage": 1.0, "days_until_stockout": 15,
                "last_ordered": "2026-01-08", "supplier": "Kmetija Poljane",
            },
            {
                "id": 4, "name": "Svinjska ribica", "category": "Meso",
                "stock": 8, "unit": "kg", "min_stock": 5, "max_stock": 15,
                "status": "optimal", "reorder_point": 7,
                "avg_daily_usage": 1.5, "days_until_stockout": 5,
                "last_ordered": "2026-01-13", "supplier": "Meso Kolinec",
            },
            {
                "id": 5, "name": "Pivo", "category": "Pijače",
                "stock": 24, "unit": "steklenic", "min_stock": 12, "max_stock": 48,
                "status": "optimal", "reorder_point": 18,
                "avg_daily_usage": 4.0, "days_until_stockout": 6,
                "last_ordered": "2026-01-11", "supplier": "Pijače d.o.o.",
            },
        ],
        "summary": {
            "total_items": 5,
            "optimal": 4,
            "low": 1,
            "critical": 0,
            "total_value": 2345.67,
        },
    }


@router.get("/purchase-orders")
def list_purchase_orders(
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Naročnice."""
    return {
        "orders": [
            {
                "id": 1, "supplier": "Kmetija Poljane",
                "date": "2026-01-10", "expected_delivery": "2026-01-12",
                "status": "delivered", "total": 125.00,
                "items": [
                    {"name": "Jabolka", "quantity": 10, "unit": "kg", "price": 25.00},
                    {"name": "Krompir", "quantity": 20, "unit": "kg", "price": 40.00},
                ],
            },
            {
                "id": 2, "supplier": "Meso Kolinec",
                "date": "2026-01-13", "expected_delivery": "2026-01-14",
                "status": "delivered", "total": 101.00,
                "items": [
                    {"name": "Svinjska ribica", "quantity": 5, "unit": "kg", "price": 45.00},
                    {"name": "Goveji mleti", "quantity": 8, "unit": "kg", "price": 56.00},
                ],
            },
            {
                "id": 3, "supplier": "Pijače d.o.o.",
                "date": "2026-01-15", "expected_delivery": "2026-01-16",
                "status": "pending", "total": 216.00,
                "items": [
                    {"name": "Pivo", "quantity": 24, "unit": "steklenic", "price": 72.00},
                    {"name": "Vino", "quantity": 12, "unit": "steklenic", "price": 144.00},
                ],
            },
        ],
        "total": 3,
        "pending": 1,
        "delivered": 2,
    }


@router.post("/purchase-orders")
def create_purchase_order(data: PurchaseOrder, db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Ustvari naročnico."""
    total = sum(item.get("quantity", 0) * item.get("price", 0) for item in data.items)

    return {
        "message": "Naročnica ustvarjena",
        "order": {
            "supplier_id": data.supplier_id,
            "items": data.items,
            "total": total,
            "expected_delivery": data.expected_delivery,
            "status": "pending",
            "created_at": datetime.now().isoformat(),
        }
    }


@router.get("/stock-movements")
def get_stock_movements(
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Gibanje zalog."""
    return {
        "period_days": days,
        "movements": [
            {
                "date": "2026-01-15",
                "inbound": [{"item": "Mleko", "quantity": 10, "unit": "l", "source": "Naročnica #2"}],
                "outbound": [{"item": "Mleko", "quantity": 3, "unit": "l", "destination": "Kuhinja"}],
                "waste": [],
            },
            {
                "date": "2026-01-14",
                "inbound": [{"item": "Jabolka", "quantity": 10, "unit": "kg", "source": "Naročnica #1"}],
                "outbound": [{"item": "Jabolka", "quantity": 2, "unit": "kg", "destination": "Kuhinja"}],
                "waste": [{"item": "Jabolka", "quantity": 0.5, "unit": "kg", "reason": "Pokvarjeno"}],
            },
        ],
        "summary": {
            "total_inbound": 125.00,
            "total_outbound": 98.50,
            "total_waste": 2.30,
            "waste_percentage": 2.3,
        },
    }


@router.get("/supplier-performance")
def get_supplier_performance(
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Zmogljivost dobaviteljev."""
    return {
        "period_days": days,
        "suppliers": [
            {
                "name": "Kmetija Poljane",
                "orders": 12, "total_spent": 1500.00,
                "on_time_delivery": 95.0, "quality_score": 4.8,
                "avg_lead_time": 1.5, "issues": 1,
            },
            {
                "name": "Meso Kolinec",
                "orders": 15, "total_spent": 2250.00,
                "on_time_delivery": 98.0, "quality_score": 4.9,
                "avg_lead_time": 1.0, "issues": 0,
            },
            {
                "name": "Pijače d.o.o.",
                "orders": 8, "total_spent": 1200.00,
                "on_time_delivery": 92.0, "quality_score": 4.3,
                "avg_lead_time": 2.0, "issues": 2,
            },
        ],
        "best_supplier": "Meso Kolinec",
        "avg_on_time_delivery": 95.0,
        "avg_quality_score": 4.7,
    }


@router.get("/reorder-suggestions")
def get_reorder_suggestions(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Predlogi za naročanje."""
    return {
        "suggestions": [
            {
                "item": "Mleko", "current_stock": 10,
                "reorder_point": 8, "suggested_quantity": 15,
                "supplier": "Kmetija Poljane", "urgency": "high",
                "estimated_cost": 22.50,
            },
            {
                "item": "Pivo", "current_stock": 24,
                "reorder_point": 18, "suggested_quantity": 24,
                "supplier": "Pijače d.o.o.", "urgency": "medium",
                "estimated_cost": 72.00,
            },
        ],
        "total_suggestions": 2,
        "total_estimated_cost": 94.50,
    }


@router.get("/stats")
def get_logistics_stats(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Statistika logistike."""
    return {
        "total_items": 45,
        "total_value": 2345.67,
        "low_stock_items": 1,
        "pending_orders": 1,
        "total_orders_month": 35,
        "total_spent_month": 4950.00,
        "avg_lead_time": 1.5,
        "waste_percentage": 2.3,
        "supplier_count": 5,
    }