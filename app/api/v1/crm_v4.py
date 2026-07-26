from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.v1.auth import get_current_user

router = APIRouter(prefix="/crm-v4", tags=["crm-v4"])

@router.get("/segments")
def get_segments(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"segments": [
        {"id": 1, "name": "VIP Stranke", "count": 45, "criteria": "Več kot 500€ porabe", "color": "#f59e0b"},
        {"id": 2, "name": "Redni Obiskovalci", "count": 120, "criteria": "2-krat mesečno", "color": "#10b981"},
        {"id": 3, "name": "Novi Stranki", "count": 35, "criteria": "Manj kot 30 dni", "color": "#3b82f6"},
        {"id": 4, "name": "Tvegani Odhod", "count": 18, "criteria": "Ni obiska 60+ dni", "color": "#ef4444"},
        {"id": 5, "name": "Sezonski", "count": 62, "criteria": "Le poleti", "color": "#8b5cf6"},
    ]}

@router.get("/funnel")
def get_funnel(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"funnel": [
        {"stage": "Obisk", "count": 500, "conversion": 100},
        {"stage": "Prvo naročilo", "count": 380, "conversion": 76},
        {"stage": "Drugo naročilo", "count": 220, "conversion": 44},
        {"stage": "Redna stranka", "count": 120, "conversion": 24},
        {"stage": "Ambasador", "count": 35, "conversion": 7},
    ]}

@router.get("/lifetime-value")
def get_lifetime_value(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"ltv": [
        {"segment": "VIP", "avg_ltv": 1250, "count": 45, "trend": "up"},
        {"segment": "Redni", "avg_ltv": 480, "count": 120, "trend": "stable"},
        {"segment": "Novi", "avg_ltv": 85, "count": 35, "trend": "up"},
        {"segment": "Tvegani", "avg_ltv": 320, "count": 18, "trend": "down"},
    ], "total_ltv": 142500, "avg_monthly": 23750}

@router.get("/churn-analysis")
def get_churn_analysis(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"churn": [
        {"month": "Jan", "churned": 5, "retained": 115},
        {"month": "Feb", "churned": 8, "retained": 112},
        {"month": "Mar", "churned": 3, "retained": 117},
        {"month": "Apr", "month": "Apr", "churned": 6, "retained": 114},
        {"month": "Maj", "churned": 4, "retained": 116},
        {"month": "Jun", "churned": 7, "retained": 113},
    ], "churn_rate": 4.8, "risk_customers": 18}

@router.get("/engagement")
def get_engagement(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"engagement": {
        "email_open_rate": 42.5,
        "sms_response_rate": 68.2,
        "loyalty_participation": 72.0,
        "avg_visits_per_month": 2.8,
        "avg_spend_per_visit": 32.50,
        "nps_score": 72,
        "satisfaction_trend": "up",
    }}

@router.get("/campaigns")
def get_campaigns(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"campaigns": [
        {"id": 1, "name": "Poletna ponudba", "type": "email", "sent": 450, "opened": 189, "clicked": 67, "conversion": 15, "status": "active"},
        {"id": 2, "name": "Rojstni dan popust", "type": "sms", "sent": 120, "opened": 95, "clicked": 42, "conversion": 35, "status": "active"},
        {"id": 3, "name": "VIP povabilo", "type": "email", "sent": 45, "opened": 38, "clicked": 22, "conversion": 49, "status": "completed"},
        {"id": 4, "name": "Povratni obisk", "type": "sms", "sent": 80, "opened": 62, "clicked": 28, "conversion": 25, "status": "scheduled"},
    ]}

@router.get("/journey-mapping")
def get_journey_mapping(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"journeys": [
        {"id": 1, "name": "Novi obiskovalec", "touchpoints": 5, "conversion": 65, "avg_days": 14},
        {"id": 2, "name": "Redna stranka", "touchpoints": 3, "conversion": 82, "avg_days": 7},
        {"id": 3, "name": "VIP pot", "touchpoints": 4, "conversion": 91, "avg_days": 30},
    ]}

@router.get("/contact-timeline")
def get_contact_timeline(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"timeline": [
        {"date": "2025-01-15", "type": "visit", "amount": 45.50, "items": 3},
        {"date": "2025-01-28", "type": "email", "subject": "Hvala za obisk"},
        {"date": "2025-02-10", "type": "visit", "amount": 32.00, "items": 2},
        {"date": "2025-02-20", "type": "sms", "subject": "Posebna ponudba"},
        {"date": "2025-03-05", "type": "visit", "amount": 68.50, "items": 5},
        {"date": "2025-03-15", "type": "review", "rating": 5, "comment": "Odlično!"},
    ]}
