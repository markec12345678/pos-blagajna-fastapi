"""Catering V2 — advanced catering management with events, menus, logistics."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from datetime import datetime

from app.core.database import get_db
from app.api.v1.auth import get_current_user

router = APIRouter(prefix="/catering-v2", tags=["Catering V2"])


@router.get("/events")
def list_catering_events(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Seznam catering dogodkov."""
    return {
        "events": [
            {"id": 1, "name": "Poslovna kosilja - Telekom", "date": "2026-07-18", "guests": 25, "venue": "Na lokaciji", "status": "confirmed", "total": 875.00, "deposit_paid": 300.00},
            {"id": 2, "name": "Poroka Novak-Horvat", "date": "2026-07-25", "guests": 80, "venue": "Dvorana Gradac", "status": "confirmed", "total": 4800.00, "deposit_paid": 1500.00},
            {"id": 3, "name": "Rojstnodnevna zabava", "date": "2026-08-02", "guests": 15, "venue": "Vrt", "status": "pending", "total": 525.00, "deposit_paid": 0},
            {"id": 4, "name": "Team building", "date": "2026-08-10", "guests": 40, "venue": "Na lokaciji", "status": "pending", "total": 1600.00, "deposit_paid": 500.00},
        ],
        "total": 4,
        "confirmed": 2,
        "pending": 2,
    }


@router.get("/menus")
def get_catering_menus(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Catering meniji."""
    return {
        "menus": [
            {"id": 1, "name": "Klasični slovenski", "price_pp": 35.00, "items": ["Jota", "Kranjska klobasa z Repo", "Potica"], "popularity": 85, "margin": 55.0},
            {"id": 2, "name": "Premium", "price_pp": 55.00, "items": ["Idrijski žlikrofi", "Račji file", "Bled cream cake"], "popularity": 70, "margin": 60.0},
            {"id": 3, "name": "Lažji meni", "price_pp": 25.00, "items": ["Solata", "Štruklji", "Sladoled"], "popularity": 45, "margin": 50.0},
            {"id": 4, "name": "Vegetarijanski", "price_pp": 30.00, "items": ["Gobova juha", "Ajdovi žganci", "Sadna solata"], "popularity": 30, "margin": 52.0},
        ],
    }


@router.get("/logistics")
def get_catering_logistics(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Logistika cateringa."""
    return {
        "upcoming": [
            {"event": "Poslovna kosilja - Telekom", "date": "2026-07-18", "tasks": [
                {"task": "Priprava jedi", "assigned": "Boštjan", "status": "pending"},
                {"task": "Transport", "assigned": "Peter", "status": "pending"},
                {"task": "Postrežba", "assigned": "Ana", "status": "pending"},
            ]},
            {"event": "Poroka Novak-Horvat", "date": "2026-07-25", "tasks": [
                {"task": "Meni potrditev", "assigned": "Maja", "status": "completed"},
                {"task": "Ogled lokacije", "assigned": "Maja", "status": "completed"},
                {"task": "Naročilo materiala", "assigned": "Boštjan", "status": "in_progress"},
            ]},
        ],
        "equipment_available": {"mize": 10, "stoli": 100, "krožniki": 120, "pribor": 100, "steklenice": 150},
    }


@router.get("/stats")
def get_catering_stats(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Statistika cateringa."""
    return {
        "total_events": 4,
        "confirmed": 2,
        "total_revenue": 7800.00,
        "deposits_collected": 2300.00,
        "avg_guests": 40,
        "avg_revenue_per_event": 1950.00,
    }
