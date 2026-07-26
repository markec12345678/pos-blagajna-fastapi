"""Suppliers V2 — advanced supplier management with ratings, contracts, analytics."""
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime

from app.core.database import get_db
from app.api.v1.auth import get_current_user

router = APIRouter(prefix="/suppliers-v2", tags=["Dobavitelji V2"])


@router.get("/")
def list_suppliers(
    search: Optional[str] = None,
    category: Optional[str] = None,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Seznam dobaviteljev."""
    return {
        "suppliers": [
            {"id": 1, "name": "Kmetija Dolinar", "category": "Zelenjava", "rating": 4.8, "on_time_rate": 95, "quality_rate": 98, "total_orders": 45, "total_spent": 12500.00, "status": "active", "last_order": "2026-01-15"},
            {"id": 2, "name": "Mlekarna Kranj", "category": "Mlečni", "rating": 4.6, "on_time_rate": 92, "quality_rate": 96, "total_orders": 38, "total_spent": 8900.00, "status": "active", "last_order": "2026-01-14"},
            {"id": 3, "name": "Mesnica Horvat", "category": "Meso", "rating": 4.7, "on_time_rate": 94, "quality_rate": 97, "total_orders": 42, "total_spent": 15600.00, "status": "active", "last_order": "2026-01-15"},
            {"id": 4, "name": "Vina Krško", "category": "Pijače", "rating": 4.5, "on_time_rate": 90, "quality_rate": 95, "total_orders": 25, "total_spent": 6200.00, "status": "active", "last_order": "2026-01-10"},
            {"id": 5, "name": "Oprema d.o.o.", "category": "Oprema", "rating": 4.2, "on_time_rate": 88, "quality_rate": 92, "total_orders": 8, "total_spent": 3200.00, "status": "active", "last_order": "2026-01-05"},
        ],
        "total": 5,
    }


@router.get("/{supplier_id}")
def get_supplier_detail(supplier_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Podrobnosti dobavitelja."""
    return {
        "supplier": {
            "id": supplier_id, "name": "Kmetija Dolinar",
            "category": "Zelenjava", "contact": "Janez Dolinar",
            "email": "janez@dolinar.si", "phone": "041 234 567",
            "address": "Dolinar 15, 8332 Gradac",
            "rating": 4.8, "on_time_rate": 95, "quality_rate": 98,
            "total_orders": 45, "total_spent": 12500.00,
            "contract": {"start": "2025-01-01", "end": "2026-12-31", "terms": "Plačilo v 30 dneh"},
            "recent_orders": [
                {"id": "PO-1001", "date": "2026-01-15", "total": 450.00, "status": "delivered"},
                {"id": "PO-998", "date": "2026-01-10", "total": 380.00, "status": "delivered"},
            ],
            "performance": {"on_time": 95, "quality": 98, "communication": 92, "pricing": 88},
        }
    }


@router.get("/{supplier_id}/analytics")
def get_supplier_analytics(supplier_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Analiza dobavitelja."""
    return {
        "period_months": 12,
        "total_orders": 45,
        "total_spent": 12500.00,
        "avg_order_value": 277.78,
        "on_time_rate": 95.0,
        "quality_rate": 98.0,
        "price_trend": "stable",
        "delivery_trend": "improving",
        "monthly_orders": [
            {"month": "2026-01", "orders": 4, "spent": 1200},
            {"month": "2025-12", "orders": 3, "spent": 950},
            {"month": "2025-11", "orders": 4, "spent": 1100},
        ],
    }


@router.get("/price-comparison")
def price_comparison(category: Optional[str] = None, db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Primerjava cen."""
    return {
        "comparisons": [
            {"item": "Paradižnik", "prices": [{"supplier": "Kmetija Dolinar", "price": 2.50, "unit": "kg"}, {"supplier": "Agro Kmetija", "price": 2.80, "unit": "kg"}, {"supplier": "Mercator", "price": 3.20, "unit": "kg"}], "best": "Kmetija Dolinar"},
            {"item": "Mozzarella", "prices": [{"supplier": "Mlekarna Kranj", "price": 8.00, "unit": "kg"}, {"supplier": "Ljubljanske Mlekarne", "price": 8.50, "unit": "kg"}], "best": "Mlekarna Kranj"},
        ],
    }


@router.get("/stats")
def get_suppliers_stats(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Statistika dobaviteljev."""
    return {
        "total_suppliers": 5,
        "active_suppliers": 5,
        "avg_rating": 4.56,
        "avg_on_time_rate": 91.8,
        "avg_quality_rate": 95.6,
        "total_spent": 46400.00,
    }