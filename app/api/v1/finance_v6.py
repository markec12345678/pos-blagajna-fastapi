from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.v1.auth import get_current_user

router = APIRouter(prefix="/finance-v6", tags=["finance-v6"])

@router.get("/cash-flow")
def get_cash_flow(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"cash_flow": {
        "current_balance": 45200,
        "inflows": {"today": 2850, "week": 18500, "month": 42000, "quarter": 128000},
        "outflows": {"today": 1200, "week": 8500, "month": 35000, "quarter": 105000},
        "net_flow": {"today": 1650, "week": 10000, "month": 7000, "quarter": 23000},
        "projection_30_days": 48500,
        "projection_90_days": 52000,
        "alerts": [
            {"type": "positive", "message": "Pozitiven tok denarja 5 zaporednih tednov"},
            {"type": "warning", "message": "Prihajajoči najemninski rok 01.08: €2000"},
        ]
    }}

@router.get("/tax-reporting")
def get_tax_reporting(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"tax": {
        "period": "Q2 2025",
        "revenue": 128000,
        "deductible_expenses": 85000,
        "taxable_income": 43000,
        "vat_collected": 25600,
        "vat_paid": 17000,
        "vat_balance": 8600,
        "estimated_tax": 10750,
        "deductions_claimed": [
            {"category": "Poslovni stroški", "amount": 15000, "documentation": "Računi"},
            {"category": "Doprinosi", "amount": 28000, "documentation": "Pobotnice"},
            {"category": "Amortizacija", "amount": 6000, "documentation": "Osnovna sredstva"},
            {"category": "Potni stroški", "amount": 2000, "documentation": "Potni nalogi"},
            {"category": "Izobraževanje", "amount": 1500, "documentation": "Potrdila"},
            {"category": "Oprema", "amount": 12500, "documentation": "Računi"},
        ],
        "next_filing": "2025-07-31"
    }}

@router.get("/profit-centers")
def get_profit_centers(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"centers": [
        {"name": "Restavracija", "revenue": 35000, "direct_costs": 12000, "contribution": 23000, "margin": 65.7, "trend": "up"},
        {"name": "Bar", "revenue": 8500, "direct_costs": 2550, "contribution": 5950, "margin": 70.0, "trend": "up"},
        {"name": "Dostava", "revenue": 5500, "direct_costs": 2200, "contribution": 3300, "margin": 60.0, "trend": "stable"},
        {"name": "Catering", "revenue": 3500, "direct_costs": 1400, "contribution": 2100, "margin": 60.0, "trend": "up"},
        {"name": "Darilni boni", "revenue": 1200, "direct_costs": 0, "contribution": 1200, "margin": 100.0, "trend": "stable"},
    ], "total_revenue": 53700, "total_contribution": 35550, "overall_margin": 66.2}

@router.get("/investment-tracker")
def get_investment_tracker(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"investments": [
        {"name": "Nova peč", "invested": 12000, "date": "2025-01-15", "monthly_savings": 350, "payback_months": 34, "status": "active", "roi_ytd": 17.5},
        {"name": "POS sistem", "invested": 8000, "date": "2024-06-01", "monthly_savings": 450, "payback_months": 18, "status": "completed", "roi_ytd": 67.5},
        {"name": "Terasa", "invested": 15000, "date": "2025-04-01", "monthly_savings": 1200, "payback_months": 12.5, "status": "active", "roi_ytd": 36.0},
        {"name": "Hladilni sistem", "invested": 6000, "date": "2025-03-01", "monthly_savings": 180, "payback_months": 33, "status": "active", "roi_ytd": 18.0},
    ], "total_invested": 41000, "total_monthly_savings": 2180, "avg_payback": 24.5}

@router.get("/cost-analysis")
def get_cost_analysis(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"analysis": {
        "fixed_costs": [
            {"item": "Najemnina", "amount": 2000, "percentage": 32.3},
            {"item": "Zavarovanje", "amount": 350, "percentage": 5.6},
            {"item": "Stroški", "amount": 240, "percentage": 3.9},
            {"item": "Internet", "amount": 45, "percentage": 0.7},
        ],
        "variable_costs": [
            {"item": "Hrana", "amount": 8500, "percentage": 38.5},
            {"item": "Delovna sila", "amount": 6200, "percentage": 28.1},
            {"item": "Oglaševanje", "amount": 1200, "percentage": 5.4},
        ],
        "total_fixed": 2635,
        "total_variable": 15900,
        "breakeven_revenue": 18500,
        "current_margin_above_breakeven": 52.4
    }}

@router.get("/debt-management")
def get_debt_management(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"debts": [
        {"name": "Posojilo za opremo", "original": 20000, "remaining": 12000, "monthly_payment": 500, "interest_rate": 4.5, "next_payment": "2025-08-01", "payoff_date": "2027-06-01"},
        {"name": "Kartica", "original": 5000, "remaining": 1500, "monthly_payment": 300, "interest_rate": 18.0, "next_payment": "2025-07-20", "payoff_date": "2025-12-01"},
    ], "total_remaining": 13500, "monthly_debt_service": 800, "debt_to_revenue_ratio": 15.2, "risk_level": "low"}
