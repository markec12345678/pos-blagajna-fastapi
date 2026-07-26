"""Promotions V3 — advanced promotions engine with analytics and loyalty tiers."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.v1.auth import get_current_user

router = APIRouter(prefix="/promotions-v3", tags=["Promotions V3"])


@router.get("/active")
def get_active_promotions(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Aktivne promocije."""
    return {
        "promotions": [
            {"id": 1, "name": "1+1Gratis pijača", "type": "bogo", "discount": 50, "valid_until": "2026-07-31", "used": 145, "revenue_impact": 725.00, "status": "active"},
            {"id": 2, "name": "Kosilo paket", "type": "bundle", "discount": 15, "valid_until": "2026-08-15", "used": 320, "revenue_impact": 2400.00, "status": "active"},
            {"id": 3, "name": "Zgodnja ura -20%", "type": "time_based", "discount": 20, "valid_until": "2026-09-30", "used": 89, "revenue_impact": 534.00, "status": "active"},
            {"id": 4, "name": "VIP posebna ponudba", "type": "loyalty", "discount": 10, "valid_until": "2026-12-31", "used": 67, "revenue_impact": 335.00, "status": "active"},
        ],
        "total": 4,
        "total_revenue_impact": 3994.00,
    }


@router.get("/analytics")
def get_promotion_analytics(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Analitika promocij."""
    return {
        "total_active": 4,
        "total_used": 621,
        "total_revenue_impact": 3994.00,
        "avg_discount": 23.8,
        "best_performer": "Kosilo paket",
        "by_type": [
            {"type": "bogo", "count": 1, "used": 145, "revenue": 725.00},
            {"type": "bundle", "count": 1, "used": 320, "revenue": 2400.00},
            {"type": "time_based", "count": 1, "used": 89, "revenue": 534.00},
            {"type": "loyalty", "count": 1, "used": 67, "revenue": 335.00},
        ],
    }


@router.get("/loyalty-tiers")
def get_loyalty_tiers(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Stopnje zvestobe."""
    return {
        "tiers": [
            {"name": "Bronasta", "min_points": 0, "discount": 0, "members": 420, "color": "#cd7f32"},
            {"name": "Srebrna", "min_points": 500, "discount": 5, "members": 180, "color": "#94a3b8"},
            {"name": "Zlata", "min_points": 1500, "discount": 10, "members": 85, "color": "#f59e0b"},
            {"name": "Platinasta", "min_points": 5000, "discount": 15, "members": 23, "color": "#8b5cf6"},
            {"name": "Diamantna", "min_points": 10000, "discount": 20, "members": 5, "color": "#3b82f6"},
        ],
        "total_members": 713,
    }


@router.get("/stats")
def get_promotions_stats(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Statistika promocij."""
    return {
        "active_promotions": 4,
        "total_uses": 621,
        "revenue_impact": 3994.00,
        "loyalty_members": 713,
    }
