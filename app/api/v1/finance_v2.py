"""Financial management — budgets, forecasting, profit analysis."""
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime, timedelta

from app.core.database import get_db
from app.api.v1.auth import get_current_user

router = APIRouter(prefix="/finance-v2", tags=["Finančno upravljanje"])


class BudgetCreate(BaseModel):
    name: str
    category: str
    amount: float
    period: str  # monthly, quarterly, yearly
    start_date: str
    end_date: str


@router.get("/profit-loss")
def get_profit_loss(
    period: str = Query("monthly"),
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Izkaz poslovnega izida."""
    return {
        "period": period,
        "revenue": {
            "food_sales": 24500.00,
            "beverage_sales": 8500.00,
            "other_revenue": 1200.00,
            "total_revenue": 34200.00,
        },
        "costs": {
            "cost_of_goods": {
                "food_cost": 8575.00,
                "beverage_cost": 2550.00,
                "total_cogs": 11125.00,
            },
            "operating_expenses": {
                "labor": 8765.00,
                "rent": 2500.00,
                "utilities": 450.00,
                "marketing": 234.56,
                "supplies": 345.67,
                "maintenance": 123.45,
                "insurance": 150.00,
                "other": 234.56,
                "total_opex": 12803.24,
            },
            "total_costs": 23928.24,
        },
        "gross_profit": 23075.00,
        "gross_margin": 67.5,
        "operating_profit": 10271.76,
        "operating_margin": 30.0,
        "net_profit": 10271.76,
        "net_margin": 30.0,
    }


@router.get("/budgets")
def list_budgets(
    period: str = Query("monthly"),
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Seznam proračunov."""
    return {
        "period": period,
        "budgets": [
            {
                "id": 1, "name": "Proračun za hrano",
                "category": "Hrana", "budget": 9000.00,
                "spent": 8575.00, "remaining": 425.00,
                "utilization": 95.3, "status": "on_track",
            },
            {
                "id": 2, "name": "Proračun za pijače",
                "category": "Pijače", "budget": 3000.00,
                "spent": 2550.00, "remaining": 450.00,
                "utilization": 85.0, "status": "on_track",
            },
            {
                "id": 3, "name": "Proračun za delo",
                "category": "Delo", "budget": 9000.00,
                "spent": 8765.00, "remaining": 235.00,
                "utilization": 97.4, "status": "warning",
            },
            {
                "id": 4, "name": "Proračun za najemnino",
                "category": "Najemnina", "budget": 2500.00,
                "spent": 2500.00, "remaining": 0.00,
                "utilization": 100.0, "status": "on_track",
            },
            {
                "id": 5, "name": "Marketinški proračun",
                "category": "Marketing", "budget": 500.00,
                "spent": 234.56, "remaining": 265.44,
                "utilization": 46.9, "status": "under_budget",
            },
        ],
        "total_budget": 24000.00,
        "total_spent": 22624.56,
        "total_remaining": 1375.44,
        "overall_utilization": 94.3,
    }


@router.post("/budgets")
def create_budget(data: BudgetCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Ustvari proračun."""
    return {
        "message": "Proračun ustvarjen",
        "budget": {
            "name": data.name,
            "category": data.category,
            "amount": data.amount,
            "period": data.period,
            "start_date": data.start_date,
            "end_date": data.end_date,
            "status": "active",
            "created_at": datetime.now().isoformat(),
        }
    }


@router.get("/cash-flow")
def get_cash_flow(
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Pretok denarja."""
    return {
        "period_days": days,
        "opening_balance": 15000.00,
        "inflows": {
            "sales": 34200.00,
            "other": 500.00,
            "total_inflows": 34700.00,
        },
        "outflows": {
            "suppliers": 11125.00,
            "labor": 8765.00,
            "rent": 2500.00,
            "utilities": 450.00,
            "other": 1234.56,
            "total_outflows": 24074.56,
        },
        "net_cash_flow": 10625.44,
        "closing_balance": 25625.44,
        "daily_flow": [
            {"date": "2026-01-01", "inflow": 1234, "outflow": 800, "net": 434},
            {"date": "2026-01-02", "inflow": 1345, "outflow": 850, "net": 495},
            {"date": "2026-01-03", "inflow": 1189, "outflow": 780, "net": 409},
        ],
    }


@router.get("/forecast")
def get_financial_forecast(
    months: int = Query(3, ge=1, le=12),
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Finančna napoved."""
    return {
        "forecast_months": months,
        "forecasts": [
            {
                "month": "2026-02",
                "revenue": 36000.00,
                "costs": 25000.00,
                "profit": 11000.00,
                "confidence": 0.85,
            },
            {
                "month": "2026-03",
                "revenue": 38000.00,
                "costs": 26000.00,
                "profit": 12000.00,
                "confidence": 0.80,
            },
            {
                "month": "2026-04",
                "revenue": 40000.00,
                "costs": 27000.00,
                "profit": 13000.00,
                "confidence": 0.75,
            },
        ],
        "assumptions": [
            "Rast prometa za 5% na mesec",
            "Stroški se bodo povečali za 3%",
            "Ni večjih investicij",
        ],
    }


@router.get("/cost-analysis")
def get_cost_analysis(
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Analiza stroškov."""
    return {
        "period_days": days,
        "cost_breakdown": [
            {"category": "Hrana", "amount": 11125.00, "percentage": 46.5, "trend": "stable"},
            {"category": "Delo", "amount": 8765.00, "percentage": 36.6, "trend": "increasing"},
            {"category": "Najemnina", "amount": 2500.00, "percentage": 10.4, "trend": "stable"},
            {"category": "Ostalo", "amount": 1538.24, "percentage": 6.4, "trend": "decreasing"},
        ],
        "cost_per_revenue": 0.70,
        "cost_per_order": 19.22,
        "cost_per_cover": 12.83,
        "benchmarks": {
            "food_cost_target": 0.30,
            "labor_cost_target": 0.30,
            "prime_cost_target": 0.60,
        },
        "insights": [
            "Stroški hrane so 37.1% prometa (tarča: 30%)",
            "Stroški dela so 25.6% prometa (tarča: 30%)",
            "Prime cost je 62.7% prometa (tarča: 60%)",
        ],
    }


@router.get("/variance")
def get_budget_variance(
    period: str = Query("monthly"),
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Odstopanja od proračuna."""
    return {
        "period": period,
        "variances": [
            {"category": "Hrana", "budget": 9000, "actual": 8575, "variance": 425, "variance_pct": 4.7, "status": "favorable"},
            {"category": "Pijače", "budget": 3000, "actual": 2550, "variance": 450, "variance_pct": 15.0, "status": "favorable"},
            {"category": "Delo", "budget": 9000, "actual": 8765, "variance": 235, "variance_pct": 2.6, "status": "unfavorable"},
            {"category": "Marketing", "budget": 500, "actual": 234.56, "variance": 265.44, "variance_pct": 53.1, "status": "favorable"},
        ],
        "total_budget": 24000,
        "total_actual": 22624.56,
        "total_variance": 1375.44,
        "total_variance_pct": 5.7,
    }


@router.get("/stats")
def get_finance_stats(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Statistika financ."""
    return {
        "total_revenue": 34200.00,
        "total_costs": 23928.24,
        "net_profit": 10271.76,
        "net_margin": 30.0,
        "gross_margin": 67.5,
        "cash_balance": 25625.44,
        "budget_utilization": 94.3,
        "cost_per_order": 19.22,
        "revenue_per_employee": 4275.00,
    }