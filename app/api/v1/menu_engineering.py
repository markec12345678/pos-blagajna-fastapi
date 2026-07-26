"""Menu engineering — cost analysis, profitability, menu optimization."""
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime, timedelta

from app.core.database import get_db
from app.api.v1.auth import get_current_user

router = APIRouter(prefix="/menu-engineering", tags=["Meni inženiring"])


class MenuItemUpdate(BaseModel):
    item_id: int
    selling_price: Optional[float] = None
    cost_per_portion: Optional[float] = None
    is_featured: Optional[bool] = None
    category: Optional[str] = None


@router.get("/analysis")
def get_menu_analysis(
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Analiza menija po dobičkonosnosti in priljubljenosti."""
    return {
        "period_days": days,
        "items": [
            {
                "id": 1, "name": "Rižota z gobami",
                "category": "Glavne jedi",
                "sold_quantity": 156,
                "revenue": 2184.00,
                "cost": 655.20,
                "profit": 1528.80,
                "margin": 70.0,
                "popularity_rank": 1,
                "profitability_rank": 3,
                "classification": "star",
                "trend": "stable",
            },
            {
                "id": 2, "name": "Pleskavica",
                "category": "Glavne jedi",
                "sold_quantity": 142,
                "revenue": 1278.00,
                "cost": 539.60,
                "profit": 738.40,
                "margin": 57.8,
                "popularity_rank": 2,
                "profitability_rank": 5,
                "classification": "plow_horse",
                "trend": "increasing",
            },
            {
                "id": 3, "name": "Štruklji",
                "category": "Sladice",
                "sold_quantity": 98,
                "revenue": 882.00,
                "cost": 245.00,
                "profit": 637.00,
                "margin": 72.2,
                "popularity_rank": 3,
                "profitability_rank": 2,
                "classification": "star",
                "trend": "increasing",
            },
            {
                "id": 4, "name": "Jabolčni zavitek",
                "category": "Sladice",
                "sold_quantity": 45,
                "revenue": 247.50,
                "cost": 99.00,
                "profit": 148.50,
                "margin": 60.0,
                "popularity_rank": 5,
                "profitability_rank": 4,
                "classification": "puzzle",
                "trend": "decreasing",
            },
            {
                "id": 5, "name": "Šnops",
                "category": "Pijače",
                "sold_quantity": 32,
                "revenue": 128.00,
                "cost": 32.00,
                "profit": 96.00,
                "margin": 75.0,
                "popularity_rank": 6,
                "profitability_rank": 1,
                "classification": "puzzle",
                "trend": "stable",
            },
            {
                "id": 6, "name": "Bela kava",
                "category": "Pijače",
                "sold_quantity": 120,
                "revenue": 360.00,
                "cost": 108.00,
                "profit": 252.00,
                "margin": 70.0,
                "popularity_rank": 4,
                "profitability_rank": 3,
                "classification": "star",
                "trend": "increasing",
            },
        ],
        "summary": {
            "total_items": 6,
            "stars": 3,
            "plow_horses": 1,
            "puzzles": 2,
            "dogs": 0,
            "avg_margin": 67.5,
            "total_revenue": 5079.50,
            "total_profit": 3400.70,
        },
    }


@router.get("/matrix")
def get_menu_matrix(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """BCG matrika menija."""
    return {
        "stars": [
            {"name": "Rižota z gobami", "popularity": 85, "profitability": 70},
            {"name": "Štruklji", "popularity": 72, "profitability": 72},
            {"name": "Bela kava", "popularity": 78, "profitability": 70},
        ],
        "plow_horses": [
            {"name": "Pleskavica", "popularity": 80, "profitability": 58},
        ],
        "puzzles": [
            {"name": "Jabolčni zavitek", "popularity": 35, "profitability": 60},
            {"name": "Šnops", "popularity": 25, "profitability": 75},
        ],
        "dogs": [],
        "insights": [
            "3 artikli so zvezde (visoka priljubljenost + visoka dobičkonosnost)",
            "1 artikli so plow horses (visoka priljubljenost + nizka dobičkonosnost)",
            "2 artikli so puzzles (nizka priljubljenost + visoka dobičkonosnost)",
            "Ni psov (nizka priljubljenost + nizka dobičkonosnost)",
        ],
    }


@router.get("/pricing")
def get_pricing_analysis(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Analiza cen."""
    return {
        "items": [
            {
                "name": "Rižota z gobami",
                "current_price": 14.00, "cost": 4.20,
                "suggested_price": 15.00, "competitor_avg": 13.50,
                "price_elasticity": -1.2, "optimal_price": 15.00,
            },
            {
                "name": "Pleskavica",
                "current_price": 9.00, "cost": 3.80,
                "suggested_price": 10.00, "competitor_avg": 9.50,
                "price_elasticity": -0.8, "optimal_price": 10.00,
            },
            {
                "name": "Štruklji",
                "current_price": 9.00, "cost": 2.50,
                "suggested_price": 10.00, "competitor_avg": 8.50,
                "price_elasticity": -1.0, "optimal_price": 10.00,
            },
        ],
        "recommendations": [
            "Povečajte ceno Rizoce za 1€ (potencial: +156€/mesec)",
            "Povečajte ceno Pleskavice za 1€ (potencial: +142€/mesec)",
            "Obdržite ceno Štrukljev, so competitive",
        ],
    }


@router.get("/category-performance")
def get_category_performance(
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Analiza po kategorijah."""
    return {
        "period_days": days,
        "categories": [
            {
                "name": "Glavne jedi",
                "items": 2, "sold": 298,
                "revenue": 3462.00, "cost": 1194.80,
                "profit": 2267.20, "margin": 65.5,
                "avg_rating": 4.6,
            },
            {
                "name": "Sladice",
                "items": 2, "sold": 143,
                "revenue": 1129.50, "cost": 344.00,
                "profit": 785.50, "margin": 69.5,
                "avg_rating": 4.7,
            },
            {
                "name": "Pijače",
                "items": 2, "sold": 152,
                "revenue": 488.00, "cost": 140.00,
                "profit": 348.00, "margin": 71.3,
                "avg_rating": 4.4,
            },
        ],
        "best_category": "Pijače",
        "worst_category": "Glavne jedi",
    }


@router.get("/optimization")
def get_menu_optimization(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Predlogi za optimizacijo menija."""
    return {
        "add": [
            {"name": "Sezonska solata", "reason": "Nizki stroški, visoka dobičkonosnost"},
            {"name": "Dnevna juha", "reason": "Povečuje promet, nizki stroški"},
        ],
        "remove": [
            {"name": "Jabolčni zavitek", "reason": "Nizka priljubljenost, razmislite o zamenjavi"},
        ],
        "reprice": [
            {"name": "Rižota z gobami", "from": 14.00, "to": 15.00, "reason": "Pod povprečno konkurenco"},
            {"name": "Pleskavica", "from": 9.00, "to": 10.00, "reason": "Visoka priljubljenost, nizka cena"},
        ],
        "promote": [
            {"name": "Šnops", "reason": "Visoka dobičkonosnost, nizka priljubljenost"},
            {"name": "Jabolčni zavitek", "reason": "Poskusite z promocijo pred odstranitvijo"},
        ],
        "expected_impact": {
            "revenue_increase": 850.00,
            "profit_increase": 620.00,
            "margin_increase": 3.2,
        },
    }


@router.get("/seasonal")
def get_seasonal_analysis(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Sezonska analiza menija."""
    return {
        "current_season": "zima",
        "seasonal_items": [
            {"name": "Kisla juha", "season": "zima", "is_available": True},
            {"name": "Beli fižol v tekočini", "season": "zima", "is_available": True},
            {"name": "Štruklji z jabolki", "season": "jesen", "is_available": False},
        ],
        "recommendations": [
            "Dodajte zimske jedi: kisla juha, beli fižol",
            "Odstranite poletne jedi iz menija",
            "Posebna ponudba: tople napitke za zimo",
        ],
    }


@router.get("/stats")
def get_menu_engineering_stats(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Statistika meni inženiringa."""
    return {
        "total_menu_items": 45,
        "avg_margin": 67.5,
        "avg_selling_price": 11.50,
        "avg_cost_per_portion": 3.74,
        "most_profitable": "Šnops",
        "most_popular": "Rižota z gobami",
        "underperformers": 1,
        "optimization_opportunities": 3,
        "last_analysis": "2026-01-15",
    }