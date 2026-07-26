"""Expense management system — track expenses, categories, approvals."""
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime, timedelta

from app.core.database import get_db
from app.api.v1.auth import get_current_user

router = APIRouter(prefix="/expenses", tags=["Stroški"])


class ExpenseCreate(BaseModel):
    category: str
    amount: float
    description: str
    vendor: Optional[str] = None
    receipt_url: Optional[str] = None
    date: Optional[str] = None
    notes: Optional[str] = None


class ExpenseCategory(BaseModel):
    name: str
    budget: Optional[float] = None
    color: Optional[str] = None


@router.get("/")
def list_expenses(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    category: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Vrni seznam stroškov."""
    # In production: fetch from Expense table
    # For now: return sample data
    return {
        "expenses": [
            {
                "id": 1, "category": "Hrana", "amount": 1234.56,
                "description": "Tedenski nakup sadja in zelenjave",
                "vendor": "Kmetija Poljane", "date": "2026-01-15",
                "status": "approved", "created_by": "Admin",
            },
            {
                "id": 2, "category": "Pijače", "amount": 567.89,
                "description": "Nakup piva in vina",
                "vendor": "Pijače d.o.o.", "date": "2026-01-14",
                "status": "approved", "created_by": "Admin",
            },
            {
                "id": 3, "category": "Oprema", "amount": 234.56,
                "description": "Novi noži za kuhinjo",
                "vendor": "Oprema za restavracije", "date": "2026-01-13",
                "status": "pending", "created_by": "Kuhar",
            },
        ],
        "total": 2037.01,
    }


@router.post("/")
def create_expense(data: ExpenseCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Ustvari nov strošek."""
    # In production: save to Expense table
    return {
        "message": "Strošek ustvarjen",
        "expense": {
            "category": data.category,
            "amount": data.amount,
            "description": data.description,
            "vendor": data.vendor,
            "date": data.date or datetime.now().strftime('%Y-%m-%d'),
            "status": "pending",
            "created_by": user.username if user else "Unknown",
        }
    }


@router.get("/categories")
def get_expense_categories(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Vrni kategorije stroškov."""
    return {
        "categories": [
            {"name": "Hrana", "budget": 5000, "spent": 3456.78, "color": "#22c55e"},
            {"name": "Pijače", "budget": 2000, "spent": 1234.56, "color": "#3b82f6"},
            {"name": "Oprema", "budget": 1000, "spent": 567.89, "color": "#f59e0b"},
            {"name": "Stroški prostora", "budget": 3000, "spent": 2800.00, "color": "#ef4444"},
            {"name": "Delovna sila", "budget": 10000, "spent": 8765.43, "color": "#8b5cf6"},
            {"name": "Marketinški", "budget": 500, "spent": 234.56, "color": "#ec4899"},
            {"name": "Drugi", "budget": 1000, "spent": 456.78, "color": "#6b7280"},
        ]
    }


@router.get("/summary")
def get_expense_summary(
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Povzetek stroškov."""
    return {
        "period_days": days,
        "total_expenses": 17516.00,
        "by_category": {
            "Hrana": 3456.78,
            "Pijače": 1234.56,
            "Oprema": 567.89,
            "Stroški prostora": 2800.00,
            "Delovna sila": 8765.43,
            "Marketinški": 234.56,
            "Drugi": 456.78,
        },
        "budget_utilization": 87.5,
        "vs_budget": -2184.00,
    }


@router.get("/budgets")
def get_budgets(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Vrni proračune po kategorijah."""
    return {
        "budgets": [
            {"category": "Hrana", "monthly_budget": 5000, "current_spend": 3456.78, "utilization": 69.1},
            {"category": "Pijače", "monthly_budget": 2000, "current_spend": 1234.56, "utilization": 61.7},
            {"category": "Oprema", "monthly_budget": 1000, "current_spend": 567.89, "utilization": 56.8},
            {"category": "Stroški prostora", "monthly_budget": 3000, "current_spend": 2800.00, "utilization": 93.3},
            {"category": "Delovna sila", "monthly_budget": 10000, "current_spend": 8765.43, "utilization": 87.7},
            {"category": "Marketinški", "monthly_budget": 500, "current_spend": 234.56, "utilization": 46.9},
        ]
    }


@router.post("/approve/{expense_id}")
def approve_expense(expense_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Odobri strošek."""
    # In production: update Expense status
    return {
        "message": "Strošek odobren",
        "expense_id": expense_id,
        "approved_by": user.username if user else "Unknown",
        "approved_at": datetime.now().isoformat(),
    }


@router.get("/recurring")
def get_recurring_expenses(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Vrni ponavljajoče se stroške."""
    return {
        "recurring": [
            {"name": "Najemnina", "amount": 2500, "frequency": "monthly", "next_due": "2026-02-01"},
            {"name": "Elektrika", "amount": 300, "frequency": "monthly", "next_due": "2026-02-15"},
            {"name": "Voda", "amount": 150, "frequency": "monthly", "next_due": "2026-02-15"},
            {"name": "Internet", "amount": 50, "frequency": "monthly", "next_due": "2026-02-01"},
            {"name": "Zavarovanje", "amount": 200, "frequency": "monthly", "next_due": "2026-03-01"},
        ],
        "total_monthly": 3200,
    }


@router.get("/forecast")
def get_expense_forecast(months: int = Query(3, ge=1, le=12), db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Napoved stroškov."""
    return {
        "forecast_months": months,
        "forecast": [
            {"month": "2026-02", "predicted": 18000, "confidence": 0.85},
            {"month": "2026-03", "predicted": 17500, "confidence": 0.80},
            {"month": "2026-04", "predicted": 19000, "confidence": 0.75},
        ],
        "trend": "increasing",
        "recommendation": "Priporočamo pregled stroškov za opremo in marketinške aktivnosti.",
    }