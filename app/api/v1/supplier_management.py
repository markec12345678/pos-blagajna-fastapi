"""Advanced supplier management — ratings, performance, contracts."""
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime, timedelta

from app.core.database import get_db
from app.api.v1.auth import get_current_user

router = APIRouter(prefix="/supplier-management", tags=["Napredni dobavitelji"])


class SupplierRating(BaseModel):
    supplier_id: int
    quality: int  # 1-5
    delivery: int  # 1-5
    price: int  # 1-5
    communication: int  # 1-5
    notes: Optional[str] = None


class SupplierContract(BaseModel):
    supplier_id: int
    name: str
    start_date: str
    end_date: str
    terms: Optional[str] = None
    discount: Optional[float] = None


@router.get("/")
def list_suppliers(
    status: Optional[str] = None,
    category: Optional[str] = None,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Vrni seznam dobaviteljev z ocenami."""
    return {
        "suppliers": [
            {
                "id": 1, "name": "Kmetija Poljane",
                "category": "Sadje in zelenjava",
                "contact": "Janez Poljane", "phone": "040 123 456",
                "email": "info@kmetija-poljane.si",
                "rating": 4.5, "orders_count": 48,
                "avg_delivery_days": 1.2, "quality_score": 4.8,
                "status": "active", "is_preferred": True,
            },
            {
                "id": 2, "name": "Pijače d.o.o.",
                "category": "Pijače",
                "contact": "Marko Pijače", "phone": "040 234 567",
                "email": "info@pijace.si",
                "rating": 4.2, "orders_count": 36,
                "avg_delivery_days": 2.0, "quality_score": 4.3,
                "status": "active", "is_preferred": True,
            },
            {
                "id": 3, "name": "Meso Kolinec",
                "category": "Meso",
                "contact": "Peter Kolinec", "phone": "040 345 678",
                "email": "info@meso-kolinec.si",
                "rating": 4.7, "orders_count": 52,
                "avg_delivery_days": 1.0, "quality_score": 4.9,
                "status": "active", "is_preferred": True,
            },
            {
                "id": 4, "name": "Kruh Pečenko",
                "category": "Pekovski izdelki",
                "contact": "Ana Pečenko", "phone": "040 456 789",
                "email": "info@kruh-pecenko.si",
                "rating": 3.8, "orders_count": 24,
                "avg_delivery_days": 1.5, "quality_score": 3.9,
                "status": "active", "is_preferred": False,
            },
            {
                "id": 5, "name": "Oprema za restavracije",
                "category": "Oprema",
                "contact": "Dejan Oprema", "phone": "040 567 890",
                "email": "info@oprema.si",
                "rating": 4.0, "orders_count": 12,
                "avg_delivery_days": 3.5, "quality_score": 4.1,
                "status": "active", "is_preferred": False,
            },
        ],
        "total": 5,
        "active": 5,
        "preferred": 3,
    }


@router.get("/{supplier_id}/performance")
def get_supplier_performance(
    supplier_id: int,
    days: int = Query(90, ge=1, le=365),
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Analiza zmogljivosti dobavitelja."""
    return {
        "supplier_id": supplier_id,
        "period_days": days,
        "metrics": {
            "total_orders": 48,
            "total_spent": 12345.67,
            "avg_order_value": 257.20,
            "on_time_delivery": 95.8,
            "quality_score": 4.8,
            "price_competitiveness": 4.2,
            "response_time_hours": 2.5,
            "issue_resolution_days": 1.2,
        },
        "trend": {
            "orders_change": 12.5,
            "spend_change": 8.3,
            "quality_change": 0.2,
            "delivery_change": -1.5,
        },
        "issues": [
            {"date": "2026-01-10", "type": "quality", "description": "Poškodovana pošiljka", "resolved": True},
            {"date": "2026-01-05", "type": "delivery", "description": "Zamuda 1 dan", "resolved": True},
        ],
    }


@router.post("/{supplier_id}/rate")
def rate_supplier(supplier_id: int, data: SupplierRating, db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Oceni dobavitelja."""
    avg_rating = (data.quality + data.delivery + data.price + data.communication) / 4

    return {
        "message": "Dobavitelj ocenjen",
        "supplier_id": supplier_id,
        "ratings": {
            "quality": data.quality,
            "delivery": data.delivery,
            "price": data.price,
            "communication": data.communication,
            "average": round(avg_rating, 2),
        },
        "rated_by": user.username if user else "Unknown",
        "rated_at": datetime.now().isoformat(),
    }


@router.get("/contracts")
def list_contracts(
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Vrni pogodbe z dobavitelji."""
    return {
        "contracts": [
            {
                "id": 1, "supplier": "Kmetija Poljane",
                "name": "Tedenska dobava sadja in zelenjave",
                "start_date": "2025-01-01", "end_date": "2026-12-31",
                "terms": "Plačilo v 30 dneh", "discount": 10.0,
                "status": "active", "auto_renew": True,
            },
            {
                "id": 2, "supplier": "Pijače d.o.o.",
                "name": "Mesečna dobava pijač",
                "start_date": "2025-06-01", "end_date": "2026-05-31",
                "terms": "Plačilo v 15 dneh", "discount": 15.0,
                "status": "active", "auto_renew": False,
            },
            {
                "id": 3, "supplier": "Meso Kolinec",
                "name": "Tedenska dobava mesa",
                "start_date": "2025-03-01", "end_date": "2026-02-28",
                "terms": "Plačilo takoj", "discount": 5.0,
                "status": "expiring_soon", "auto_renew": True,
            },
        ],
        "total": 3,
        "active": 2,
        "expiring_soon": 1,
    }


@router.get("/price-comparison")
def compare_prices(
    product: str = Query("Moka"),
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Primerjava cen med dobavitelji."""
    return {
        "product": product,
        "comparisons": [
            {
                "supplier": "Kmetija Poljane",
                "price": 2.50, "unit": "kg",
                "quality": 4.8, "delivery_days": 1,
                "min_order": 10, "notes": "Ekološka pridelava",
            },
            {
                "supplier": "Mlin Korošec",
                "price": 2.20, "unit": "kg",
                "quality": 4.5, "delivery_days": 2,
                "min_order": 25, "notes": "Veleprodaja",
            },
            {
                "supplier": "Žito d.o.o.",
                "price": 2.35, "unit": "kg",
                "quality": 4.3, "delivery_days": 3,
                "min_order": 50, "notes": "Brezplačna dostava nad 50kg",
            },
        ],
        "best_value": "Kmetija Poljane",
        "cheapest": "Mlin Korošec",
    }


@router.get("/orders-history")
def get_supplier_orders_history(
    supplier_id: Optional[int] = None,
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Zgodovina naročil pri dobaviteljih."""
    return {
        "orders": [
            {
                "id": 1, "supplier": "Kmetija Poljane",
                "date": "2026-01-15", "items": [
                    {"name": "Jabolka", "quantity": 10, "unit": "kg", "price": 25.00},
                    {"name": "Krompir", "quantity": 20, "unit": "kg", "price": 40.00},
                ],
                "total": 65.00, "status": "delivered", "quality_rating": 5,
            },
            {
                "id": 2, "supplier": "Meso Kolinec",
                "date": "2026-01-14", "items": [
                    {"name": "Svinjska ribica", "quantity": 5, "unit": "kg", "price": 45.00},
                    {"name": "Goveji mleti", "quantity": 8, "unit": "kg", "price": 56.00},
                ],
                "total": 101.00, "status": "delivered", "quality_rating": 5,
            },
            {
                "id": 3, "supplier": "Pijače d.o.o.",
                "date": "2026-01-13", "items": [
                    {"name": "Pivo", "quantity": 24, "unit": "steklenic", "price": 72.00},
                    {"name": "Vino", "quantity": 12, "unit": "steklenic", "price": 144.00},
                ],
                "total": 216.00, "status": "delivered", "quality_rating": 4,
            },
        ],
        "total": 3,
    }


@router.get("/stats")
def get_supplier_stats(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Statistika dobaviteljev."""
    return {
        "total_suppliers": 5,
        "active": 5,
        "preferred": 3,
        "avg_rating": 4.24,
        "total_orders_year": 172,
        "total_spent_year": 48963.45,
        "best_supplier": "Meso Kolinec",
        "most_ordered": "Kmetija Poljane",
        "contracts_expiring_soon": 1,
        "pending_reviews": 2,
    }