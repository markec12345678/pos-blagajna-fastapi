"""Employee management improvements — performance tracking, training, engagement."""
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime, timedelta

from app.core.database import get_db
from app.api.v1.auth import get_current_user

router = APIRouter(prefix="/employee-advanced", tags=["Napredno upravljanje zaposlenih"])


class GoalCreate(BaseModel):
    employee_id: int
    title: str
    description: Optional[str] = None
    target_value: float
    unit: str
    deadline: str


class FeedbackCreate(BaseModel):
    employee_id: int
    type: str  # positive, constructive, neutral
    category: str  # performance, behavior, teamwork
    message: str
    is_anonymous: bool = False


@router.get("/performance")
def get_employee_performance(
    period: str = Query("monthly"),
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Napredna uspešnost zaposlenih."""
    return {
        "period": period,
        "employees": [
            {
                "id": 1, "name": "Janez Novak", "role": "Manager",
                "metrics": {
                    "orders_handled": 156,
                    "revenue_generated": 4680.00,
                    "avg_service_time": 42.5,
                    "customer_rating": 4.8,
                    "upselling_rate": 15.2,
                },
                "goals_progress": [
                    {"goal": "Povečati prodajo za 10%", "progress": 85.0, "target": 100},
                    {"goal": "Zmanjšati čas strežbe", "progress": 72.0, "target": 100},
                ],
                "attendance": {"present": 22, "absent": 1, "late": 0},
                "score": 92.5,
            },
            {
                "id": 2, "name": "Marija Kovač", "role": "Kuhar",
                "metrics": {
                    "orders_prepared": 234,
                    "avg_prep_time": 18.5,
                    "food_quality_score": 4.7,
                    "waste_percentage": 2.8,
                },
                "goals_progress": [
                    {"goal": "Zmanjšati odpadke", "progress": 90.0, "target": 100},
                    {"goal": "Povečati hitrost", "progress": 78.0, "target": 100},
                ],
                "attendance": {"present": 23, "absent": 0, "late": 1},
                "score": 94.2,
            },
            {
                "id": 3, "name": "Peter Horvat", "role": "Natakar",
                "metrics": {
                    "orders_handled": 142,
                    "revenue_generated": 4260.00,
                    "avg_service_time": 45.2,
                    "customer_rating": 4.5,
                    "upselling_rate": 12.8,
                },
                "goals_progress": [
                    {"goal": "Povečati napitnine", "progress": 65.0, "target": 100},
                    {"goal": "Izboljšati ocene", "progress": 70.0, "target": 100},
                ],
                "attendance": {"present": 21, "absent": 2, "late": 1},
                "score": 85.3,
            },
        ],
        "avg_score": 90.7,
    }


@router.get("/goals")
def list_goals(
    employee_id: Optional[int] = None,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Seznam ciljev."""
    return {
        "goals": [
            {
                "id": 1, "employee": "Janez Novak",
                "title": "Povečati prodajo za 10%",
                "description": "Povečati mesečno prodajo za 10%",
                "target_value": 10, "current_value": 8.5,
                "unit": "%", "progress": 85.0,
                "deadline": "2026-01-31", "status": "in_progress",
            },
            {
                "id": 2, "employee": "Marija Kovač",
                "title": "Zmanjšati odpadke za 20%",
                "description": "Zmanjšati količino odpadkov",
                "target_value": 20, "current_value": 18,
                "unit": "%", "progress": 90.0,
                "deadline": "2026-02-28", "status": "in_progress",
            },
            {
                "id": 3, "employee": "Peter Horvat",
                "title": "Povečati napitnine za 15%",
                "description": "Povečati povprečno napitnino",
                "target_value": 15, "current_value": 9.75,
                "unit": "%", "progress": 65.0,
                "deadline": "2026-03-31", "status": "in_progress",
            },
        ],
        "total": 3,
        "completed": 0,
        "in_progress": 3,
    }


@router.post("/goals")
def create_goal(data: GoalCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Ustvari cilj."""
    return {
        "message": "Cilj ustvarjen",
        "goal": {
            "employee_id": data.employee_id,
            "title": data.title,
            "target_value": data.target_value,
            "unit": data.unit,
            "deadline": data.deadline,
            "status": "active",
            "created_at": datetime.now().isoformat(),
        }
    }


@router.get("/feedback")
def list_feedback(
    employee_id: Optional[int] = None,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Povratne informacije."""
    return {
        "feedback": [
            {
                "id": 1, "employee": "Janez Novak",
                "type": "positive", "category": "performance",
                "message": "Odlično vodenje ekipe ta teden",
                "from": "Admin", "date": "2026-01-15",
                "is_anonymous": False,
            },
            {
                "id": 2, "employee": "Peter Horvat",
                "type": "constructive", "category": "performance",
                "message": "Pospeši strežbo ob konicah",
                "from": "Manager", "date": "2026-01-14",
                "is_anonymous": False,
            },
            {
                "id": 3, "employee": "Marija Kovač",
                "type": "positive", "category": "teamwork",
                "message": "Pomagala pri usposabljanju novega osebja",
                "from": "Anonymous", "date": "2026-01-13",
                "is_anonymous": True,
            },
        ],
        "total": 3,
        "positive": 2,
        "constructive": 1,
    }


@router.post("/feedback")
def submit_feedback(data: FeedbackCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Oddaj povratno informacijo."""
    return {
        "message": "Povratna informacija oddana",
        "feedback": {
            "employee_id": data.employee_id,
            "type": data.type,
            "category": data.category,
            "message": data.message,
            "is_anonymous": data.is_anonymous,
            "from": "Anonymous" if data.is_anonymous else (user.username if user else "Unknown"),
            "date": datetime.now().strftime('%Y-%m-%d'),
        }
    }


@router.get("/training")
def get_training_progress(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Napredek usposabljanja."""
    return {
        "employees": [
            {
                "name": "Janez Novak",
                "completed_trainings": ["HACCP", "Varnost pri delu", "Vodenje ekipe"],
                "in_progress": ["Napredni management"],
                "completion_rate": 85.0,
            },
            {
                "name": "Marija Kovač",
                "completed_trainings": ["HACCP", "Varnost pri delu"],
                "in_progress": ["Napredni tečaj kuhanja"],
                "completion_rate": 70.0,
            },
            {
                "name": "Peter Horvat",
                "completed_trainings": ["Osnove strežbe"],
                "in_progress": ["HACCP", "Napredna strežba"],
                "completion_rate": 45.0,
            },
        ],
        "overall_completion": 66.7,
        "upcoming_trainings": 2,
    }


@router.get("/engagement")
def get_employee_engagement(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Vpletenost zaposlenih."""
    return {
        "engagement_score": 82.5,
        "survey_results": {
            "satisfaction": 4.2,
            "work_life_balance": 3.8,
            "growth_opportunities": 4.0,
            "team_collaboration": 4.5,
            "management_support": 4.3,
        },
        "turnover_rate": 8.5,
        "avg_tenure_months": 18,
        "recommendations": [
            "Izboljšajte ravnovesje med delom in zasebnim življenjem",
            "Ponudite več priložnosti za napredovanje",
            "Ohranite visoko raven sodelovanja v ekipi",
        ],
    }


@router.get("/compensation")
def get_compensation_analysis(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Analiza plač."""
    return {
        "by_role": [
            {"role": "Manager", "avg_salary": 2400, "market_avg": 2300, "difference": 4.3},
            {"role": "Kuhar", "avg_salary": 1800, "market_avg": 1750, "difference": 2.9},
            {"role": "Natakar", "avg_salary": 1200, "market_avg": 1150, "difference": 4.3},
        ],
        "total_monthly_payroll": 13440.00,
        "overtime_cost": 720.00,
        "benefits_cost": 2688.00,
        "insights": [
            "Plače so 3-4% nad tržnim povprečjem",
            "Stroški nadur znašajo 5.4% skupnih stroškov dela",
            "Ugodnosti znašajo 20% skupnih stroškov dela",
        ],
    }


@router.get("/stats")
def get_employee_stats(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Statistika zaposlenih."""
    return {
        "total_employees": 8,
        "active": 8,
        "avg_performance_score": 90.7,
        "goals_completed": 0,
        "goals_in_progress": 3,
        "training_completion": 66.7,
        "engagement_score": 82.5,
        "turnover_rate": 8.5,
        "avg_tenure_months": 18,
    }