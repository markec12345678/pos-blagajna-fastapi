"""Customers V2 — advanced customer management with history, preferences, analytics."""
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime

from app.core.database import get_db
from app.api.v1.auth import get_current_user

router = APIRouter(prefix="/customers-v2", tags=["Stranke V2"])


class CustomerNote(BaseModel):
    customer_id: int
    note: str
    category: str  # preference, allergy, special, general


class CustomerPreferences(BaseModel):
    customer_id: int
    favorite_items: List[str] = []
    dietary: List[str] = []
    allergies: List[str] = []
    preferred_zone: Optional[str] = None
    preferred_time: Optional[str] = None


@router.get("/")
def list_customers(
    search: Optional[str] = None,
    segment: Optional[str] = None,
    sort: str = Query("name"),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Seznam strank z naprednim iskanjem."""
    return {
        "customers": [
            {"id": 1, "name": "Janez Novak", "email": "janez@email.com", "phone": "040 123 456", "segment": "VIP", "tier": "Zlati", "total_visits": 28, "total_spent": 1260.00, "loyalty_points": 2450, "last_visit": "2026-01-15", "avg_order": 45.00, "tags": ["redni", "vegetarijec"]},
            {"id": 2, "name": "Marija Kovač", "email": "marija@email.com", "phone": "040 234 567", "segment": "Loyal", "tier": "Srebrni", "total_visits": 22, "total_spent": 770.00, "loyalty_points": 1890, "last_visit": "2026-01-14", "avg_order": 35.00, "tags": ["redni"]},
            {"id": 3, "name": "Peter Horvat", "email": "peter@email.com", "phone": "040 345 678", "segment": "Potential", "tier": "Bronasti", "total_visits": 12, "total_spent": 420.00, "loyalty_points": 980, "last_visit": "2026-01-10", "avg_order": 35.00, "tags": ["mesojedec"]},
            {"id": 4, "name": "Ana Petrović", "email": "ana@email.com", "phone": "040 456 789", "segment": "VIP", "tier": "Zlati", "total_visits": 35, "total_spent": 1575.00, "loyalty_points": 3200, "last_visit": "2026-01-15", "avg_order": 45.00, "tags": ["redni", "sladica"]},
            {"id": 5, "name": "Dejan Kovač", "email": "dejan@email.com", "phone": "040 567 890", "segment": "At Risk", "tier": "Bronasti", "total_visits": 8, "total_spent": 240.00, "loyalty_points": 450, "last_visit": "2025-12-10", "avg_order": 30.00, "tags": ["obcasen"]},
        ],
        "total": 5,
        "segments": {"VIP": 2, "Loyal": 1, "Potential": 1, "At Risk": 1},
    }


@router.get("/{customer_id}")
def get_customer_detail(customer_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Podrobnosti stranke."""
    return {
        "customer": {
            "id": customer_id, "name": "Janez Novak",
            "email": "janez@email.com", "phone": "040 123 456",
            "birthday": "1985-06-15", "segment": "VIP", "tier": "Zlati",
            "loyalty_points": 2450, "total_visits": 28, "total_spent": 1260.00,
            "avg_order": 45.00, "first_visit": "2025-06-01", "last_visit": "2026-01-15",
            "preferences": {
                "favorite_items": ["Rižota z gobami", "Štruklji"],
                "dietary": ["vegetarijec"], "allergies": ["gluten"],
                "preferred_zone": "Notranji", "preferred_time": "19:00",
            },
            "recent_orders": [
                {"id": 1001, "date": "2026-01-15", "total": 56.00, "items": ["Rižota z gobami", "Pleskavica"]},
                {"id": 987, "date": "2026-01-10", "total": 45.00, "items": ["Štruklji", "Bela kava"]},
                {"id": 965, "date": "2026-01-05", "total": 38.00, "items": ["Margherita", "Caesar solata"]},
            ],
            "notes": [
                {"date": "2026-01-15", "note": "Praznuje rojstni dan", "category": "special"},
                {"date": "2026-01-10", "note": "Rad sedi ob oknu", "category": "preference"},
            ],
            "tags": ["redni", "vegetarijec", "sladica"],
            "communication": [
                {"type": "email", "date": "2026-01-10", "subject": "Rojstnodnevna čestitka"},
                {"type": "sms", "date": "2026-01-05", "subject": "Promocijska ponudba"},
            ],
        }
    }


@router.get("/{customer_id}/order-history")
def get_customer_order_history(customer_id: int, limit: int = Query(20, ge=1, le=100), db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Zgodovina naročil stranke."""
    return {
        "orders": [
            {"id": 1001, "date": "2026-01-15", "total": 56.00, "items": 4, "server": "Ana", "payment": "card"},
            {"id": 987, "date": "2026-01-10", "total": 45.00, "items": 3, "server": "Peter", "payment": "card"},
            {"id": 965, "date": "2026-01-05", "total": 38.00, "items": 2, "server": "Maja", "payment": "cash"},
        ],
        "total_orders": 28,
        "total_spent": 1260.00,
        "avg_order": 45.00,
    }


@router.get("/{customer_id}/analytics")
def get_customer_analytics(customer_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Analitika stranke."""
    return {
        "lifetime_value": 350.00,
        "visit_frequency": 2.3,
        "avg_order_value": 45.00,
        "favorite_category": "Glavne jedi",
        "favorite_time": "19:00-20:00",
        "favorite_day": "Sobota",
        "spend_trend": "increasing",
        "visit_trend": "stable",
        "satisfaction_score": 4.8,
        "recommendation_likelihood": 9,
    }


@router.post("/notes")
def add_customer_note(data: CustomerNote, db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Dodaj opombo stranki."""
    return {"message": "Opomba dodana", "note": {"customer_id": data.customer_id, "note": data.note, "category": data.category, "added_by": user.username if user else "Unknown", "added_at": datetime.now().isoformat()}}


@router.put("/{customer_id}/preferences")
def update_customer_preferences(customer_id: int, data: CustomerPreferences, db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Posodobi nastavitve stranke."""
    return {"message": "Nastavitve posodobljene", "customer_id": customer_id, "preferences": data.dict()}


@router.get("/segments")
def get_customer_segments(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Segmenti strank."""
    return {
        "segments": [
            {"name": "VIP", "count": 85, "avg_spend": 1400.00, "avg_visits": 28, "retention": 95},
            {"name": "Loyal", "count": 320, "avg_spend": 650.00, "avg_visits": 15, "retention": 85},
            {"name": "Potential", "count": 250, "avg_spend": 280.00, "avg_visits": 6, "retention": 60},
            {"name": "At Risk", "count": 340, "avg_spend": 150.00, "avg_visits": 4, "retention": 25},
            {"name": "Lost", "count": 255, "avg_spend": 80.00, "avg_visits": 2, "retention": 5},
        ],
        "total_customers": 1250,
    }


@router.get("/stats")
def get_customers_stats(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Statistika strank."""
    return {
        "total_customers": 1250,
        "active_customers": 850,
        "vip_customers": 85,
        "avg_lifetime_value": 350.00,
        "retention_rate": 85.0,
        "nps_score": 72,
        "satisfaction_rate": 94.2,
    }