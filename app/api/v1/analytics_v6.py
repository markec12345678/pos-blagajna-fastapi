from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.v1.auth import get_current_user

router = APIRouter(prefix="/analytics-v6", tags=["analytics-v6"])

@router.get("/realtime-dashboard")
def get_realtime_dashboard(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"realtime": {
        "current_hour_orders": 12,
        "current_hour_revenue": 385,
        "active_tables": 8,
        "kitchen_queue": 5,
        "avg_wait_time": 14.2,
        "staff_on_duty": 7,
        "live_feed": [
            {"time": "19:45", "event": "Naročilo #1042 - T5 - 3 artikli"},
            {"time": "19:42", "event": "Plačilo #1038 - T12 - 42.50"},
            {"time": "19:38", "event": "Rezervacija - T8 - 6 oseb - 20:00"},
            {"time": "19:35", "event": "KDS: Pizza Margherita pripravljena"},
            {"time": "19:30", "event": "Naročilo #1041 - T3 - 5 artiklov"},
        ],
        "hourly_trend": [
            {"hour": "17:00", "orders": 3, "revenue": 95},
            {"hour": "18:00", "orders": 8, "revenue": 245},
            {"hour": "19:00", "orders": 15, "revenue": 520},
            {"hour": "20:00", "orders": 12, "revenue": 385},
        ]
    }}

@router.get("/customer-behavior")
def get_customer_behavior(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"behavior": {
        "paths": [
            {"path": "POS -> Menu -> Rezervacija", "count": 120, "conversion": 45, "avg_time": 3.2},
            {"path": "Spletna stran -> Meni -> Klic", "count": 85, "conversion": 28, "avg_time": 5.1},
            {"path": "Instagram -> Spletna stran -> Rezervacija", "count": 65, "conversion": 18, "avg_time": 4.5},
        ],
        "peak_times": {"lunch": "12:00-13:30", "dinner": "19:00-20:30", "quiet": "15:00-17:00"},
        "device_split": {"mobile": 62, "desktop": 28, "tablet": 10},
        "bounce_rate": 35.2,
        "avg_session_duration": 4.8,
        "pages_per_session": 3.2
    }}

@router.get("/revenue-analytics")
def get_revenue_analytics(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"revenue": {
        "today": {"total": 2850, "dine_in": 1920, "takeaway": 580, "delivery": 350},
        "weekly_trend": [
            {"day": "Pon", "total": 2800, "dine_in": 1850, "takeaway": 600, "delivery": 350},
            {"day": "Tor", "total": 3200, "dine_in": 2100, "takeaway": 700, "delivery": 400},
            {"day": "Sre", "total": 3500, "dine_in": 2300, "takeaway": 750, "delivery": 450},
            {"day": "Čet", "total": 3800, "dine_in": 2500, "takeaway": 800, "delivery": 500},
            {"day": "Pet", "total": 5200, "dine_in": 3400, "takeaway": 1100, "delivery": 700},
            {"day": "Sob", "total": 6500, "dine_in": 4200, "takeaway": 1400, "delivery": 900},
            {"day": "Ned", "total": 4800, "dine_in": 3200, "takeaway": 1000, "delivery": 600},
        ],
        "yoy_growth": 12.5,
        "best_day": "Sobota",
        "avg_daily": 4257
    }}

@router.get("/menu-analytics-deep")
def get_menu_analytics_deep(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"menu": {
        "top_items": [
            {"item": "Pizza Margherita", "orders": 285, "revenue": 2422, "margin": 61.8, "trend": "stable"},
            {"item": "Caesar Salad", "orders": 195, "revenue": 1462, "margin": 70.0, "trend": "up"},
            {"item": "Grilled Salmon", "orders": 142, "revenue": 2201, "margin": 68.4, "trend": "up"},
            {"item": "Tiramisu", "orders": 168, "revenue": 924, "margin": 75.0, "trend": "stable"},
            {"item": "Pepperoni Pizza", "orders": 155, "revenue": 1627, "margin": 63.4, "trend": "down"},
        ],
        "combo_analysis": [
            {"combo": "Pizza + Solata + Pijača", "frequency": 45, "avg_ticket": 18.50, "incremental_revenue": 1200},
            {"combo": "Predjed + Glavna + Sladica", "frequency": 32, "avg_ticket": 28.00, "incremental_revenue": 1680},
        ],
        "price_sensitivity": {"elasticity": -1.2, "optimal_increase": 3.5, "projected_impact": "+2.8% revenue"}
    }}

@router.get("/customer-segments-deep")
def get_customer_segments_deep(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"segments": [
        {"name": "Foodies", "count": 85, "avg_spend": 42.00, "visit_freq": 3.2, "preferred_items": ["Grilled Salmon", "Tiramisu"], "channels": ["Instagram", "TripAdvisor"], "value": "Visoka"},
        {"name": "Business", "count": 45, "avg_spend": 55.00, "visit_freq": 2.5, "preferred_items": ["Steak", "Vino"], "channels": ["Email", "Telefon"], "value": "Zelo visoka"},
        {"name": "Families", "count": 65, "avg_spend": 38.00, "visit_freq": 1.8, "preferred_items": ["Pizza", "Testenine"], "channels": ["Facebook", "SMS"], "value": "Srednja"},
        {"name": "Young Adults", "count": 120, "avg_spend": 22.00, "visit_freq": 2.8, "preferred_items": ["Burgers", "Cocktaili"], "channels": ["TikTok", "Instagram"], "value": "Srednja"},
        {"name": "Seniors", "count": 35, "avg_spend": 28.00, "visit_freq": 1.2, "preferred_items": ["Solata", "Juha"], "channels": ["Telefon", "Email"], "value": "Nizka"},
    ]}

@router.get("/predictive-insights")
def get_predictive_insights(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"insights": [
        {"type": "Demand", "insight": "Prihodnji petek: pričakovano 85 naročil (15% nad povprečjem)", "confidence": 0.88, "action": "Povečati zaloge lososa in testa"},
        {"type": "Churn", "insight": "15 strank ima >70% verjetnost odhoda", "confidence": 0.82, "action": "Poslati personalizirano ponudbo"},
        {"type": "Menu", "insight": "Caesar Salad narašča - priporočamo promocijo", "confidence": 0.90, "action": "Dodati na posebno ponudbo"},
        {"type": "Revenue", "insight": "Nedeljski brunch ima 40% višjo maržo", "confidence": 0.85, "action": "Razširiti brunch ponudbo"},
        {"type": "Inventory", "insight": "Olive bodo zmanjkale čez 3 dni", "confidence": 0.95, "action": "Naročiti takoj"},
    ], "next_review": "2025-07-16"}
