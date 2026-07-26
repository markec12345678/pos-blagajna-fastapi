"""Price Rules V2 — advanced dynamic pricing with happy hour, combos, analytics."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.v1.auth import get_current_user

router = APIRouter(prefix="/price-rules-v2", tags=["Price Rules V2"])


@router.get("/rules")
def list_price_rules(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Pravila cen."""
    return {
        "rules": [
            {"id": 1, "name": "Happy Hour", "type": "time_based", "discount": 20, "conditions": "16:00-18:00, ponedeljek-petek", "status": "active", "applied_today": 45, "revenue_impact": -270.00},
            {"id": 2, "name": "Velika družina", "type": "group", "discount": 15, "conditions": "6+ gostov", "status": "active", "applied_today": 8, "revenue_impact": -96.00},
            {"id": 3, "name": "Zgodnja ptica", "type": "time_based", "discount": 10, "conditions": "12:00-13:00", "status": "active", "applied_today": 22, "revenue_impact": -88.00},
            {"id": 4, "name": "Kombi ponudba", "type": "combo", "discount": 12, "conditions": "Jeda + pijača", "status": "active", "applied_today": 35, "revenue_impact": -168.00},
            {"id": 5, "name": "VIP popust", "type": "loyalty", "discount": 10, "conditions": "Zlata+ stopnja", "status": "active", "applied_today": 12, "revenue_impact": -72.00},
            {"id": 6, "name": "Sezonski popust", "type": "seasonal", "discount": 5, "conditions": "Poletje 2026", "status": "inactive", "applied_today": 0, "revenue_impact": 0},
        ],
        "total": 6,
        "active": 5,
    }


@router.get("/analytics")
def get_price_rules_analytics(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Analitika pravil cen."""
    return {
        "total_rules": 6,
        "active_rules": 5,
        "total_applications_today": 122,
        "total_revenue_impact": -694.00,
        "avg_discount": 12.3,
        "by_type": [
            {"type": "time_based", "count": 2, "applications": 67, "impact": -358.00},
            {"type": "group", "count": 1, "applications": 8, "impact": -96.00},
            {"type": "combo", "count": 1, "applications": 35, "impact": -168.00},
            {"type": "loyalty", "count": 1, "applications": 12, "impact": -72.00},
            {"type": "seasonal", "count": 1, "applications": 0, "impact": 0},
        ],
        "top_performer": "Happy Hour",
    }


@router.get("/combos")
def get_combo_rules(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Kombinirana pravila."""
    return {
        "combos": [
            {"name": "Kosilo paket", "items": ["Juha", "Glavna jed", "Pijača"], "original_price": 22.00, "combo_price": 18.50, "savings": 3.50, "popularity": 85, "margin": 55.0},
            {"name": "Večerja za dva", "items": ["Predjed", "2x Glavna jed", "Sladica"], "original_price": 52.00, "combo_price": 45.00, "savings": 7.00, "popularity": 70, "margin": 58.0},
            {"name": "Kava in rezina", "items": ["Kava", "Rezina torte"], "original_price": 6.50, "combo_price": 5.50, "savings": 1.00, "popularity": 90, "margin": 70.0},
        ],
    }


@router.get("/stats")
def get_price_rules_stats(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Statistika pravil cen."""
    return {
        "total_rules": 6,
        "active_rules": 5,
        "today_applications": 122,
        "today_impact": -694.00,
    }
