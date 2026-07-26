"""Promotions V2 — advanced promotions, discounts, loyalty programs."""
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime

from app.core.database import get_db
from app.api.v1.auth import get_current_user

router = APIRouter(prefix="/promotions-v2", tags=["Promocije V2"])


class PromotionCreate(BaseModel):
    name: str
    type: str  # percentage, fixed, buy_x_get_y, combo
    value: float
    min_order: Optional[float] = None
    start_date: str
    end_date: str
    applicable_items: List[str] = []


@router.get("/")
def list_promotions(
    active_only: bool = Query(True),
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Seznam promocij."""
    return {
        "promotions": [
            {"id": 1, "name": "Tedenski popust 10%", "type": "percentage", "value": 10, "start_date": "2026-01-13", "end_date": "2026-01-19", "status": "active", "usage_count": 45, "revenue_impact": -234.50},
            {"id": 2, "name": "2 za 1 pica", "type": "buy_x_get_y", "value": 1, "start_date": "2026-01-15", "end_date": "2026-01-15", "status": "active", "usage_count": 12, "revenue_impact": -114.00},
            {"id": 3, "name": "Komplet kosilo", "type": "combo", "value": 3.00, "start_date": "2026-01-01", "end_date": "2026-01-31", "status": "active", "usage_count": 89, "revenue_impact": -267.00},
            {"id": 4, "name": "Popust za študente", "type": "percentage", "value": 15, "start_date": "2026-01-01", "end_date": "2026-06-30", "status": "active", "usage_count": 120, "revenue_impact": -450.00},
            {"id": 5, "name": "Božični popust", "type": "fixed", "value": 5.00, "start_date": "2025-12-20", "end_date": "2025-12-31", "status": "expired", "usage_count": 34, "revenue_impact": -170.00},
        ],
        "total": 5,
        "active_count": 4,
    }


@router.get("/analytics")
def get_promotion_analytics(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Analiza promocij."""
    return {
        "total_promotions": 5,
        "active_promotions": 4,
        "total_usage": 300,
        "total_revenue_impact": -1235.50,
        "avg_discount_per_order": 4.12,
        "top_performing": [
            {"name": "Popust za študente", "usage": 120, "revenue_impact": -450.00, "roi": 3.2},
            {"name": "Komplet kosilo", "usage": 89, "revenue_impact": -267.00, "roi": 2.8},
            {"name": "Tedenski popust 10%", "usage": 45, "revenue_impact": -234.50, "roi": 2.1},
        ],
        "conversion_rate": 35.2,
        "repeat_usage_rate": 28.5,
    }


@router.post("/")
def create_promotion(data: PromotionCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Ustvari promocijo."""
    return {"message": "Promocija ustvarjena", "promotion": {"id": 6, **data.dict(), "status": "active", "usage_count": 0}}


@router.put("/{promo_id}/toggle")
def toggle_promotion(promo_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Preklopi promocijo."""
    return {"id": promo_id, "active": True, "message": "Promocija aktivirana"}


@router.get("/loyalty")
def get_loyalty_program(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Program zvestobe."""
    return {
        "tiers": [
            {"name": "Bronasti", "min_points": 0, "discount": 0, "members": 650, "benefits": ["1 točka za 1 €"]},
            {"name": "Srebrni", "min_points": 1000, "discount": 5, "members": 320, "benefits": ["1.5 točke za 1 €", "5% popust"]},
            {"name": "Zlati", "min_points": 2500, "discount": 10, "members": 85, "benefits": ["2 točki za 1 €", "10% popust", "Brezplačna sladica"]},
            {"name": "Platina", "min_points": 5000, "discount": 15, "members": 12, "benefits": ["3 točke za 1 €", "15% popust", "Brezplačna sladica", "Prioritetna rezervacija"]},
        ],
        "total_members": 1067,
        "total_points_issued": 45000,
        "total_redemptions": 1200,
        "avg_points_per_member": 42.2,
    }


@router.get("/stats")
def get_promotions_stats(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Statistika promocij."""
    return {
        "active_promotions": 4,
        "total_usage": 300,
        "total_revenue_impact": -1235.50,
        "avg_discount_per_order": 4.12,
        "conversion_rate": 35.2,
        "repeat_usage_rate": 28.5,
    }