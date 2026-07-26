from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.v1.auth import get_current_user

router = APIRouter(prefix="/reports-v7", tags=["reports-v7"])

@router.get("/executive-summary")
def get_executive_summary(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"summary": {
        "period": "Junij 2025",
        "total_revenue": 42000,
        "revenue_change": 8.5,
        "total_orders": 1850,
        "orders_change": 5.2,
        "avg_order_value": 22.70,
        "aov_change": 3.1,
        "food_cost_pct": 32.5,
        "labor_cost_pct": 28.0,
        "net_profit": 14000,
        "profit_margin": 33.3,
        "customer_count": 920,
        "customer_change": 12.0,
        "nps_score": 72,
        "top_item": "Margherita Pizza",
        "busiest_day": "Sobota",
        "busiest_hour": "19:00-20:00",
    }}

@router.get("/comparative")
def get_comparative(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"comparative": [
        {"metric": "Prihodki", "current": 42000, "previous": 38700, "yoy": 35000, "change_mom": 8.5, "change_yoy": 20.0},
        {"metric": "Naročila", "current": 1850, "previous": 1760, "yoy": 1520, "change_mom": 5.1, "change_yoy": 21.7},
        {"metric": "Povprečje", "current": 22.70, "previous": 22.00, "yoy": 23.03, "change_mom": 3.2, "change_yoy": -1.4},
        {"metric": "Marža", "current": 67.5, "previous": 65.2, "yoy": 62.8, "change_mom": 3.5, "change_yoy": 7.5},
        {"metric": "Stroški hrane", "current": 32.5, "previous": 34.8, "yoy": 37.2, "change_mom": -6.6, "change_yoy": -12.6},
    ]}

@router.get("/alerts")
def get_alerts(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"alerts": [
        {"severity": "high", "type": "finance", "message": "Stroški delovne sile presegajo budget za 3.3%", "action": "Pregledaj urnik"},
        {"severity": "medium", "type": "inventory", "message": "Mocarela zaloge pod minimumom", "action": "Naroči pri dobavitelju"},
        {"severity": "low", "type": "menu", "message": "Calamari prodaja padla za 15%", "action": "Razmisli o odstranitvi"},
        {"severity": "info", "type": "customer", "message": "18 strank v nevarnosti odhoda", "action": "Pošlji ponudbo"},
    ]}

@router.get("/benchmarks")
def get_benchmarks(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"benchmarks": [
        {"metric": "Food Cost %", "your": 32.5, "industry_avg": 35.0, "best_in_class": 28.0, "status": "good"},
        {"metric": "Labor Cost %", "your": 28.0, "industry_avg": 30.0, "best_in_class": 25.0, "status": "good"},
        {"metric": "Table Turnover", "your": 3.2, "industry_avg": 2.8, "best_in_class": 4.0, "status": "good"},
        {"metric": "Avg Check", "your": 22.70, "industry_avg": 20.00, "best_in_class": 30.00, "status": "above_avg"},
        {"metric": "Customer Retention", "your": 68.0, "industry_avg": 60.0, "best_in_class": 80.0, "status": "good"},
    ]}

@router.get("/forecast-report")
def get_forecast_report(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"forecast": {
        "next_month": {"predicted_revenue": 45000, "confidence": 85, "factors": ["poletna sezona", "povečano oglaševanje"]},
        "next_quarter": {"predicted_revenue": 125000, "confidence": 75, "factors": ["stabilna rast", "novi meni"]},
        "year_end": {"predicted_revenue": 520000, "confidence": 70, "factors": ["sezonskost", "trg"]},
        "scenarios": [
            {"name": "Optimističen", "revenue": 560000, "probability": 25},
            {"name": "Realističen", "revenue": 520000, "probability": 50},
            {"name": "Pesimističen", "revenue": 450000, "probability": 25},
        ]
    }}

@router.get("/kpi-dashboard")
def get_kpi_dashboard(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"kpis": [
        {"name": "Prihodki", "value": 42000, "target": 40000, "unit": "€", "status": "above"},
        {"name": "Naročila", "value": 1850, "target": 1800, "unit": "kos", "status": "above"},
        {"name": "Povprečje", "value": 22.70, "target": 22.00, "unit": "€", "status": "above"},
        {"name": "Stroški hrane", "value": 32.5, "target": 33.0, "unit": "%", "status": "below"},
        {"name": "Zadovoljstvo", "value": 72, "target": 70, "unit": "NPS", "status": "above"},
        {"name": "Obrat miz", "value": 3.2, "target": 3.0, "unit": "krat", "status": "above"},
    ]}

@router.get("/weekly-patterns")
def get_weekly_patterns(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"patterns": [
        {"day": "Ponedeljek", "orders": 180, "revenue": 3600, "avg_check": 20.00, "peak_hour": "12:00"},
        {"day": "Torek", "orders": 200, "revenue": 4200, "avg_check": 21.00, "peak_hour": "19:00"},
        {"day": "Sreda", "orders": 220, "revenue": 4840, "avg_check": 22.00, "peak_hour": "19:00"},
        {"day": "Četrtek", "orders": 250, "revenue": 5750, "avg_check": 23.00, "peak_hour": "20:00"},
        {"day": "Petek", "orders": 350, "revenue": 8750, "avg_check": 25.00, "peak_hour": "20:00"},
        {"day": "Sobota", "orders": 380, "revenue": 9500, "avg_check": 25.00, "peak_hour": "20:00"},
        {"day": "Nedelja", "orders": 270, "revenue": 6210, "avg_check": 23.00, "peak_hour": "13:00"},
    ]}

@router.get("/staff-performance-report")
def get_staff_report(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"staff": [
        {"name": "Ana K.", "role": "Natakar", "orders": 420, "revenue": 9870, "avg_check": 23.50, "tips": 580, "rating": 4.8},
        {"name": "Marko P.", "role": "Natakar", "orders": 380, "revenue": 8740, "avg_check": 23.00, "tips": 520, "rating": 4.6},
        {"name": "Luka Z.", "role": "Kuhar", "orders": 0, "revenue": 0, "prep_time": 8.5, "quality_score": 4.7, "rating": 4.9},
        {"name": "Sara M.", "role": "Natakar", "orders": 350, "revenue": 7700, "avg_check": 22.00, "tips": 450, "rating": 4.5},
    ]}
