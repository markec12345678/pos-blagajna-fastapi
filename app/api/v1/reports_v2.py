"""Advanced reporting — custom reports, data visualization, export."""
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime, timedelta

from app.core.database import get_db
from app.api.v1.auth import get_current_user

router = APIRouter(prefix="/reports-advanced", tags=["Napredna poročila"])


class ReportCreate(BaseModel):
    name: str
    type: str  # sales, inventory, customers, employees, financial
    date_range: str  # daily, weekly, monthly, custom
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    filters: Optional[dict] = None
    metrics: Optional[List[str]] = None


@router.get("/templates")
def get_report_templates(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Predloge poročil."""
    return {
        "templates": [
            {
                "id": 1, "name": "Dnevno poročilo prodaje",
                "type": "sales", "frequency": "daily",
                "metrics": ["revenue", "orders", "avg_order"],
                "description": "Povzetek dnevne prodaje",
            },
            {
                "id": 2, "name": "Tedenski pregled zalog",
                "type": "inventory", "frequency": "weekly",
                "metrics": ["stock_levels", "turnover", "waste"],
                "description": "Analiza zalog in porabe",
            },
            {
                "id": 3, "name": "Mesečno finančno poročilo",
                "type": "financial", "frequency": "monthly",
                "metrics": ["revenue", "costs", "profit", "margins"],
                "description": "Celoten finančni pregled",
            },
            {
                "id": 4, "name": "Poraba strank",
                "type": "customers", "frequency": "monthly",
                "metrics": ["visits", "spend", "retention"],
                "description": "Analiza obnašanja strank",
            },
            {
                "id": 5, "name": "Uspešnost zaposlenih",
                "type": "employees", "frequency": "weekly",
                "metrics": ["hours", "performance", "tips"],
                "description": "Pregled uspešnosti ekipe",
            },
        ],
        "total": 5,
    }


@router.post("/generate")
def generate_report(data: ReportCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Generiraj poročilo."""
    return {
        "message": "Poročilo generirano",
        "report": {
            "name": data.name,
            "type": data.type,
            "date_range": data.date_range,
            "generated_at": datetime.now().isoformat(),
            "generated_by": user.username if user else "Unknown",
            "download_url": f"/api/v1/reports-advanced/download/{data.type}",
        }
    }


@router.get("/sales")
def get_sales_report(
    period: str = Query("daily"),
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Prodajno poročilo."""
    return {
        "period": period,
        "summary": {
            "total_revenue": 1234.56,
            "total_orders": 42,
            "avg_order_value": 29.39,
            "revenue_change": 12.5,
            "orders_change": 8.3,
        },
        "by_hour": [
            {"hour": "08:00", "revenue": 45.50, "orders": 2},
            {"hour": "09:00", "revenue": 67.80, "orders": 3},
            {"hour": "10:00", "revenue": 89.20, "orders": 4},
            {"hour": "11:00", "revenue": 123.45, "orders": 5},
            {"hour": "12:00", "revenue": 234.56, "orders": 8},
            {"hour": "13:00", "revenue": 198.76, "orders": 7},
            {"hour": "14:00", "revenue": 87.65, "orders": 3},
            {"hour": "15:00", "revenue": 65.43, "orders": 2},
            {"hour": "16:00", "revenue": 78.90, "orders": 3},
            {"hour": "17:00", "revenue": 112.34, "orders": 4},
            {"hour": "18:00", "revenue": 156.78, "orders": 6},
        ],
        "by_category": [
            {"category": "Glavne jedi", "revenue": 680.00, "percentage": 55.1},
            {"category": "Pijače", "revenue": 320.00, "percentage": 25.9},
            {"category": "Sladice", "revenue": 150.00, "percentage": 12.1},
            {"category": "Predjedi", "revenue": 84.56, "percentage": 6.9},
        ],
        "top_items": [
            {"name": "Rižota z gobami", "quantity": 12, "revenue": 168.00},
            {"name": "Pleskavica", "quantity": 8, "revenue": 72.00},
            {"name": "Štruklji", "quantity": 6, "revenue": 54.00},
        ],
    }


@router.get("/inventory")
def get_inventory_report(
    period: str = Query("weekly"),
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Poročilo zalog."""
    return {
        "period": period,
        "summary": {
            "total_items": 45,
            "total_value": 12345.67,
            "turnover_rate": 4.2,
            "waste_percentage": 3.2,
        },
        "top_consumed": [
            {"name": "Mleko", "consumed": 45, "unit": "l", "cost": 81.00},
            {"name": "Kruh", "consumed": 30, "unit": "kos", "cost": 45.00},
            {"name": "Moka", "consumed": 25, "unit": "kg", "cost": 50.00},
        ],
        "low_stock": [
            {"name": "Mleko", "stock": 10, "unit": "l", "min_stock": 15},
            {"name": "Pivo", "stock": 12, "unit": "steklenic", "min_stock": 18},
        ],
        "waste_analysis": [
            {"category": "Mlečni izdelki", "waste_pct": 4.5, "cost": 45.00},
            {"category": "Sadje", "waste_pct": 3.2, "cost": 32.00},
            {"category": "Kruh", "waste_pct": 2.8, "cost": 14.00},
        ],
    }


@router.get("/customers")
def get_customer_report(
    period: str = Query("monthly"),
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Poročilo strank."""
    return {
        "period": period,
        "summary": {
            "total_customers": 1250,
            "new_customers": 45,
            "returning_rate": 68.0,
            "avg_lifetime_value": 350.00,
        },
        "segments": [
            {"segment": "VIP", "count": 85, "revenue_share": 25.0},
            {"segment": "Loyal", "count": 320, "revenue_share": 40.0},
            {"segment": "Potential", "count": 250, "revenue_share": 25.0},
            {"segment": "At Risk", "count": 340, "revenue_share": 5.0},
            {"segment": "Lost", "count": 255, "revenue_share": 5.0},
        ],
        "satisfaction": {
            "nps_score": 72,
            "satisfaction_rate": 94.2,
            "complaint_rate": 0.5,
        },
        "top_customers": [
            {"name": "Janez Novak", "visits": 28, "spent": 1260.00},
            {"name": "Ana Petrović", "visits": 35, "spent": 1575.00},
            {"name": "Marija Kovač", "visits": 22, "spent": 770.00},
        ],
    }


@router.get("/employees")
def get_employee_report(
    period: str = Query("weekly"),
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Poročilo zaposlenih."""
    return {
        "period": period,
        "summary": {
            "total_employees": 8,
            "total_hours": 672,
            "total_tips": 1845.67,
            "avg_performance": 90.7,
        },
        "by_employee": [
            {
                "name": "Janez Novak", "role": "Manager",
                "hours": 160, "tips": 0.00, "performance": 92.5,
                "attendance": 95.5,
            },
            {
                "name": "Marija Kovač", "role": "Kuhar",
                "hours": 320, "tips": 0.00, "performance": 94.2,
                "attendance": 98.0,
            },
            {
                "name": "Peter Horvat", "role": "Natakar",
                "hours": 192, "tips": 678.90, "performance": 85.3,
                "attendance": 87.5,
            },
        ],
        "labor_cost": {
            "total": 13440.00,
            "overtime": 720.00,
            "overtime_pct": 5.4,
            "cost_per_revenue": 0.28,
        },
    }


@router.get("/financial")
def get_financial_report(
    period: str = Query("monthly"),
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Finančno poročilo."""
    return {
        "period": period,
        "revenue": 34200.00,
        "costs": {
            "food": 11125.00,
            "labor": 8765.00,
            "rent": 2500.00,
            "utilities": 450.00,
            "other": 1082.24,
            "total": 23922.24,
        },
        "profit": {
            "gross": 23075.00,
            "operating": 10277.76,
            "net": 10277.76,
        },
        "margins": {
            "gross": 67.5,
            "operating": 30.0,
            "net": 30.0,
        },
        "trends": {
            "revenue_change": 12.5,
            "cost_change": 8.3,
            "profit_change": 18.2,
        },
    }


@router.get("/export")
def export_report(
    format: str = Query("pdf"),
    report_type: str = Query("sales"),
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Izvozi poročilo."""
    return {
        "message": f"Poročilo izvoženo v formatu {format.upper()}",
        "download_url": f"/api/v1/reports-advanced/download/{report_type}.{format}",
        "generated_at": datetime.now().isoformat(),
        "expires_in": 3600,
    }


@router.get("/scheduled")
def get_scheduled_reports(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Načrtovana poročila."""
    return {
        "reports": [
            {
                "id": 1, "name": "Dnevno poročilo prodaje",
                "type": "sales", "frequency": "daily",
                "time": "06:00", "recipients": ["admin@riverkolpa.si"],
                "format": "pdf", "is_active": True,
            },
            {
                "id": 2, "name": "Tedensko poročilo zalog",
                "type": "inventory", "frequency": "weekly",
                "time": "07:00", "recipients": ["skladisce@riverkolpa.si"],
                "format": "csv", "is_active": True,
            },
            {
                "id": 3, "name": "Mesečno finančno poročilo",
                "type": "financial", "frequency": "monthly",
                "time": "08:00", "recipients": ["finance@riverkolpa.si"],
                "format": "excel", "is_active": True,
            },
        ],
        "total": 3,
        "active": 3,
    }


@router.get("/stats")
def get_reports_stats(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Statistika poročil."""
    return {
        "total_reports": 156,
        "this_month": 12,
        "scheduled": 3,
        "templates": 5,
        "last_generated": "2026-01-15",
        "most_used": "Dnevno poročilo prodaje",
    }