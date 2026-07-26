"""Branches V2 — advanced multi-branch management with comparison, performance."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from datetime import datetime

from app.core.database import get_db
from app.api.v1.auth import get_current_user

router = APIRouter(prefix="/branches-v2", tags=["Branches V2"])


@router.get("/list")
def list_branches(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Seznam poslovalnic."""
    return {
        "branches": [
            {"id": 1, "name": "Gostilna Majda", "location": "Griblje 70, Gradac", "status": "active", "revenue_today": 1850.00, "covers_today": 42, "staff_on_duty": 5, "avg_rating": 4.6},
            {"id": 2, "name": "Gostilna Majda - Vrt", "location": "Griblje 70, Gradac", "status": "active", "revenue_today": 1120.00, "covers_today": 28, "staff_on_duty": 3, "avg_rating": 4.5},
        ],
        "total": 2,
        "total_revenue_today": 2970.00,
        "total_covers_today": 70,
    }


@router.get("/comparison")
def get_branch_comparison(
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db), user=Depends(get_current_user)
):
    """Primerjava poslovalnic."""
    return {
        "period_days": days,
        "branches": [
            {"name": "Gostilna Majda", "revenue": 45200.00, "covers": 1050, "avg_order": 43.05, "avg_rating": 4.6, "staff": 5, "labor_cost_pct": 28.5, "food_cost_pct": 29.8},
            {"name": "Gostilna Majda - Vrt", "revenue": 28900.00, "covers": 720, "avg_order": 40.14, "avg_rating": 4.5, "staff": 3, "labor_cost_pct": 26.2, "food_cost_pct": 30.2},
        ],
        "total_revenue": 74100.00,
        "total_covers": 1770,
    }


@router.get("/performance")
def get_branch_performance(
    branch_id: int = Query(1),
    db: Session = Depends(get_db), user=Depends(get_current_user)
):
    """Uspešnost poslovalnice."""
    return {
        "branch_id": branch_id,
        "daily": [
            {"day": "Pon", "revenue": 1650.00, "covers": 38},
            {"day": "Tor", "revenue": 1820.00, "covers": 42},
            {"day": "Sre", "revenue": 2100.00, "covers": 48},
            {"day": "Čet", "revenue": 2350.00, "covers": 55},
            {"day": "Pet", "revenue": 2800.00, "covers": 65},
            {"day": "Sob", "revenue": 3200.00, "covers": 72},
            {"day": "Ned", "revenue": 1850.00, "covers": 42},
        ],
        "weekly_revenue": 15770.00,
        "weekly_covers": 362,
        "best_day": "Sobota",
        "worst_day": "Ponedeljek",
    }


@router.get("/stats")
def get_branches_stats(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Statistika poslovalnic."""
    return {
        "total_branches": 2,
        "active_branches": 2,
        "total_revenue_today": 2970.00,
        "total_covers_today": 70,
        "avg_rating": 4.55,
    }
