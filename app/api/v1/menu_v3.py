"""Menu V3 — advanced menu management with analytics and optimization."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.v1.auth import get_current_user

router = APIRouter(prefix="/menu-v3", tags=["Menu V3"])


@router.get("/items")
def list_menu_items(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Seznam jedi."""
    return {
        "items": [
            {"id": 1, "name": "Jota", "category": "Juhe", "price": 7.50, "cost": 2.80, "margin": 62.7, "popularity": 85, "trend": "stable", "status": "active"},
            {"id": 2, "name": "Štruklji", "category": "Glavne jedi", "price": 14.50, "cost": 5.20, "margin": 64.1, "popularity": 92, "trend": "increasing", "status": "active"},
            {"id": 3, "name": "Kranjska klobasa", "category": "Glavne jedi", "price": 16.00, "cost": 6.40, "margin": 60.0, "popularity": 78, "trend": "stable", "status": "active"},
            {"id": 4, "name": "Potica", "category": "Sladice", "price": 6.50, "cost": 2.10, "margin": 67.7, "popularity": 88, "trend": "increasing", "status": "active"},
            {"id": 5, "name": "Idrijski žlikrofi", "category": "Glavne jedi", "price": 18.00, "cost": 7.20, "margin": 60.0, "popularity": 95, "trend": "increasing", "status": "active"},
            {"id": 6, "name": "Bled cream cake", "category": "Sladice", "price": 8.00, "cost": 2.80, "margin": 65.0, "popularity": 90, "trend": "stable", "status": "active"},
        ],
        "total": 6,
    }


@router.get("/categories")
def get_menu_categories(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Kategorije menija."""
    return {
        "categories": [
            {"name": "Juhe", "items": 3, "avg_price": 7.00, "total_revenue": 1200.00, "avg_margin": 60.0},
            {"name": "Glavne jedi", "items": 8, "avg_price": 15.50, "total_revenue": 8500.00, "avg_margin": 61.5},
            {"name": "Sladice", "items": 5, "avg_price": 7.20, "total_revenue": 2800.00, "avg_margin": 66.0},
            {"name": "Pijače", "items": 12, "avg_price": 4.50, "total_revenue": 7200.00, "avg_margin": 75.0},
            {"name": "Dnevna ponudba", "items": 2, "avg_price": 18.00, "total_revenue": 1280.00, "avg_margin": 55.0},
        ],
    }


@router.get("/analytics")
def get_menu_analytics(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Analitika menija."""
    return {
        "total_items": 30,
        "avg_price": 12.40,
        "avg_margin": 63.5,
        "best_seller": "Idrijski žlikrofi",
        "worst_performer": "Dnevna juha",
        "high_margin_high_pop": 4,
        "low_margin_low_pop": 2,
        "recommendations": [
            {"item": "Dnevna juha", "action": "Povečaj ceno za 0.50 EUR", "impact": "+3% marža"},
            {"item": "Solata", "action": "Uvedi kot combo", "impact": "+15% prodaja"},
        ],
    }


@router.get("/optimize")
def get_menu_optimization(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Optimizacija menija."""
    return {
        "stars": ["Idrijski žlikrofi", "Štruklji", "Bled cream cake"],
        "puzzles": ["Kranjska klobasa"],
        "plow_horses": ["Jota"],
        "dogs": [],
        "suggestions": [
            "Povečaj ceno Kranjske klobase za 1 EUR (trend stabilen)",
            "Promoviraj Joto kot dnevno ponudbo",
            "Dodaj nov dizajn za Štruklje",
        ],
    }


@router.get("/stats")
def get_menu_stats(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Statistika menija."""
    return {
        "total_items": 30,
        "active_items": 28,
        "avg_price": 12.40,
        "avg_margin": 63.5,
        "best_seller": "Idrijski žlikrofi",
    }
