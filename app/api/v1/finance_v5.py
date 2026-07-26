from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.v1.auth import get_current_user

router = APIRouter(prefix="/finance-v5", tags=["finance-v5"])

@router.get("/cashflow")
def get_cashflow(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"cashflow": [
        {"month": "Jan", "inflow": 32000, "outflow": 24000, "net": 8000},
        {"month": "Feb", "inflow": 28000, "outflow": 22000, "net": 6000},
        {"month": "Mar", "inflow": 35000, "outflow": 25000, "net": 10000},
        {"month": "Apr", "inflow": 31000, "outflow": 23000, "net": 8000},
        {"month": "Maj", "inflow": 38000, "outflow": 26000, "net": 12000},
        {"month": "Jun", "inflow": 42000, "outflow": 28000, "net": 14000},
    ], "total_inflow": 206000, "total_outflow": 148000, "total_net": 58000}

@router.get("/forecast")
def get_forecast(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"forecast": [
        {"month": "Jul", "predicted": 45000, "low": 40000, "high": 50000, "confidence": 85},
        {"month": "Avg", "predicted": 43000, "low": 38000, "high": 48000, "confidence": 80},
        {"month": "Sep", "predicted": 38000, "low": 33000, "high": 43000, "confidence": 75},
        {"month": "Okt", "predicted": 35000, "low": 30000, "high": 40000, "confidence": 70},
    ], "methodology": "ARIMA + sezonski trend"}

@router.get("/expense-categories")
def get_expense_categories(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"categories": [
        {"name": "Hrana in pijača", "amount": 85000, "percentage": 38.2, "trend": "stable", "budget": 82000},
        {"name": "Delovna sila", "amount": 62000, "percentage": 27.8, "trend": "up", "budget": 60000},
        {"name": "Najemnina", "amount": 24000, "percentage": 10.8, "trend": "stable", "budget": 24000},
        {"name": "Oprema", "amount": 15000, "percentage": 6.7, "trend": "down", "budget": 18000},
        {"name": "Oglaševanje", "amount": 12000, "percentage": 5.4, "trend": "up", "budget": 10000},
        {"name": "Stroški", "amount": 25000, "percentage": 11.2, "trend": "stable", "budget": 24000},
    ]}

@router.get("/profitability")
def get_profitability(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"profitability": [
        {"item": "Margherita", "revenue": 4250, "cost": 1275, "margin": 70.0, "units": 500},
        {"item": "Pepperoni", "revenue": 5250, "cost": 1837, "margin": 65.0, "units": 500},
        {"item": "Caesar Salad", "revenue": 3750, "cost": 1125, "margin": 70.0, "units": 500},
        {"item": "Grilled Salmon", "revenue": 7750, "cost": 3100, "margin": 60.0, "units": 500},
        {"item": "Steak", "revenue": 9000, "cost": 3600, "margin": 60.0, "units": 500},
        {"item": "Tiramisu", "revenue": 2750, "cost": 825, "margin": 70.0, "units": 500},
    ], "avg_margin": 65.8}

@router.get("/tax-summary")
def get_tax_summary(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"tax": {
        "total_revenue": 222000,
        "taxable_revenue": 200000,
        "vat_collected": 40000,
        "vat_rate": 20,
        "deductions": 8500,
        "net_tax": 31500,
        "filing_status": "Aktualno",
        "next_filing": "2025-07-15",
    }}

@router.get("/investment-roi")
def get_investment_roi(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"investments": [
        {"name": "Nova pečica", "cost": 12000, "revenue_impact": 3500, "roi_months": 4, "status": "paid_off"},
        {"name": "Oglaševanje Google", "cost": 3000, "revenue_impact": 800, "roi_months": 4, "status": "active"},
        {"name": "Prenova terase", "cost": 8000, "revenue_impact": 2000, "roi_months": 4, "status": "active"},
        {"name": "POS sistem", "cost": 5000, "revenue_impact": 1500, "roi_months": 3, "status": "paid_off"},
    ]}

@router.get("/variance-analysis")
def get_variance_analysis(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"variance": [
        {"category": "Hrana", "budget": 82000, "actual": 85000, "variance": 3000, "pct": 3.7},
        {"category": "Delovna sila", "budget": 60000, "actual": 62000, "variance": 2000, "pct": 3.3},
        {"category": "Oprema", "budget": 18000, "actual": 15000, "variance": -3000, "pct": -16.7},
        {"category": "Oglaševanje", "budget": 10000, "actual": 12000, "variance": 2000, "pct": 20.0},
        {"category": "Stroški", "budget": 24000, "actual": 25000, "variance": 1000, "pct": 4.2},
    ], "total_budget": 194000, "total_actual": 199000, "total_variance": 5000}
