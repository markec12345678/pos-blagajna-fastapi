"""Expenses V2 — advanced expense tracking, categories, budgets, forecasting."""
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime

from app.core.database import get_db
from app.api.v1.auth import get_current_user

router = APIRouter(prefix="/expenses-v2", tags=["Porabniki V2"])


class ExpenseCreate(BaseModel):
    category: str
    amount: float
    description: str
    date: str
    receipt_url: Optional[str] = None


class BudgetCreate(BaseModel):
    category: str
    amount: float
    period: str  # monthly, quarterly, yearly


@router.get("/")
def list_expenses(
    days: int = Query(30, ge=1, le=365),
    category: Optional[str] = None,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Seznam stroškov."""
    return {
        "expenses": [
            {"id": 1, "category": "Hrana", "amount": 450.00, "description": "Tedensko naročilo", "date": "2026-01-15", "status": "approved"},
            {"id": 2, "category": "Pijače", "amount": 180.00, "description": "Vino in pivo", "date": "2026-01-14", "status": "approved"},
            {"id": 3, "category": "Oprema", "description": "Posodobitev", "amount": 320.00, "date": "2026-01-13", "status": "pending"},
            {"id": 4, "category": "Marketing", "amount": 150.00, "description": "Facebook oglasi", "date": "2026-01-12", "status": "approved"},
            {"id": 5, "category": "Vzdrževanje", "amount": 85.00, "description": "Servis klima", "date": "2026-01-10", "status": "approved"},
        ],
        "total": 5,
        "total_amount": 1185.00,
    }


@router.get("/categories")
def get_expense_categories(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Kategorije stroškov."""
    return {
        "categories": [
            {"name": "Hrana", "budget": 9000, "spent": 8575, "remaining": 425, "utilization": 95.3},
            {"name": "Pijače", "budget": 3000, "spent": 2550, "remaining": 450, "utilization": 85.0},
            {"name": "Oprema", "budget": 500, "spent": 320, "remaining": 180, "utilization": 64.0},
            {"name": "Marketing", "budget": 500, "spent": 150, "remaining": 350, "utilization": 30.0},
            {"name": "Vzdrževanje", "budget": 300, "spent": 85, "remaining": 215, "utilization": 28.3},
        ],
        "total_budget": 13300,
        "total_spent": 11680,
    }


@router.post("/")
def create_expense(data: ExpenseCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Ustvari strošek."""
    return {"message": "Strošek ustvarjen", "expense": {"id": 6, **data.dict(), "status": "pending", "created_by": user.username if user else "Unknown"}}


@router.get("/recurring")
def get_recurring_expenses(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Ponavljajoči se stroški."""
    return {
        "recurring": [
            {"name": "Najemnina", "amount": 2500.00, "frequency": "monthly", "next_date": "2026-02-01", "category": "Najemnina"},
            {"name": "Zavarovanje", "amount": 150.00, "frequency": "monthly", "next_date": "2026-02-01", "category": "Zavarovanje"},
            {"name": "Internet", "amount": 45.00, "frequency": "monthly", "next_date": "2026-02-01", "category": "Ostalo"},
            {"name": "Čiščenje", "amount": 200.00, "frequency": "weekly", "next_date": "2026-01-20", "category": "Vzdrževanje"},
        ],
        "monthly_total": 2895.00,
    }


@router.get("/forecast")
def get_expense_forecast(months: int = Query(3, ge=1, le=12), db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Napoved stroškov."""
    return {
        "forecasts": [
            {"month": "2026-02", "total": 12500.00, "confidence": 0.85, "top_categories": ["Hrana", "Delo"]},
            {"month": "2026-03", "total": 13000.00, "confidence": 0.80, "top_categories": ["Hrana", "Delo"]},
            {"month": "2026-04", "total": 12800.00, "confidence": 0.75, "top_categories": ["Hrana", "Delo"]},
        ],
        "trend": "stable",
        "yoy_change": 5.2,
    }


@router.get("/analytics")
def get_expense_analytics(days: int = Query(30, ge=1, le=365), db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Analiza stroškov."""
    return {
        "period_days": days,
        "total_expenses": 11680.00,
        "by_category": [
            {"name": "Hrana", "amount": 8575, "percentage": 73.4, "trend": "stable"},
            {"name": "Pijače", "amount": 2550, "percentage": 21.8, "trend": "decreasing"},
            {"name": "Oprema", "amount": 320, "percentage": 2.7, "trend": "increasing"},
            {"name": "Marketing", "amount": 150, "percentage": 1.3, "trend": "increasing"},
            {"name": "Vzdrževanje", "amount": 85, "percentage": 0.7, "trend": "stable"},
        ],
        "cost_per_revenue": 0.34,
        "cost_per_order": 9.38,
        "insights": [
            "Stroški hrane so stabilni",
            "Marketing se je povečal za 15%",
            "Vzdrževanje pod pričakovanji",
        ],
    }


@router.get("/stats")
def get_expenses_stats(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Statistika stroškov."""
    return {
        "total_expenses": 11680.00,
        "budget_utilization": 87.8,
        "cost_per_revenue": 0.34,
        "cost_per_order": 9.38,
        "recurring_monthly": 2895.00,
    }