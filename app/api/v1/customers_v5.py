from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.v1.auth import get_current_user

router = APIRouter(prefix="/customers-v5", tags=["customers-v5"])

@router.get("/customer-journey")
def get_customer_journey(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"journeys": [
        {"customer_id": 1, "name": "Marko Novak", "stages": [
            {"stage": "Odkritje", "date": "2025-01-15", "channel": "Instagram", "action": "Sledil profilu"},
            {"stage": "Obisk", "date": "2025-01-22", "channel": "Osebno", "action": "Prvi obisk", "spent": 28.00},
            {"stage": "Ponovitev", "date": "2025-02-05", "channel": "Email", "action": "Drugi obisk", "spent": 35.00},
            {"stage": "Zvestoba", "date": "2025-03-10", "channel": "Program zvestobe", "action": "VPIS v program", "spent": 42.00},
            {"stage": "Ambasador", "date": "2025-06-15", "channel": "Napoti prijatelja", "action": "3 napotitve", "spent": 55.00},
        ], "current_stage": "Ambasador", "lifetime_value": 1850.00, "visit_count": 28},
        {"customer_id": 2, "name": "Ana Horvat", "stages": [
            {"stage": "Odkritje", "date": "2025-04-10", "channel": "Facebook", "action": "Klik na oglas"},
            {"stage": "Obisk", "date": "2025-04-15", "channel": "Splet", "action": "Rezervacija online", "spent": 45.00},
            {"stage": "Ponovitev", "date": "2025-05-01", "channel": "SMS", "action": "Drugi obisk", "spent": 38.00},
        ], "current_stage": "Ponovitev", "lifetime_value": 380.00, "visit_count": 5},
    ]}

@router.get("/customer-lifetime-value")
def get_customer_lifetime_value(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"clv": {
        "segments": [
            {"segment": "Platina", "count": 25, "avg_clv": 4500, "avg_monthly": 180, "retention": 95, "acquisition_cost": 45},
            {"segment": "Zlata", "count": 65, "avg_clv": 2800, "avg_monthly": 115, "retention": 85, "acquisition_cost": 35},
            {"segment": "Srebrna", "count": 120, "avg_clv": 1200, "avg_monthly": 50, "retention": 70, "acquisition_cost": 25},
            {"segment": "Bronasta", "count": 180, "avg_clv": 400, "avg_monthly": 17, "retention": 45, "acquisition_cost": 15},
        ],
        "total_clv": 285000,
        "avg_clv": 815,
        "clv_trend": [
            {"month": "Jan", "avg": 780},
            {"month": "Feb", "avg": 795},
            {"month": "Mar", "avg": 810},
            {"month": "Apr", "avg": 805},
            {"month": "Maj", "avg": 812},
            {"month": "Jun", "avg": 815},
        ]
    }}

@router.get("/sentiment-analysis")
def get_sentiment_analysis(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"sentiment": {
        "overall_score": 4.3,
        "distribution": [
            {"rating": 5, "count": 180, "percentage": 45},
            {"rating": 4, "count": 120, "percentage": 30},
            {"rating": 3, "count": 60, "percentage": 15},
            {"rating": 2, "count": 28, "percentage": 7},
            {"rating": 1, "count": 12, "percentage": 3},
        ],
        "topics": [
            {"topic": "Hrana", "positive": 78, "negative": 12, "neutral": 10, "trend": "up"},
            {"topic": "Postrežba", "positive": 65, "negative": 20, "neutral": 15, "trend": "stable"},
            {"topic": "Ambient", "positive": 72, "negative": 8, "neutral": 20, "trend": "up"},
            {"topic": "Cena", "positive": 45, "negative": 35, "neutral": 20, "trend": "down"},
            {"topic": "Čas čakanja", "positive": 38, "negative": 42, "neutral": 20, "trend": "down"},
        ],
        "recent_reviews": [
            {"date": "2025-07-14", "rating": 5, "text": "Odlična hrana in postrežba!", "source": "Google"},
            {"date": "2025-07-13", "rating": 4, "text": "Dober meni, malo daljše čakanje", "source": "TripAdvisor"},
            {"date": "2025-07-12", "rating": 3, "text": "Hrana ok, postrežba počasna", "source": "Facebook"},
        ]
    }}

