"""CRM — customer profiles, communication, relationship management."""
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime, timedelta

from app.core.database import get_db
from app.api.v1.auth import get_current_user

router = APIRouter(prefix="/crm", tags=["CRM"])


class CustomerNote(BaseModel):
    customer_id: int
    note: str
    category: str  # preference, allergy, special, general


class CustomerTag(BaseModel):
    customer_id: int
    tags: List[str]


@router.get("/customers")
def list_customers(
    search: Optional[str] = None,
    segment: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Seznam strank."""
    return {
        "customers": [
            {
                "id": 1, "name": "Janez Novak",
                "email": "janez.novak@email.com", "phone": "040 123 456",
                "segment": "VIP", "total_visits": 28,
                "total_spent": 1260.00, "avg_order": 45.00,
                "last_visit": "2026-01-15", "loyalty_points": 2450,
                "tags": ["redni", "vegetarijec"],
            },
            {
                "id": 2, "name": "Marija Kovač",
                "email": "marija.kovac@email.com", "phone": "040 234 567",
                "segment": "Loyal", "total_visits": 22,
                "total_spent": 770.00, "avg_order": 35.00,
                "last_visit": "2026-01-14", "loyalty_points": 1890,
                "tags": ["redni"],
            },
            {
                "id": 3, "name": "Peter Horvat",
                "email": "peter.horvat@email.com", "phone": "040 345 678",
                "segment": "Potential", "total_visits": 12,
                "total_spent": 420.00, "avg_order": 35.00,
                "last_visit": "2026-01-10", "loyalty_points": 980,
                "tags": ["mesojedec"],
            },
            {
                "id": 4, "name": "Ana Petrović",
                "email": "ana.petrovic@email.com", "phone": "040 456 789",
                "segment": "VIP", "total_visits": 35,
                "total_spent": 1575.00, "avg_order": 45.00,
                "last_visit": "2026-01-15", "loyalty_points": 3200,
                "tags": ["redni", "sladica"],
            },
            {
                "id": 5, "name": "Dejan Kovač",
                "email": "dejan.kovac@email.com", "phone": "040 567 890",
                "segment": "At Risk", "total_visits": 8,
                "total_spent": 240.00, "avg_order": 30.00,
                "last_visit": "2025-12-10", "loyalty_points": 450,
                "tags": ["obcasen"],
            },
        ],
        "total": 5,
        "segments": {"VIP": 2, "Loyal": 1, "Potential": 1, "At Risk": 1},
    }


@router.get("/customers/{customer_id}")
def get_customer_detail(customer_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Podrobnosti stranke."""
    return {
        "customer": {
            "id": customer_id, "name": "Janez Novak",
            "email": "janez.novak@email.com", "phone": "040 123 456",
            "birthday": "1985-06-15", "segment": "VIP",
            "loyalty_points": 2450, "tier": "Zlati",
            "total_visits": 28, "total_spent": 1260.00,
            "avg_order": 45.00, "first_visit": "2025-06-01",
            "last_visit": "2026-01-15",
            "preferences": {
                "favorite_items": ["Rižota z gobami", "Štruklji"],
                "dietary": ["vegetarijec"],
                "allergies": ["gluten"],
                "preferred_zone": "Notranji",
            },
            "notes": [
                {"date": "2026-01-15", "note": "Praznuje rojstni dan", "category": "special"},
                {"date": "2026-01-10", "note": "Rad sedi ob oknu", "category": "preference"},
            ],
            "tags": ["redni", "vegetarijec", "sladica"],
            "communication_history": [
                {"type": "email", "date": "2026-01-10", "subject": "Rojstnodnevna čestitka"},
                {"type": "sms", "date": "2026-01-05", "subject": "Promocijska ponudba"},
            ],
        }
    }


@router.post("/customers/notes")
def add_customer_note(data: CustomerNote, db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Dodaj opombo stranki."""
    return {
        "message": "Opomba dodana",
        "note": {
            "customer_id": data.customer_id,
            "note": data.note,
            "category": data.category,
            "added_by": user.username if user else "Unknown",
            "added_at": datetime.now().isoformat(),
        }
    }


@router.post("/customers/tags")
def update_customer_tags(data: CustomerTag, db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Posodobi oznake stranke."""
    return {
        "message": "Oznake posodobljene",
        "customer_id": data.customer_id,
        "tags": data.tags,
    }


@router.get("/segments")
def get_customer_segments(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Segmenti strank."""
    return {
        "segments": [
            {
                "name": "VIP",
                "description": "Stranke z več kot 20 obiski",
                "count": 85,
                "criteria": {"visits": ">20", "spend": ">1000"},
                "avg_spend": 1400.00,
                "avg_visits": 28,
            },
            {
                "name": "Loyal",
                "description": "Redne stranke (10-20 obiskov)",
                "count": 320,
                "criteria": {"visits": "10-20", "spend": "500-1000"},
                "avg_spend": 650.00,
                "avg_visits": 15,
            },
            {
                "name": "Potential",
                "description": "Nove stranke z potencialom",
                "count": 250,
                "criteria": {"visits": "3-10", "spend": "100-500"},
                "avg_spend": 280.00,
                "avg_visits": 6,
            },
            {
                "name": "At Risk",
                "description": "Stranke brez obiska 30+ dni",
                "count": 340,
                "criteria": {"last_visit": ">30 dni"},
                "avg_spend": 150.00,
                "avg_visits": 4,
            },
            {
                "name": "Lost",
                "description": "Stranke brez obiska 90+ dni",
                "count": 255,
                "criteria": {"last_visit": ">90 dni"},
                "avg_spend": 80.00,
                "avg_visits": 2,
            },
        ],
        "total_customers": 1250,
    }


@router.get("/interactions")
def get_customer_interactions(
    customer_id: Optional[int] = None,
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Interakcije s strankami."""
    return {
        "interactions": [
            {
                "id": 1, "customer": "Janez Novak",
                "type": "visit", "date": "2026-01-15",
                "description": "Obisk z 4 osebami",
                "amount": 56.00, "items": ["Rižota z gobami", "Pleskavica"],
            },
            {
                "id": 2, "customer": "Janez Novak",
                "type": "feedback", "date": "2026-01-15",
                "description": "Ocena 5/5, pohvala za hrano",
                "rating": 5,
            },
            {
                "id": 3, "customer": "Marija Kovač",
                "type": "visit", "date": "2026-01-14",
                "description": "Obisk z 2 osebama",
                "amount": 35.00, "items": ["Štruklji", "Bela kava"],
            },
            {
                "id": 4, "customer": "Peter Horvat",
                "type": "complaint", "date": "2026-01-12",
                "description": "Pritožba glede časa strežbe",
                "status": "resolved",
            },
        ],
        "total": 4,
    }


@router.get("/analytics")
def get_crm_analytics(
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """CRM analitika."""
    return {
        "period_days": days,
        "customer_metrics": {
            "total_customers": 1250,
            "new_customers": 45,
            "returning_customers": 850,
            "churned_customers": 12,
            "retention_rate": 85.0,
        },
        "engagement": {
            "avg_visits_per_customer": 3.2,
            "avg_spend_per_customer": 125.00,
            "avg_order_value": 29.55,
            "customer_lifetime_value": 350.00,
        },
        "satisfaction": {
            "nps_score": 72,
            "satisfaction_rate": 94.2,
            "complaint_rate": 0.5,
        },
        "insights": [
            "Retencija se je povečala za 2.3%",
            "Povprečna vrednost stranke se je povečala za 5%",
            "NPS score je odličen (72)",
        ],
    }


@router.get("/stats")
def get_crm_stats(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """CRM statistika."""
    return {
        "total_customers": 1250,
        "active_customers": 850,
        "vip_customers": 85,
        "avg_lifetime_value": 350.00,
        "retention_rate": 85.0,
        "nps_score": 72,
        "total_interactions": 4500,
        "satisfaction_rate": 94.2,
    }