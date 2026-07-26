from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.v1.auth import get_current_user

router = APIRouter(prefix="/crm-v5", tags=["crm-v5"])

@router.get("/lead-scoring")
def get_lead_scoring(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"leads": [
        {"id": 1, "name": "Hotel Park", "type": "B2B", "score": 92, "value": 15000, "stage": "Pogajanja", "last_contact": "2025-07-12", "probability": 85, "owner": "Luka Z.", "activities": [
            {"date": "2025-07-10", "action": "Predstavitev menija", "result": "Pozitivno"},
            {"date": "2025-07-12", "action": "Ponudba", "result": "V razmisleku"},
        ]},
        {"id": 2, "name": "Restavracija Grad", "type": "Partner", "score": 78, "value": 8000, "stage": "Kvalifikacija", "last_contact": "2025-07-08", "probability": 60, "owner": "Ana K.", "activities": [
            {"date": "2025-07-08", "action": "Prvi stik", "result": "Zainteresirani"},
        ]},
        {"id": 3, "name": "Lokalni festival", "type": "Dogodek", "score": 65, "value": 5000, "stage": "Odkritje", "last_contact": "2025-07-05", "probability": 40, "owner": "Luka Z.", "activities": [
            {"date": "2025-07-05", "action": "Povabilo", "result": "Prejeti"},
        ]},
    ], "pipeline_value": 28000, "avg_deal_size": 9333}

@router.get("/campaign-performance")
def get_campaign_performance(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"campaigns": [
        {"id": 1, "name": "Poletni meni 2025", "type": "Email", "sent": 2200, "opened": 880, "clicked": 176, "converted": 45, "revenue": 3600, "cost": 200, "roi": 1700, "status": "active"},
        {"id": 2, "name": "VIP povabilo", "type": "Osebno", "sent": 45, "opened": 45, "clicked": 0, "converted": 35, "revenue": 5250, "cost": 300, "roi": 1650, "status": "completed"},
        {"id": 3, "name": "Nedeljski brunch", "type": "SMS", "sent": 800, "opened": 680, "clicked": 136, "converted": 28, "revenue": 1960, "cost": 40, "roi": 4800, "status": "active"},
        {"id": 4, "name": "Rojstnodnevni pozdrav", "type": "Automated", "sent": 120, "opened": 96, "clicked": 48, "converted": 42, "revenue": 2100, "cost": 0, "roi": null, "status": "automated"},
    ], "total_revenue": 12910, "total_cost": 540}

@router.get("/customer-tags")
def get_customer_tags(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"tags": [
        {"tag": "VIP", "count": 25, "color": "#8b5cf6", "auto_applied": True, "criteria": "CLV > €3000"},
        {"tag": "Redni", "count": 85, "color": "#10b981", "auto_applied": True, "criteria": "Obiski > 5/mesec"},
        {"tag": "Gastrolover", "count": 42, "color": "#f59e0b", "auto_applied": False, "criteria": "Naročilo degustacije"},
        {"tag": "Poslovni", "count": 18, "color": "#3b82f6", "auto_applied": True, "criteria": "H račun"},
        {"tag": "Praznovanje", "count": 35, "color": "#ec4899", "auto_applied": False, "criteria": "Rezervacija za praznovanje"},
        {"tag": "Alergija", "count": 32, "color": "#ef4444", "auto_applied": True, "criteria": "Shranjeni alergeni"},
    ], "total_customers_with_tags": 237}

@router.get("/interaction-timeline")
def get_interaction_timeline(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"timeline": [
        {"customer_id": 1, "customer": "Marko Novak", "interactions": [
            {"date": "2025-07-14", "type": "Obisk", "channel": "Osebno", "summary": "Večerja za 4, naročil lososa in steak", "value": 85, "sentiment": "positive"},
            {"date": "2025-07-10", "type": "Email", "channel": "Email", "summary": "Odpert newsletter, klik na poletni meni", "value": 0, "sentiment": "neutral"},
            {"date": "2025-07-05", "type": "Obisk", "channel": "Osebno", "summary": "Kosilo za 2, naročil pizzi", "value": 32, "sentiment": "positive"},
            {"date": "2025-06-28", "type": "Napotitev", "channel": "App", "summary": "Napotil 2 prijatelja", "value": 0, "sentiment": "positive"},
        ], "total_interactions": 28, "total_value": 1850},
        {"customer_id": 2, "customer": "Ana Horvat", "interactions": [
            {"date": "2025-07-12", "type": "Klic", "channel": "Telefon", "summary": "Rezervacija za rojstni dan", "value": 0, "sentiment": "positive"},
            {"date": "2025-07-08", "type": "Obisk", "channel": "Osebno", "summary": "Večerja za 6, praznovanje", "value": 165, "sentiment": "positive"},
        ], "total_interactions": 8, "total_value": 380},
    ]}

@router.get("/sales-pipeline")
def get_sales_pipeline(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"pipeline": [
        {"stage": "Odkritje", "count": 12, "value": 35000, "avg_days": 5, "conversion": 65},
        {"stage": "Kvalifikacija", "count": 8, "value": 25000, "avg_days": 10, "conversion": 55},
        {"stage": "Ponudba", "count": 5, "value": 18000, "avg_days": 7, "conversion": 70},
        {"stage": "Pogajanja", "count": 3, "value": 12000, "avg_days": 12, "conversion": 80},
        {"stage": "Zaključek", "count": 2, "value": 8000, "avg_days": 3, "conversion": 100},
    ], "total_pipeline": 98000, "weighted_pipeline": 52000, "win_rate": 35}

@router.get("/customer-health")
def get_customer_health(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"health": [
        {"customer_id": 1, "name": "Marko Novak", "health_score": 92, "factors": {"visit_frequency": 95, "spend_trend": 88, "engagement": 95, "recency": 90}, "status": "excellent", "next_action": "Nagraditi zvestobo"},
        {"customer_id": 2, "name": "Ana Horvat", "health_score": 78, "factors": {"visit_frequency": 70, "spend_trend": 82, "engagement": 80, "recency": 80}, "status": "good", "next_action": "Pošlji personalizirano ponudbo"},
        {"customer_id": 3, "name": "Tomaž Rekar", "health_score": 45, "factors": {"visit_frequency": 30, "spend_trend": 50, "engagement": 40, "recency": 60}, "status": "at_risk", "next_action": "Osebni klic"},
        {"customer_id": 4, "name": "Maja Zidar", "health_score": 35, "factors": {"visit_frequency": 20, "spend_trend": 40, "engagement": 30, "recency": 50}, "status": "critical", "next_action": "Intervencija - 30% popust"},
    ], "avg_health_score": 62.5}
