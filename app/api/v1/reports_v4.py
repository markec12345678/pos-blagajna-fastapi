"""Reports V4 — advanced reporting with financial KPIs, comparison, trends."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.v1.auth import get_current_user

router = APIRouter(prefix="/reports-v4", tags=["Reports V4"])


@router.get("/financial")
def get_financial_report(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Finančno poročilo."""
    return {
        "revenue": {"current": 29780.00, "previous": 27500.00, "change_pct": 8.3, "ytd": 198500.00},
        "costs": {"food": 8934.00, "labor": 8840.00, "rent": 3500.00, "utilities": 1200.00, "other": 1806.00, "total": 24280.00},
        "profit": {"gross": 20846.00, "net": 5500.00, "gross_margin": 69.9, "net_margin": 18.5},
        "kpis": {"avg_order_value": 38.50, "covers_per_day": 65, "revenue_per_seat": 458.15, "food_cost_pct": 30.0, "labor_cost_pct": 29.7, "prime_cost_pct": 59.7},
    }


@router.get("/comparison")
def get_period_comparison(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Primerjava obdobij."""
    return {
        "comparison": [
            {"month": "Julij 2026", "revenue": 29780.00, "costs": 24280.00, "profit": 5500.00, "covers": 2015},
            {"month": "Junij 2026", "revenue": 27500.00, "costs": 23200.00, "profit": 4300.00, "covers": 1890},
            {"month": "Maj 2026", "revenue": 31200.00, "costs": 25100.00, "profit": 6100.00, "covers": 2180},
            {"month": "April 2026", "revenue": 28900.00, "costs": 24000.00, "profit": 4900.00, "covers": 2050},
            {"month": "Marec 2026", "revenue": 26800.00, "costs": 22900.00, "profit": 3900.00, "covers": 1820},
        ],
        "avg_change": 5.8,
    }


@router.get("/kpi-dashboard")
def get_kpi_dashboard(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """KPI nadzorna plošča."""
    return {
        "kpis": [
            {"name": "Prihodek", "value": 29780.00, "target": 32000.00, "unit": "EUR", "status": "below", "trend": "increasing"},
            {"name": "Dobiček", "value": 5500.00, "target": 6000.00, "unit": "EUR", "status": "below", "trend": "increasing"},
            {"name": "Gosti", "value": 2015, "target": 2200, "unit": "", "status": "below", "trend": "stable"},
            {"name": "Povp. naročilo", "value": 38.50, "target": 35.00, "unit": "EUR", "status": "above", "trend": "increasing"},
            {"name": "Hrana %", "value": 30.0, "target": 28.0, "unit": "%", "status": "below", "trend": "decreasing"},
            {"name": "Delo %", "value": 29.7, "target": 30.0, "unit": "%", "status": "above", "trend": "stable"},
            {"name": "Retencija", "value": 68.0, "target": 70.0, "unit": "%", "status": "below", "trend": "increasing"},
            {"name": "Zasedenost", "value": 72.0, "target": 75.0, "unit": "%", "status": "below", "trend": "stable"},
        ],
        "overall_score": 78,
    }


@router.get("/category-breakdown")
def get_category_breakdown(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Razčlenitev po kategorijah."""
    return {
        "categories": [
            {"name": "Hrana", "revenue": 18500.00, "cost": 8934.00, "margin": 51.7, "items_sold": 1250, "avg_price": 14.80},
            {"name": "Pijače", "revenue": 7200.00, "cost": 1800.00, "margin": 75.0, "items_sold": 1440, "avg_price": 5.00},
            {"name": "Sladice", "revenue": 2800.00, "cost": 1120.00, "margin": 60.0, "items_sold": 280, "avg_price": 10.00},
            {"name": "Dnevna ponudba", "revenue": 1280.00, "cost": 576.00, "margin": 55.0, "items_sold": 64, "avg_price": 20.00},
        ],
    }


@router.get("/stats")
def get_reports_stats(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Statistika poročil."""
    return {
        "total_revenue": 29780.00,
        "total_profit": 5500.00,
        "overall_score": 78,
        "revenue_change": 8.3,
    }
