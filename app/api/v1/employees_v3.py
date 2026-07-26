"""Employees V2 — advanced employee management with performance, goals, training."""
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime

from app.core.database import get_db
from app.api.v1.auth import get_current_user

router = APIRouter(prefix="/employees-v2", tags=["Zaposleni V2"])


@router.get("/")
def list_employees(
    search: Optional[str] = None,
    department: Optional[str] = None,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Seznam zaposlenih."""
    return {
        "employees": [
            {"id": 1, "name": "Ana Novak", "role": "Natakarica", "department": "Strežba", "status": "active", "performance": 4.8, "shifts_this_month": 18, "hours_this_month": 144, "training_completed": 5, "goals_met": 4, "start_date": "2024-03-15"},
            {"id": 2, "name": "Peter Horvat", "role": "Kuhar", "department": "Kuhinja", "status": "active", "performance": 4.6, "shifts_this_month": 20, "hours_this_month": 160, "training_completed": 4, "goals_met": 3, "start_date": "2023-06-01"},
            {"id": 3, "name": "Maja Kovač", "role": "Natakarica", "department": "Strežba", "status": "active", "performance": 4.9, "shifts_this_month": 16, "hours_this_month": 128, "training_completed": 6, "goals_met": 5, "start_date": "2025-01-10"},
            {"id": 4, "name": "Luka Petrović", "role": "Kuhar", "department": "Kuhinja", "status": "active", "performance": 4.4, "shifts_this_month": 19, "hours_this_month": 152, "training_completed": 3, "goals_met": 2, "start_date": "2025-08-01"},
            {"id": 5, "name": "Ana Kralj", "role": "Vodja", "department": "Vodenje", "status": "active", "performance": 4.7, "shifts_this_month": 22, "hours_this_month": 176, "training_completed": 7, "goals_met": 5, "start_date": "2022-01-01"},
        ],
        "total": 5,
    }


@router.get("/{employee_id}")
def get_employee_detail(employee_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Podrobnosti zaposlenega."""
    return {
        "employee": {
            "id": employee_id, "name": "Ana Novak", "role": "Natakarica",
            "department": "Strežba", "status": "active", "start_date": "2024-03-15",
            "email": "ana.novak@river.si", "phone": "040 111 222",
            "performance": 4.8, "satisfaction": 92,
            "certifications": [{"name": "HACCP", "expires": "2027-03-15"}, {"name": "Varstvo pri delu", "expires": "2026-06-01"}],
            "training": {"completed": 5, "in_progress": 1, "upcoming": 2},
            "goals": {"met": 4, "in_progress": 2, "total": 6},
            "recent_shifts": [
                {"date": "2026-01-15", "start": "10:00", "end": "18:00", "hours": 8},
                {"date": "2026-01-14", "start": "12:00", "end": "20:00", "hours": 8},
            ],
        }
    }


@router.get("/{employee_id}/performance")
def get_employee_performance(employee_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Učinkovitost zaposlenega."""
    return {
        "employee_id": employee_id,
        "metrics": {
            "overall_score": 4.8,
            "customer_feedback": 4.9,
            "efficiency": 4.7,
            "punctuality": 4.8,
            "teamwork": 4.9,
        },
        "trends": {
            "performance": "improving",
            "satisfaction": "stable",
            "attendance": "excellent",
        },
        "feedback": [
            {"date": "2026-01-15", "from": "Stranka", "rating": 5, "comment": "Odlična postrežba!"},
            {"date": "2026-01-13", "from": "Vodja", "rating": 5, "comment": "Zelo zanesljiva"},
        ],
    }


@router.get("/training")
def get_training_overview(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Pregled usposabljanja."""
    return {
        "courses": [
            {"name": "HACCP", "required": True, "completed": 4, "in_progress": 1, "total": 5},
            {"name": "Varstvo pri delu", "required": True, "completed": 5, "in_progress": 0, "total": 5},
            {"name": "Servisna spretnost", "required": False, "completed": 2, "in_progress": 2, "total": 5},
            {"name": "Vodenje ekipe", "required": False, "completed": 1, "in_progress": 1, "total": 5},
        ],
        "compliance_rate": 95,
        "upcoming_deadlines": [
            {"employee": "Luka Petrović", "course": "HACCP", "deadline": "2026-02-01"},
        ],
    }


@router.get("/goals")
def get_employee_goals(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Cilji zaposlenih."""
    return {
        "goals": [
            {"employee": "Ana Novak", "goal": "5.0 ocena strank", "progress": 96, "deadline": "2026-03-31", "status": "on_track"},
            {"employee": "Peter Horvat", "goal": "Zmanjšanje odpadkov 10%", "progress": 65, "deadline": "2026-06-30", "status": "on_track"},
            {"employee": "Maja Kovač", "goal": "Novi tečaj strežbe", "progress": 80, "deadline": "2026-02-28", "status": "on_track"},
        ],
        "total_goals": 3,
        "met_goals": 1,
    }


@router.get("/stats")
def get_employees_stats(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Statistika zaposlenih."""
    return {
        "total_employees": 5,
        "active_employees": 5,
        "avg_performance": 4.68,
        "avg_satisfaction": 91.2,
        "training_compliance": 95,
        "turnover_rate": 8.5,
    }