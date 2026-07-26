from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.v1.auth import get_current_user

router = APIRouter(prefix="/expenses-v3", tags=["expenses-v3"])

@router.get("/recurring")
def get_recurring(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"recurring": [
        {"id": 1, "name": "Najemnina", "amount": 2000, "frequency": "monthly", "category": "Nepremičnine", "next_payment": "2025-08-01", "auto_pay": True},
        {"id": 2, "name": "Zavarovanje", "amount": 350, "frequency": "monthly", "category": "Zavarovanje", "next_payment": "2025-08-01", "auto_pay": True},
        {"id": 3, "name": "Internet", "amount": 45, "frequency": "monthly", "category": "Stroški", "next_payment": "2025-08-01", "auto_pay": True},
        {"id": 4, "name": "GAS svetloba", "amount": 180, "frequency": "monthly", "category": "Stroški", "next_payment": "2025-08-01", "auto_pay": False},
        {"id": 5, "name": "Čiščenje", "amount": 280, "frequency": "weekly", "category": "Storitve", "next_payment": "2025-07-14", "auto_pay": False},
    ], "total_monthly": 3135, "auto_pay_count": 3}

@router.get("/budget-tracking")
def get_budget_tracking(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"tracking": [
        {"category": "Hrana in pijača", "budget": 8200, "actual": 8500, "remaining": -300, "percentage": 103.7, "status": "over"},
        {"category": "Delovna sila", "budget": 6000, "actual": 6200, "remaining": -200, "percentage": 103.3, "status": "over"},
        {"category": "Najemnina", "budget": 2000, "actual": 2000, "remaining": 0, "percentage": 100.0, "status": "on_track"},
        {"category": "Oprema", "budget": 1800, "actual": 1500, "remaining": 300, "percentage": 83.3, "status": "under"},
        {"category": "Oglaševanje", "budget": 1000, "actual": 1200, "remaining": -200, "percentage": 120.0, "status": "over"},
        {"category": "Stroški", "budget": 2400, "actual": 2500, "remaining": -100, "percentage": 104.2, "status": "over"},
    ], "total_budget": 21400, "total_actual": 21900, "total_remaining": -500}

@router.get("/expense-trends")
def get_expense_trends(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"trends": [
        {"month": "Jan", "total": 19500, "food": 7800, "labor": 5800, "rent": 2000, "other": 3900},
        {"month": "Feb", "total": 18800, "food": 7500, "labor": 5600, "rent": 2000, "other": 3700},
        {"month": "Mar", "total": 20200, "food": 8100, "labor": 5900, "rent": 2000, "other": 4200},
        {"month": "Apr", "total": 19800, "food": 7900, "labor": 5800, "rent": 2000, "other": 4100},
        {"month": "Maj", "total": 21000, "food": 8400, "labor": 6100, "rent": 2000, "other": 4500},
        {"month": "Jun", "total": 21900, "food": 8500, "labor": 6200, "rent": 2000, "other": 5200},
    ], "avg_monthly": 20200, "yoy_change": 12.3}

@router.get("/cost-per-meal")
def get_cost_per_meal(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"meals": [
        {"meal": "Margherita", "food_cost": 2.55, "labor_cost": 1.20, "packaging": 0.30, "total": 4.05, "price": 8.50, "margin": 52.4},
        {"meal": "Pepperoni", "food_cost": 3.25, "labor_cost": 1.30, "packaging": 0.30, "total": 4.85, "price": 10.50, "margin": 53.8},
        {"meal": "Caesar Salad", "food_cost": 2.10, "labor_cost": 0.80, "packaging": 0.20, "total": 3.10, "price": 7.50, "margin": 58.7},
        {"meal": "Grilled Salmon", "food_cost": 5.80, "labor_cost": 2.00, "packaging": 0.40, "total": 8.20, "price": 15.50, "margin": 47.1},
        {"meal": "Steak", "food_cost": 6.20, "labor_cost": 2.50, "packaging": 0.40, "total": 9.10, "price": 18.00, "margin": 49.4},
        {"meal": "Tiramisu", "food_cost": 1.48, "labor_cost": 0.60, "packaging": 0.20, "total": 2.28, "price": 5.50, "margin": 58.5},
    ], "avg_margin": 53.3}

@router.get("/payment-methods")
def get_payment_methods(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"methods": [
        {"method": "Gotovina", "transactions": 320, "amount": 8500, "percentage": 20.2, "avg_ticket": 26.56},
        {"method": "Kartica", "transactions": 980, "amount": 24500, "percentage": 58.3, "avg_ticket": 25.00},
        {"method": "Mobilno", "transactions": 350, "amount": 7000, "percentage": 16.7, "avg_ticket": 20.00},
        {"method": "Darilni bon", "transactions": 45, "amount": 1125, "percentage": 2.7, "avg_ticket": 25.00},
        {"method": "H račun", "transactions": 25, "amount": 875, "percentage": 2.1, "avg_ticket": 35.00},
    ], "total_transactions": 1720, "total_amount": 42000}

@router.get("/deductions")
def get_deductions(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"deductions": [
        {"category": "Poslovni stroški", "amount": 5200, "deductible": True, "documentation": "Računi"},
        {"category": "Doprinosi", "amount": 4800, "deductible": True, "documentation": "Pobotnice"},
        {"category": "Amortizacija", "amount": 2400, "deductible": True, "documentation": "Osnovna sredstva"},
        {"category": "Potni stroški", "amount": 800, "deductible": True, "documentation": "Potni nalogi"},
        {"category": "Izobraževanje", "amount": 600, "deductible": True, "documentation": "Potrdila"},
    ], "total_deductions": 13800, "tax_savings": 2760}

@router.get("/invoice-status")
def get_invoice_status(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"invoices": [
        {"id": "INV-2025-0601", "vendor": "Kmetija Kranjc", "amount": 3200, "due": "2025-07-15", "status": "pending", "days_until_due": 15},
        {"id": "INV-2025-0602", "vendor": "Meso Žabar", "amount": 2800, "due": "2025-07-10", "status": "overdue", "days_overdue": 5},
        {"id": "INV-2025-0603", "vendor": "Pečarna Hleb", "amount": 800, "due": "2025-07-20", "status": "pending", "days_until_due": 20},
        {"id": "INV-2025-0604", "vendor": "GAS", "amount": 180, "due": "2025-07-25", "status": "scheduled", "auto_pay": True},
    ], "total_pending": 6800, "overdue": 2800, "upcoming": 980}
