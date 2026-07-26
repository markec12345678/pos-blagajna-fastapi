from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.v1.auth import get_current_user

router = APIRouter(prefix="/analytics-v5", tags=["analytics-v5"])

@router.get("/real-time")
def get_real_time(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"realtime": {
        "current_orders": 12,
        "active_tables": 8,
        "revenue_today": 3850,
        "avg_wait_time": 8,
        "kitchen_queue": 5,
        "staff_on_duty": 8,
        "weather": "Sončno, 24°C",
        "hourly_revenue": [
            {"hour": "10:00", "revenue": 120},
            {"hour": "11:00", "revenue": 280},
            {"hour": "12:00", "revenue": 650},
            {"hour": "13:00", "revenue": 520},
            {"hour": "14:00", "revenue": 350},
            {"hour": "15:00", "revenue": 180},
            {"hour": "16:00", "revenue": 220},
            {"hour": "17:00", "revenue": 380},
            {"hour": "18:00", "revenue": 580},
            {"hour": "19:00", "revenue": 620},
        ]
    }}

@router.get("/customer-insights")
def get_customer_insights(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"insights": {
        "new_vs_returning": {"new": 35, "returning": 65},
        "avg_party_size": 2.8,
        "avg_stay_duration": 72,
        "peak_arrival": "19:30",
        "peak_departure": "21:00",
        "satisfaction_by_hour": [
            {"hour": "12:00", "satisfaction": 4.5},
            {"hour": "13:00", "satisfaction": 4.3},
            {"hour": "19:00", "satisfaction": 4.7},
            {"hour": "20:00", "satisfaction": 4.6},
            {"hour": "21:00", "satisfaction": 4.4},
        ],
        "top_complaints": [
            {"issue": "Čakalni čas", "count": 8, "percentage": 32},
            {"issue": "Hrana", "count": 5, "percentage": 20},
            {"issue": "Postrežba", "count": 4, "percentage": 16},
        ]
    }}

@router.get("/revenue-decomposition")
def get_revenue_decomposition(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"decomposition": {
        "total": 42000,
        "by_source": [
            {"source": "Restavracija", "amount": 28000, "percentage": 66.7},
            {"source": "Dostava", "amount": 8500, "percentage": 20.2},
            {"source": "Catering", "amount": 3500, "percentage": 8.3},
            {"source": "Spletna naročila", "amount": 2000, "percentage": 4.8},
        ],
        "by_daypart": [
            {"daypart": "Jutro", "amount": 3500, "percentage": 8.3},
            {"daypart": "Kosilo", "amount": 14000, "percentage": 33.3},
            {"daypart": "Popoldne", "amount": 5500, "percentage": 13.1},
            {"daypart": "Večer", "amount": 19000, "percentage": 45.2},
        ],
        "by_category": [
            {"category": "Hrana", "amount": 25200, "percentage": 60.0},
            {"category": "Pijača", "amount": 10500, "percentage": 25.0},
            {"category": "Sladice", "amount": 4200, "percentage": 10.0},
            {"category": "Družno", "amount": 2100, "percentage": 5.0},
        ]
    }}

@router.get("/trend-analysis")
def get_trend_analysis(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"trends": {
        "revenue_trend": "up",
        "revenue_slope": 2.5,
        "seasonality": {"peak_months": ["Jun", "Jul", "Avg"], "low_months": ["Nov", "Dec", "Jan"]},
        "growth_rate": 8.5,
        "projections": [
            {"month": "Jul", "actual": None, "projected": 45000, "confidence": 85},
            {"month": "Avg", "actual": None, "projected": 47000, "confidence": 80},
            {"month": "Sep", "actual": None, "projected": 40000, "confidence": 75},
        ],
        "yoy_comparison": {"2024": 206000, "2025_ytd": 222000, "growth": 7.8}
    }}

@router.get("/anomaly-detection")
def get_anomaly_detection(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"anomalies": [
        {"date": "2025-06-15", "type": "revenue_spike", "value": 5200, "expected": 3800, "deviation": "+37%", "cause": "Lokalni festival"},
        {"date": "2025-06-22", "type": "low_orders", "value": 120, "expected": 200, "deviation": "-40%", "cause": "Deževno vreme"},
        {"date": "2025-06-28", "type": "high_waste", "value": 350, "expected": 180, "deviation": "+94%", "cause": "Napačna napoved"},
    ], "anomaly_score": 78}

@router.get("/cohort-analysis")
def get_cohort_analysis(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"cohorts": [
        {"cohort": "Jan 2025", "size": 45, "retention": [100, 78, 65, 58, 52, 48]},
        {"cohort": "Feb 2025", "size": 38, "retention": [100, 82, 70, 62, 55]},
        {"cohort": "Mar 2025", "size": 52, "retention": [100, 85, 72, 65]},
        {"cohort": "Apr 2025", "size": 42, "retention": [100, 80, 68]},
        {"cohort": "Maj 2025", "size": 55, "retention": [100, 88]},
        {"cohort": "Jun 2025", "size": 60, "retention": [100]},
    ], "avg_retention_m6": 48.0}

@router.get("/menu-performance")
def get_menu_performance(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"performance": {
        "total_items": 14,
        "avg_margin": 65.8,
        "top_performers": [
            {"item": "Margherita", "orders": 500, "revenue": 4250, "margin": 70.0, "trend": "up"},
            {"item": "Pepperoni", "orders": 480, "revenue": 5040, "margin": 65.0, "trend": "stable"},
            {"item": "Caesar Salad", "orders": 350, "revenue": 2625, "margin": 70.0, "trend": "up"},
        ],
        "underperformers": [
            {"item": "Calamari", "orders": 80, "revenue": 480, "margin": 55.0, "trend": "down"},
            {"item": "Panna Cotta", "orders": 90, "revenue": 450, "margin": 65.0, "trend": "down"},
        ],
        "combo_performance": [
            {"combo": "Pizza + Pijača", "orders": 320, "revenue": 3520, "avg_rating": 4.6},
            {"combo": "Solata + Losos", "orders": 180, "revenue": 3780, "avg_rating": 4.7},
        ]
    }}

@router.get("/predictive-models")
def get_predictive_models(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"models": [
        {"name": "Napoved naročil", "accuracy": 87, "last_trained": "2025-06-30", "next_update": "2025-07-07", "features": ["dan_v_tednu", "vreme", "dogodki", "zgodovina"]},
        {"name": "Odhod strank", "accuracy": 82, "last_trained": "2025-06-28", "next_update": "2025-07-05", "features": ["pogostost_obiskov", "zadnji_obisk", "poraba", "ocene"]},
        {"name": "Optimalni meni", "accuracy": 75, "last_trained": "2025-06-25", "next_update": "2025-07-02", "features": ["prodaja", "marža", "sezone", "mnenja"]},
    ], "model_health": "zdravo"}
