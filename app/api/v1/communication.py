"""Customer communication — email, SMS, notifications."""
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime, timedelta

from app.core.database import get_db
from app.api.v1.auth import get_current_user

router = APIRouter(prefix="/communication", tags=["Komunikacija s strankami"])


class EmailSend(BaseModel):
    to: List[str]
    subject: str
    body: str
    template_id: Optional[int] = None


class SMSSend(BaseModel):
    to: List[str]
    message: str


class CampaignCreate(BaseModel):
    name: str
    type: str  # email, sms, both
    subject: Optional[str] = None
    message: str
    audience: str  # all, vip, new, inactive
    schedule_date: Optional[str] = None


@router.get("/templates")
def get_email_templates(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Vrni predloge za email/SMS."""
    return {
        "templates": [
            {
                "id": 1, "name": "Dobrodošlica",
                "type": "email",
                "subject": "Dobrodošli v Restavraciji River Kolpa!",
                "preview": "Hvala, ker ste nas obiskali...",
                "category": "onboarding",
            },
            {
                "id": 2, "name": "Rojstnodnevna čestitka",
                "type": "email",
                "subject": "Vse najboljše za rojstni dan!",
                "preview": "Želimo vam srečen rojstni dan...",
                "category": "birthday",
            },
            {
                "id": 3, "name": "Promocijsko sporočilo",
                "type": "sms",
                "message": "Posebna ponudba: 20% popust na vse jedi do konca tedena!",
                "category": "promotion",
            },
            {
                "id": 4, "name": "Potrditev rezervacije",
                "type": "email",
                "subject": "Potrditev rezervacije",
                "preview": "Vaša rezervacija je potrjena...",
                "category": "reservation",
            },
            {
                "id": 5, "name": "Opomin za rezervacijo",
                "type": "sms",
                "message": "Imate rezervacijo danes ob {time}. Veselimo se vašega obiska!",
                "category": "reminder",
            },
            {
                "id": 6, "name": "Zahvala za obisk",
                "type": "email",
                "subject": "Hvala za obisk!",
                "preview": "Bilo nam je v veselje...",
                "category": "follow_up",
            },
        ],
        "total": 6,
    }


@router.post("/email/send")
def send_email(data: EmailSend, db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Pošlji email."""
    # In production: send via email service (SendGrid, etc.)
    return {
        "message": "Email poslan",
        "recipients": len(data.to),
        "subject": data.subject,
        "sent_at": datetime.now().isoformat(),
        "sent_by": user.username if user else "Unknown",
    }


@router.post("/sms/send")
def send_sms(data: SMSSend, db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Pošlji SMS."""
    # In production: send via SMS service (Twilio, etc.)
    return {
        "message": "SMS poslan",
        "recipients": len(data.to),
        "sent_at": datetime.now().isoformat(),
        "sent_by": user.username if user else "Unknown",
    }


@router.get("/campaigns")
def list_campaigns(
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Vrni kampanje."""
    return {
        "campaigns": [
            {
                "id": 1, "name": "Zimski popust",
                "type": "email", "subject": "Zimska ponudba - 20% popust",
                "audience": "all", "status": "sent",
                "sent_count": 1250, "opened": 875, "clicked": 234,
                "sent_date": "2026-01-10",
            },
            {
                "id": 2, "name": "Rojstnodnevne čestitke",
                "type": "email", "subject": "Vse najboljše!",
                "audience": "birthday", "status": "active",
                "sent_count": 45, "opened": 38, "clicked": 12,
                "sent_date": "2026-01-15",
            },
            {
                "id": 3, "name": "Vikend akcija",
                "type": "sms", "message": "Vikend akcija!",
                "audience": "vip", "status": "scheduled",
                "scheduled_date": "2026-01-17",
            },
        ],
        "total": 3,
        "sent": 1,
        "active": 1,
        "scheduled": 1,
    }


@router.post("/campaigns/create")
def create_campaign(data: CampaignCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Ustvari kampanjo."""
    return {
        "message": "Kampanja ustvarjena",
        "campaign": {
            "name": data.name,
            "type": data.type,
            "audience": data.audience,
            "status": "draft" if data.schedule_date else "ready",
            "created_at": datetime.now().isoformat(),
            "created_by": user.username if user else "Unknown",
        }
    }


@router.get("/customers/segments")
def get_customer_segments(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Vrni segmente strank."""
    return {
        "segments": [
            {"name": "Vse stranke", "count": 1250, "description": "Vse registrirane stranke"},
            {"name": "VIP stranke", "count": 85, "description": "Stranke z več kot 10 obiski"},
            {"name": "Nove stranke", "count": 120, "description": "Stranke v zadnjem mesecu"},
            {"name": "Neaktivne stranke", "count": 340, "description": "Stranke brez obiska 30+ dni"},
            {"name": "Rojeni v januarju", "count": 45, "description": "Stranke z rojstnim dnem v januarju"},
            {"name": "Povprečni", "count": 660, "description": "Ostale stranke"},
        ],
        "total": 1250,
    }


@router.get("/notifications/push")
def get_push_notifications(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Vrni push obvestila."""
    return {
        "notifications": [
            {
                "id": 1, "title": "Nova rezervacija",
                "body": "Imate novo rezervacijo za 4 osebe",
                "time": "pred 5 minutami",
                "read": False,
            },
            {
                "id": 2, "title": "Nizka zaloga",
                "body": "Maka je na nizki zalogi",
                "time": "pred 1 uro",
                "read": True,
            },
        ],
        "unread": 1,
    }


@router.get("/analytics")
def get_communication_analytics(
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Analitika komunikacije."""
    return {
        "period_days": days,
        "email": {
            "sent": 1295,
            "delivered": 1280,
            "opened": 913,
            "clicked": 246,
            "bounce_rate": 1.2,
            "open_rate": 71.3,
            "click_rate": 19.2,
        },
        "sms": {
            "sent": 450,
            "delivered": 445,
            "response_rate": 12.5,
        },
        "campaigns": {
            "total": 3,
            "sent": 1,
            "active": 1,
            "scheduled": 1,
        },
        "top_templates": [
            {"name": "Dobrodošlica", "usage": 450},
            {"name": "Rojstnodnevna čestitka", "usage": 380},
            {"name": "Promocijsko sporočilo", "usage": 250},
        ],
    }


@router.get("/stats")
def get_communication_stats(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Statistika komunikacije."""
    return {
        "total_emails_sent": 1295,
        "total_sms_sent": 450,
        "active_campaigns": 1,
        "scheduled_campaigns": 1,
        "subscriber_count": 1250,
        "avg_open_rate": 71.3,
        "avg_click_rate": 19.2,
        "last_campaign": "2026-01-15",
    }