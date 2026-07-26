"""Feedback V2 — advanced feedback with surveys, NPS, CSAT, trends."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from datetime import datetime

from app.core.database import get_db
from app.api.v1.auth import get_current_user

router = APIRouter(prefix="/feedback-v2", tags=["Feedback V2"])


@router.get("/surveys")
def list_surveys(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Seznam anket."""
    return {
        "surveys": [
            {"id": 1, "name": "Anketa zadovoljstva", "type": "csat", "responses": 125, "avg_score": 4.3, "status": "active", "completion_rate": 68.0},
            {"id": 2, "name": "NPS anketa", "type": "nps", "responses": 89, "nps_score": 62, "status": "active", "completion_rate": 55.0},
            {"id": 3, "name": "Povratna informacija po obisku", "type": "custom", "responses": 210, "avg_score": 4.1, "status": "active", "completion_rate": 72.0},
        ],
        "total": 3,
        "total_responses": 424,
    }


@router.get("/nps")
def get_nps_data(
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db), user=Depends(get_current_user)
):
    """NPS podatki."""
    return {
        "period_days": days,
        "nps_score": 62,
        "promoters_pct": 72.0,
        "passives_pct": 18.0,
        "detractors_pct": 10.0,
        "total_responses": 89,
        "trend": "increasing",
        "by_category": [
            {"category": "Hrana", "nps": 70},
            {"category": "Postrežba", "nps": 58},
            {"category": "Vzdušje", "nps": 65},
            {"category": "Cena", "nps": 52},
        ],
    }


@router.get("/csat")
def get_csat_data(
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db), user=Depends(get_current_user)
):
    """CSAT podatki."""
    return {
        "period_days": days,
        "avg_score": 4.3,
        "total_responses": 125,
        "distribution": {1: 5, 2: 8, 3: 15, 4: 42, 5: 55},
        "satisfaction_rate": 77.6,
        "trend": "stable",
    }


@router.get("/recent")
def get_recent_feedback(
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db), user=Depends(get_current_user)
):
    """Nedavni odzivi."""
    return {
        "feedback": [
            {"id": 1, "date": "2026-07-16", "type": "csat", "score": 5, "comment": "Odlična izkušnja!", "category": "Hrana"},
            {"id": 2, "date": "2026-07-15", "type": "nps", "score": 9, "comment": "Priporočam vsem", "category": "Splošno"},
            {"id": 3, "date": "2026-07-14", "type": "csat", "score": 3, "comment": "Dolg čas čakanja", "category": "Postrežba"},
            {"id": 4, "date": "2026-07-13", "type": "nps", "score": 8, "comment": "Dobro vzdušje", "category": "Vzdušje"},
            {"id": 5, "date": "2026-07-12", "type": "csat", "score": 4, "comment": "Dobra hrana, malo draga", "category": "Cena"},
        ],
        "total": 5,
    }


@router.get("/stats")
def get_feedback_stats(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Statistika povratnih informacij."""
    return {
        "total_surveys": 3,
        "total_responses": 424,
        "nps_score": 62,
        "avg_csat": 4.3,
        "completion_rate": 65.0,
    }
