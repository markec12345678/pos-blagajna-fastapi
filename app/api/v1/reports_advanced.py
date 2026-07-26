"""Advanced reporting — custom reports, data visualization, analytics."""
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime, timedelta

from app.core.database import get_db
from app.api.v1.auth import get_current_user

router = APIRouter(prefix="/reports-advanced", tags=["Napredna poročila"])


class ReportConfig(BaseModel):
    name: str
    type: str  # sales, inventory, employees, customers, financial
    date_range: str  # daily, weekly, monthly, custom
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    filters: Optional[dict] = None
    group_by: Optional[str] = None
    metrics: Optional[List[str]] = None


@router.get("/templates")
def get_report_templates(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Vrni predloge poročil."""
    return {
        "templates": [
            {
                "id": 1, "name": "Dnevno poročilo prodaje",
                "description": "Povzetek dnevne prodaje po urah",
                "type": "sales", "icon": "calendar",
                "default_metrics": ["revenue", "orders", "avg_order"],
            },
            {
                "id": 2, "name": "Tedensko poročilo zalog",
                "description": "Pregled zalog in porabe materiala",
                "type": "inventory", "icon": "package",
                "default_metrics": ["stock_level", "consumption", "waste"],
            },
            {
                "id": 3, "name": "Mesečno poročilo zaposlenih",
                "description": "Delovni čas, zmogljivost, napotki",
                "type": "employees", "icon": "users",
                "default_metrics": ["hours_worked", "performance", "tips"],
            },
            {
                "id": 4, "name": "Analiza strank",
                "description": "Vedenje strank, zvestoba, povprečje",
                "type": "customers", "icon": "heart",
                "default_metrics": ["visits", "spending", "loyalty"],
            },
            {
                "id": 5, "name": "Finančno poročilo",
                "description": "Dohodki, stroški, dobiček",
                "type": "financial", "icon": "dollar-sign",
                "default_metrics": ["revenue", "expenses", "profit"],
            },
            {
                "id": 6, "name": "Analiza menija",
                "description": "Najbolj/najmanj prodajani artikli",
                "type": "menu", "icon": "utensils",
                "default_metrics": ["popularity", "profitability", "trend"],
            },
        ],
        "total": 6,
    }


@router.get("/custom/{report_id}")
def get_custom_report(
    report_id: int,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Vrni custom poročilo."""
    # In production: fetch from CustomReport table
    return {
        "report": {
            "id": report_id,
            "name": "Dnevno poročilo prodaje",
            "generated_at": datetime.now().isoformat(),
            "period": "2026-01-15",
            "data": {
                "revenue": {
                    "total": 1234.56,
                    "food": 876.54,
                    "beverages": 358.02,
                    "by_hour": [
                        {"hour": "08:00", "revenue": 45.50},
                        {"hour": "09:00", "revenue": 67.80},
                        {"hour": "10:00", "revenue": 89.20},
                        {"hour": "11:00", "revenue": 123.45},
                        {"hour": "12:00", "revenue": 234.56},
                        {"hour": "13:00", "revenue": 198.76},
                        {"hour": "14:00", "revenue": 87.65},
                        {"hour": "15:00", "revenue": 65.43},
                        {"hour": "16:00", "revenue": 78.90},
                        {"hour": "17:00", "revenue": 112.34},
                        {"hour": "18:00", "revenue": 156.78},
                    ],
                },
                "orders": {
                    "total": 42,
                    "dine_in": 35,
                    "takeout": 7,
                    "avg_per_hour": 4.2,
                    "peak_hour": "12:00",
                },
                "top_items": [
                    {"name": "Rižota z gobami", "quantity": 12, "revenue": 168.00},
                    {"name": "Pleskavica", "quantity": 8, "revenue": 72.00},
                    {"name": "Štruklji", "quantity": 6, "revenue": 54.00},
                ],
                "bottom_items": [
                    {"name": "Jabolčni zavitek", "quantity": 1, "revenue": 5.50},
                    {"name": "Šnops", "quantity": 2, "revenue": 8.00},
                ],
            },
        }
    }


@router.post("/generate")
def generate_report(data: ReportConfig, db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Generiraj poročilo."""
    return {
        "message": "Poročilo generirano",
        "report": {
            "name": data.name,
            "type": data.type,
            "date_range": data.date_range,
            "generated_at": datetime.now().isoformat(),
            "generated_by": user.username if user else "Unknown",
            "status": "ready",
            "download_url": f"/api/v1/reports-advanced/download/{data.type}",
        }
    }


@router.get("/dashboard")
def get_analytics_dashboard(
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Analitični dashboard."""
    return {
        "period_days": days,
        "kpis": {
            "total_revenue": 36789.01,
            "revenue_change": 12.5,
            "total_orders": 1245,
            "orders_change": 8.3,
            "avg_order_value": 29.55,
            "avg_change": 3.7,
            "customer_satisfaction": 4.7,
            "satisfaction_change": 0.2,
            "waste_percentage": 3.8,
            "waste_change": -0.5,
            "employee_efficiency": 92.1,
            "efficiency_change": 1.8,
        },
        "charts": {
            "revenue_trend": [
                {"date": "2026-01-01", "value": 1234},
                {"date": "2026-01-02", "value": 1345},
                {"date": "2026-01-03", "value": 1189},
                {"date": "2026-01-04", "value": 1456},
                {"date": "2026-01-05", "value": 1278},
                {"date": "2026-01-06", "value": 1567},
                {"date": "2026-01-07", "value": 1389},
            ],
            "orders_by_type": [
                {"type": "Dine-in", "value": 35},
                {"type": "Takeout", "value": 7},
            ],
            "popular_categories": [
                {"category": "Glavne jedi", "value": 45},
                {"category": "Predjedi", "value": 20},
                {"category": "Pijače", "value": 25},
                {"category": "Sladice", "value": 10},
            ],
        },
        "insights": [
            "Promet se je povečal za 12.5% v primerjavi s prejšnjim mesecem",
            "Najbolj prodajan artikli: Rižota z gobami, Pleskavica",
            "Vikendi generirajo 40% več prometa kot delavniki",
            "Povprečna ocena strank se je izboljšala za 0.2 točke",
        ],
    }


@router.get("/export/{format}")
def export_report(
    format: str,
    report_type: str = Query("sales"),
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Izvozi poročilo."""
    if format not in ["pdf", "csv", "excel"]:
        return {"error": "Nepodprt format. Uporabite pdf, csv ali excel."}

    return {
        "message": f"Poročilo izvoženo v formatu {format.upper()}",
        "download_url": f"/api/v1/reports-advanced/download/{report_type}.{format}",
        "generated_at": datetime.now().isoformat(),
        "expires_in": 3600,
    }


@router.get("/scheduled")
def get_scheduled_reports(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Vrni načrtovana poročila."""
    return {
        "scheduled": [
            {
                "id": 1, "name": "Dnevno poročilo prodaje",
                "type": "sales", "frequency": "daily",
                "time": "06:00", "recipients": ["admin@riverkolpa.si"],
                "format": "pdf", "is_active": True,
            },
            {
                "id": 2, "name": "Tedensko poročilo zalog",
                "type": "inventory", "frequency": "weekly",
                "day": "ponedeljek", "time": "07:00",
                "recipients": ["admin@riverkolpa.si", "skladisce@riverkolpa.si"],
                "format": "csv", "is_active": True,
            },
            {
                "id": 3, "name": "Mesečno finančno poročilo",
                "type": "financial", "frequency": "monthly",
                "day": 1, "time": "08:00",
                "recipients": ["finance@riverkolpa.si"],
                "format": "excel", "is_active": True,
            },
        ],
        "total": 3,
    }


@router.get("/insights")
def get_ai_insights(
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """AI-insights za poslovanje."""
    return {
        "period_days": days,
        "insights": [
            {
                "category": "prodaja",
                "title": "Povečanje vikend prometa",
                "description": "Promet ob vikendih se je povečal za 25%. Razmislite o dodatnem osebju.",
                "impact": "high",
                "action": "Načrtuj dodatno osebje za vikende",
            },
            {
                "category": "meni",
                "title": "Nizka prodaja jabolčnega zavitka",
                "description": "Jabolčni zavitek se prodaja 5x manj kot drugi artikli.",
                "impact": "medium",
                "action": "Razmislite o znižanju cene ali promociji",
            },
            {
                "category": "zaloge",
                "title": "Optimizacija naročil",
                "description": "Moka se naroča 20% preveč. Zmanjšajte količino.",
                "impact": "low",
                "action": "Zmanjšajte količino naročila za moko",
            },
            {
                "category": "osebje",
                "title": "Učinkovitost natakarjev",
                "description": "Peter Horvat ima 15% nižjo učinkovitost kot povprečje.",
                "impact": "medium",
                "action": "Razgovor s Petrom o izboljšanju",
            },
        ],
        "total": 4,
    }


@router.get("/stats")
def get_report_stats(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Statistika poročil."""
    return {
        "total_reports": 156,
        "this_month": 12,
        "scheduled": 3,
        "custom_reports": 8,
        "last_generated": "2026-01-15T08:00:00",
        "most_used": "Dnevno poročilo prodaje",
        "export_formats": {"pdf": 45, "csv": 32, "excel": 23},
    }