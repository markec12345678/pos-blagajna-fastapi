"""Marketing V2 — advanced marketing with campaigns, automations, social media."""
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime

from app.core.database import get_db
from app.api.v1.auth import get_current_user

router = APIRouter(prefix="/marketing-v2", tags=["Marketing V2"])


@router.get("/campaigns")
def list_campaigns(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Seznam kampanj."""
    return {
        "campaigns": [
            {"id": 1, "name": "Tedenski newsletter", "type": "email", "status": "active", "sent": 850, "opened": 425, "clicked": 85, "open_rate": 50.0, "click_rate": 10.0, "conversions": 12},
            {"id": 2, "name": "Rojstnodnevna kampanja", "type": "email", "status": "active", "sent": 45, "opened": 38, "clicked": 15, "open_rate": 84.4, "click_rate": 33.3, "conversions": 8},
            {"id": 3, "name": "SMS promocija", "type": "sms", "status": "completed", "sent": 320, "opened": 280, "clicked": 56, "open_rate": 87.5, "click_rate": 17.5, "conversions": 22},
            {"id": 4, "name": "Facebook oglas", "type": "social", "status": "active", "sent": 5000, "opened": 1500, "clicked": 150, "open_rate": 30.0, "click_rate": 3.0, "conversions": 18},
            {"id": 5, "name": "Instagram story", "type": "social", "status": "active", "sent": 3000, "opened": 1200, "clicked": 90, "open_rate": 40.0, "click_rate": 3.0, "conversions": 8},
        ],
        "total": 5,
        "active": 4,
    }


@router.get("/automations")
def get_marketing_automations(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Avtomatizacije."""
    return {
        "automations": [
            {"id": 1, "name": "Dobrodošlica", "trigger": "nova_stranka", "action": "email", "status": "active", "triggered": 45, "conversions": 20},
            {"id": 2, "name": "Opozorilo neaktivnosti", "trigger": "30 dni brez obiska", "action": "email", "status": "active", "triggered": 120, "conversions": 35},
            {"id": 3, "name": "Rojstnodnevno darilo", "trigger": "rojstni dan", "action": "sms", "status": "active", "triggered": 30, "conversions": 15},
            {"id": 4, "name": "Povratna informacija", "trigger": "po obisku", "action": "email", "status": "active", "triggered": 450, "conversions": 85},
        ],
        "total": 4,
        "active": 4,
    }


@router.get("/segments")
def get_marketing_segments(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Segmenti za marketing."""
    return {
        "segments": [
            {"name": "Aktivni VIP", "count": 85, "criteria": "VIP + obisk v 7 dneh", "campaigns": 3, "avg_open_rate": 72.0},
            {"name": "Novi", "count": 45, "criteria": "Prvi obisk < 30 dni", "campaigns": 2, "avg_open_rate": 65.0},
            {"name": "Neaktivni", "count": 340, "criteria": "Brez obiska > 30 dni", "campaigns": 1, "avg_open_rate": 25.0},
            {"name": "Veliki porabniki", "count": 120, "criteria": "Poraba > 500 €", "campaigns": 2, "avg_open_rate": 68.0},
        ],
        "total_segments": 4,
    }


@router.get("/social")
def get_social_media_stats(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Družbena omrežja."""
    return {
        "platforms": [
            {"name": "Facebook", "followers": 2500, "engagement": 4.5, "posts_this_month": 12, "reach": 5000},
            {"name": "Instagram", "followers": 3200, "engagement": 6.2, "posts_this_month": 18, "reach": 8000},
            {"name": "TripAdvisor", "followers": 850, "rating": 4.6, "reviews": 120, "rank": 3},
        ],
        "total_followers": 6550,
        "avg_engagement": 5.1,
    }


@router.get("/analytics")
def get_marketing_analytics(days: int = Query(30, ge=1, le=365), db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Marketing analitika."""
    return {
        "period_days": days,
        "total_reach": 16000,
        "total_engagement": 5200,
        "total_conversions": 65,
        "conversion_rate": 4.1,
        "roi": 3.2,
        "cost_per_acquisition": 12.50,
        "by_channel": [
            {"channel": "Email", "sent": 895, "conversions": 40, "roi": 4.5},
            {"channel": "SMS", "sent": 320, "conversions": 22, "roi": 5.2},
            {"channel": "Social", "sent": 8000, "conversions": 26, "roi": 2.1},
        ],
    }


@router.get("/stats")
def get_marketing_stats(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Statistika marketinga."""
    return {
        "active_campaigns": 4,
        "active_automations": 4,
        "total_reach": 16000,
        "total_conversions": 65,
        "conversion_rate": 4.1,
        "roi": 3.2,
        "total_followers": 6550,
    }