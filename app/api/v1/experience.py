"""Customer experience — feedback, surveys, loyalty programs."""
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime, timedelta

from app.core.database import get_db
from app.api.v1.auth import get_current_user

router = APIRouter(prefix="/experience", tags=["Izkušnja strank"])


class SurveyCreate(BaseModel):
    name: str
    questions: List[dict]
    target_audience: str  # all, new, returning, vip
    reward_points: Optional[int] = None


@router.get("/surveys")
def list_surveys(
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Seznam anket."""
    return {
        "surveys": [
            {
                "id": 1, "name": "Anketa zadovoljstva",
                "description": "Kratka anketa po obisku",
                "questions_count": 5,
                "target": "all",
                "responses": 156,
                "avg_rating": 4.6,
                "status": "active",
                "reward_points": 10,
            },
            {
                "id": 2, "name": "Povratna informacija o meniju",
                "description": "Kaj vam je bilo všeč?",
                "questions_count": 8,
                "target": "returning",
                "responses": 89,
                "avg_rating": 4.4,
                "status": "active",
                "reward_points": 15,
            },
            {
                "id": 3, "name": "Anketa za nove stranke",
                "description": "Kako ste nas našli?",
                "questions_count": 6,
                "target": "new",
                "responses": 45,
                "avg_rating": 4.8,
                "status": "active",
                "reward_points": 20,
            },
        ],
        "total": 3,
        "active": 3,
        "total_responses": 290,
    }


@router.post("/surveys")
def create_survey(data: SurveyCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Ustvari anketo."""
    return {
        "message": "Anketa ustvarjena",
        "survey": {
            "name": data.name,
            "questions": len(data.questions),
            "target": data.target_audience,
            "reward_points": data.reward_points,
            "status": "draft",
            "created_at": datetime.now().isoformat(),
        }
    }


@router.get("/surveys/{survey_id}/results")
def get_survey_results(survey_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Rezultati ankete."""
    return {
        "survey_id": survey_id,
        "total_responses": 156,
        "completion_rate": 78.0,
        "avg_rating": 4.6,
        "ratings": {
            "5": 89,
            "4": 42,
            "3": 15,
            "2": 7,
            "1": 3,
        },
        "questions": [
            {
                "question": "Kako bi ocenili splošno izkušnjo?",
                "avg_rating": 4.6,
                "responses": 156,
            },
            {
                "question": "Ali bi nas priporočili prijateljem?",
                "yes_percentage": 92.3,
                "responses": 156,
            },
            {
                "question": "Kaj vam je bilo najbolj všeč?",
                "top_answers": ["Hrana", "Strežba", "Ambient"],
                "responses": 156,
            },
        ],
        "nps_score": 72,
        "nps_category": "excellent",
    }


@router.get("/feedback")
def list_feedback(
    sentiment: Optional[str] = None,
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Seznam povratnih informacij."""
    return {
        "feedback": [
            {
                "id": 1, "customer": "Janez Novak",
                "rating": 5, "sentiment": "positive",
                "comment": "Odlična hrana in prijazna strežba!",
                "source": "anketa", "date": "2026-01-15",
                "follow_up_needed": False,
            },
            {
                "id": 2, "customer": "Marija Kovač",
                "rating": 4, "sentiment": "positive",
                "comment": "Dobra hrana, malo dolg čas strežbe.",
                "source": "anketa", "date": "2026-01-15",
                "follow_up_needed": True,
            },
            {
                "id": 3, "customer": "Peter Horvat",
                "rating": 3, "sentiment": "neutral",
                "comment": "Hrana je bila v redu, cena malo visoka.",
                "source": "anketa", "date": "2026-01-14",
                "follow_up_needed": True,
            },
            {
                "id": 4, "customer": "Ana Petrović",
                "rating": 5, "sentiment": "positive",
                "comment": "Najboljša rižota z gobami kar sem jih jedla!",
                "source": "google", "date": "2026-01-14",
                "follow_up_needed": False,
            },
            {
                "id": 5, "customer": "Dejan Kovač",
                "rating": 2, "sentiment": "negative",
                "comment": "Hrana je bila mrzla, strežba počasna.",
                "source": "anketa", "date": "2026-01-13",
                "follow_up_needed": True,
            },
        ],
        "total": 5,
        "positive": 3,
        "neutral": 1,
        "negative": 1,
    }


@router.get("/experience-metrics")
def get_experience_metrics(
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Metrike izkušenj."""
    return {
        "period_days": days,
        "overall_score": 4.6,
        "nps_score": 72,
        "satisfaction_rate": 94.2,
        "return_rate": 68.5,
        "avg_wait_time": 8.5,
        "avg_service_time": 45.2,
        "complaints": 3,
        "compliments": 28,
        "top_positive": [
            "Kakovost hrane",
            "Prijazna strežba",
            "Ambient",
        ],
        "top_improvements": [
            "Čas strežbe",
            "Cena",
            "Parking",
        ],
        "trend": {
            "satisfaction_change": 2.3,
            "nps_change": 5.0,
            "return_rate_change": 1.8,
        },
    }


@router.get("/loyalty-program")
def get_loyalty_program(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Program zvestobe."""
    return {
        "tiers": [
            {
                "name": "Bronasti",
                "min_points": 0,
                "benefits": ["5% popust", "Brezplačna kava ob rojstnem dnevu"],
                "members": 850,
            },
            {
                "name": "Srebrni",
                "min_points": 500,
                "benefits": ["10% popust", "Prednostna rezervacija", "Brezplačna sladica"],
                "members": 320,
            },
            {
                "name": "Zlati",
                "min_points": 1500,
                "benefits": ["15% popust", "Posebne ponudbe", "Brezplačna pijača"],
                "members": 80,
            },
        ],
        "active_members": 1250,
        "total_points_issued": 45000,
        "redemption_rate": 72.5,
        "avg_points_per_member": 36,
    }


@router.get("/complaints")
def list_complaints(
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Seznam pritožb."""
    return {
        "complaints": [
            {
                "id": 1, "customer": "Dejan Kovač",
                "issue": "Hrana je bila mrzla",
                "date": "2026-01-13", "status": "resolved",
                "resolution": "Ponudili smo brezplačno kavo",
                "resolved_by": "Janez Novak",
            },
            {
                "id": 2, "customer": "Marija Kovač",
                "issue": "Dolg čas strežbe",
                "date": "2026-01-15", "status": "in_progress",
                "resolution": None,
                "resolved_by": None,
            },
            {
                "id": 3, "customer": "Peter Horvat",
                "issue": "Visoka cena",
                "date": "2026-01-14", "status": "resolved",
                "resolution": "Razložili smo politiko cen",
                "resolved_by": "Admin",
            },
        ],
        "total": 3,
        "resolved": 2,
        "in_progress": 1,
        "avg_resolution_time": 1.5,
    }


@router.get("/stats")
def get_experience_stats(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Statistika izkušenj."""
    return {
        "overall_score": 4.6,
        "nps_score": 72,
        "satisfaction_rate": 94.2,
        "total_surveys": 3,
        "total_responses": 290,
        "total_feedback": 156,
        "complaints": 3,
        "resolved_complaints": 2,
        "loyalty_members": 1250,
        "top_praise": "Kakovost hrane",
        "top_improvement": "Čas strežbe",
    }