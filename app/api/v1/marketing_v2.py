"""Marketing automation — campaigns, segmentation, automation."""
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime, timedelta

from app.core.database import get_db
from app.api.v1.auth import get_current_user

router = APIRouter(prefix="/marketing-auto", tags=["Marketinška avtomatizacija"])


class CampaignCreate(BaseModel):
    name: str
    type: str  # email, sms, push, social
    audience: str  # all, vip, new, inactive, birthday
    message: str
    offer: Optional[str] = None
    start_date: str
    end_date: str


class SegmentCreate(BaseModel):
    name: str
    rules: List[dict]
    description: Optional[str] = None


@router.get("/campaigns")
def list_campaigns(
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Seznam kampanj."""
    return {
        "campaigns": [
            {
                "id": 1, "name": "Zimska ponudba",
                "type": "email", "audience": "all",
                "message": "20% popust na vse jedi",
                "offer": "20% POPUST",
                "start_date": "2026-01-10", "end_date": "2026-01-31",
                "status": "active",
                "metrics": {"sent": 1250, "opened": 875, "clicked": 234, "converted": 89},
            },
            {
                "id": 2, "name": "Rojstnodnevne čestitke",
                "type": "email", "audience": "birthday",
                "message": "Vse najboljše! Brezplačna sladica",
                "offer": "BREZPLAČNA SLADICA",
                "start_date": "2026-01-01", "end_date": "2026-12-31",
                "status": "active",
                "metrics": {"sent": 45, "opened": 38, "clicked": 12, "converted": 10},
            },
            {
                "id": 3, "name": "Vikend akcija",
                "type": "sms", "audience": "vip",
                "message": "Vikend akcija: 2x1 na pijače",
                "offer": "2x1 PIJAČE",
                "start_date": "2026-01-17", "end_date": "2026-01-19",
                "status": "scheduled",
                "metrics": {"sent": 0, "opened": 0, "clicked": 0, "converted": 0},
            },
        ],
        "total": 3,
        "active": 2,
        "scheduled": 1,
    }


@router.post("/campaigns")
def create_campaign(data: CampaignCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Ustvari kampanjo."""
    return {
        "message": "Kampanja ustvarjena",
        "campaign": {
            "name": data.name,
            "type": data.type,
            "audience": data.audience,
            "offer": data.offer,
            "start_date": data.start_date,
            "end_date": data.end_date,
            "status": "draft",
            "created_at": datetime.now().isoformat(),
        }
    }


@router.get("/segments")
def list_segments(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Seznam segmentov."""
    return {
        "segments": [
            {
                "id": 1, "name": "VIP stranke",
                "description": "Stranke z več kot 10 obiski",
                "count": 85,
                "rules": [{"field": "visits", "operator": ">", "value": 10}],
                "last_updated": "2026-01-15",
            },
            {
                "id": 2, "name": "Nove stranke",
                "description": "Stranke v zadnjem mesecu",
                "count": 120,
                "rules": [{"field": "first_visit", "operator": ">", "value": "2025-12-15"}],
                "last_updated": "2026-01-15",
            },
            {
                "id": 3, "name": "Neaktivne stranke",
                "description": "Stranke brez obiska 30+ dni",
                "count": 340,
                "rules": [{"field": "last_visit", "operator": "<", "value": "2025-12-15"}],
                "last_updated": "2026-01-15",
            },
            {
                "id": 4, "name": "Ljubitelji mesa",
                "description": "Stranke, ki naročajo mesne jedi",
                "count": 450,
                "rules": [{"field": "favorite_category", "operator": "=", "value": "Meso"}],
                "last_updated": "2026-01-15",
            },
        ],
        "total": 4,
    }


@router.post("/segments")
def create_segment(data: SegmentCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Ustvari segment."""
    return {
        "message": "Segment ustvarjen",
        "segment": {
            "name": data.name,
            "description": data.description,
            "rules": data.rules,
            "count": 0,
            "created_at": datetime.now().isoformat(),
        }
    }


@router.get("/automation")
def list_automations(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Seznam avtomatizacij."""
    return {
        "automations": [
            {
                "id": 1, "name": "Dobrodošlica",
                "trigger": "new_customer",
                "action": "send_email",
                "template": "Dobrodošlica",
                "status": "active",
                "triggered": 120,
                "converted": 45,
            },
            {
                "id": 2, "name": "Rojstni dan",
                "trigger": "birthday",
                "action": "send_email",
                "template": "Rojstnodnevna čestitka",
                "status": "active",
                "triggered": 45,
                "converted": 38,
            },
            {
                "id": 3, "name": "Neaktivna stranka",
                "trigger": "inactive_30_days",
                "action": "send_sms",
                "template": "Pogrešamo vas!",
                "status": "active",
                "triggered": 340,
                "converted": 68,
            },
            {
                "id": 4, "name": "Po obisku",
                "trigger": "post_order",
                "action": "send_email",
                "template": "Zahvala za obisk",
                "status": "active",
                "triggered": 1245,
                "converted": 0,
            },
        ],
        "total": 4,
        "active": 4,
    }


@router.get("/analytics")
def get_marketing_analytics(
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Analiza marketinga."""
    return {
        "period_days": days,
        "campaigns": {
            "total": 3,
            "active": 2,
            "scheduled": 1,
            "total_sent": 1295,
            "total_opened": 913,
            "total_clicked": 246,
            "total_converted": 127,
        },
        "conversion_rate": 9.8,
        "roi": 320.0,
        "by_channel": [
            {"channel": "Email", "sent": 1295, "opened": 913, "clicked": 246, "converted": 127},
            {"channel": "SMS", "sent": 450, "delivered": 445, "response_rate": 12.5},
            {"channel": "Push", "sent": 320, "opened": 180, "clicked": 45},
        ],
        "top_campaigns": [
            {"name": "Zimska ponudba", "conversion_rate": 7.1},
            {"name": "Rojstnodnevne čestitke", "conversion_rate": 22.2},
            {"name": "Neaktivne stranke", "conversion_rate": 20.0},
        ],
        "insights": [
            "Rojstnodnevne čestitke imajo najvišjo konverzijo",
            "SMS kampanje dosegajo 12.5% odzivnost",
            "Email kampanje generirajo 89 konverzij",
        ],
    }


@router.get("/social")
def get_social_media_stats(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Statistika družbenih medijev."""
    return {
        "platforms": [
            {
                "name": "Facebook",
                "followers": 1250,
                "engagement_rate": 4.5,
                "posts": 12,
                "reach": 15000,
                "top_post": "Rižota z gobami - recept dneva",
            },
            {
                "name": "Instagram",
                "followers": 2340,
                "engagement_rate": 6.2,
                "posts": 18,
                "reach": 28000,
                "top_post": "Selfie pri River Kolpa",
            },
            {
                "name": "TripAdvisor",
                "rating": 4.7,
                "reviews": 156,
                "rank": 3,
                "top_review": "Najboljša rižota v regiji",
            },
        ],
        "total_followers": 3590,
        "avg_engagement": 5.4,
        "sentiment_score": 85.0,
    }


@router.get("/stats")
def get_marketing_stats(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Statistika marketinga."""
    return {
        "total_campaigns": 3,
        "active_campaigns": 2,
        "total_segments": 4,
        "total_automations": 4,
        "total_sent": 1295,
        "conversion_rate": 9.8,
        "roi": 320.0,
        "social_followers": 3590,
        "avg_engagement": 5.4,
    }