@router.get("/churn-prediction")
def get_churn_prediction(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"churn": {
        "at_risk": [
            {"customer_id": 15, "name": "Janez Potrbin", "last_visit": "2025-05-20", "churn_probability": 0.85, "predicted_churn": "2025-08-01", "value": 450.00, "intervention": "Personaliziran email z 20% popustom"},
            {"customer_id": 22, "name": "Maja Zidar", "last_visit": "2025-06-01", "churn_probability": 0.72, "predicted_churn": "2025-08-15", "value": 320.00, "intervention": "SMS z brezplačnim desertom"},
            {"customer_id": 31, "name": "Tomaž Rekar", "last_visit": "2025-06-10", "churn_probability": 0.65, "predicted_churn": "2025-09-01", "value": 280.00, "intervention": "Osebni klic vodje"},
        ],
        "total_at_risk": 15,
        "total_value_at_risk": 4800.00,
        "prevention_success_rate": 42,
        "churn_rate_trend": [
            {"month": "Jan", "rate": 8.5},
            {"month": "Feb", "rate": 7.8},
            {"month": "Mar", "rate": 7.2},
            {"month": "Apr", "rate": 8.0},
            {"month": "Maj", "rate": 7.5},
            {"month": "Jun", "rate": 7.0},
        ]
    }}

@router.get("/customer-preferences")
def get_customer_preferences(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"preferences": {
        "dietary": [
            {"type": "Vegetarijansko", "count": 45, "percentage": 11.3},
            {"type": "Vegansko", "count": 18, "percentage": 4.5},
            {"type": "Brez glutena", "count": 32, "percentage": 8.0},
            {"type": "Brez laktoze", "count": 15, "percentage": 3.8},
            {"type": "Halal", "count": 8, "percentage": 2.0},
        ],
        "favorite_items": [
            {"item": "Pizza Margherita", "orders": 285, "percentage": 18.5},
            {"item": "Caesar Salad", "orders": 195, "percentage": 12.6},
            {"item": "Grilled Salmon", "orders": 142, "percentage": 9.2},
            {"item": "Tiramisu", "orders": 168, "percentage": 10.9},
            {"item": "Pepperoni Pizza", "orders": 155, "percentage": 10.0},
        ],
        "ordering_times": {"peak_lunch": "12:00-13:30", "peak_dinner": "19:00-20:30", "quiet_hours": "15:00-17:00"},
        "preferred_communication": [
            {"channel": "Email", "percentage": 45, "open_rate": 42},
            {"channel": "SMS", "percentage": 25, "open_rate": 85},
            {"channel": "App", "percentage": 20, "open_rate": 65},
            {"channel": "Telefon", "percentage": 10, "open_rate": 100},
        ]
    }}

@router.get("/customer-segments-advanced")
def get_customer_segments_advanced(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"segments": [
        {"name": "VIP", "count": 25, "criteria": ["Obiski > 20/mesec", "Povprečje > €50", "CLV > €3000"], "avg_spend": 65.00, "visit_freq": 4.5, "retention": 95, "channels": ["email", "sms", "instagram", "telefon"]},
        {"name": "Redni", "count": 85, "criteria": ["Obiski 5-20/mesec", "Povprečje €25-50", "CLV €1000-3000"], "avg_spend": 35.00, "visit_freq": 2.8, "retention": 82, "channels": ["email", "sms"]},
        {"name": "Priložnostni", "count": 150, "criteria": ["Obiski 1-5/mesec", "Povprečje €20-35", "CLV €500-1000"], "avg_spend": 28.00, "visit_freq": 1.2, "retention": 55, "channels": ["email"]},
        {"name": "Novi", "count": 65, "criteria": ["Prvi obisk v 30 dneh", "Povprečje < €25"], "avg_spend": 22.00, "visit_freq": 1.0, "retention": 35, "channels": ["email"]},
        {"name": "Tvegani", "count": 35, "criteria": ["Ni obiska 60+ dni", "Zadnji obisk < €20"], "avg_spend": 18.00, "visit_freq": 0.3, "retention": 20, "channels": ["sms"]},
    ]}
