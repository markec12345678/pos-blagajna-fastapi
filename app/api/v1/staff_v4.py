from fastapi import APIRouter
router = APIRouter(prefix="/staff-v4", tags=["Staff V4"])

@router.get("/training")
def training():
    return {
        "total_staff": 12,
        "completed_training": 10,
        "pending_training": 2,
        "courses": [
            {"name": "Higiena in varnost", "required": True, "completed": 12, "expires": "2027-01-15"},
            {"name": "ALCG (Alergeni)", "required": True, "completed": 11, "expires": "2026-12-01"},
            {"name": "Varnost požara", "required": True, "completed": 10, "expires": "2026-11-15"},
            {"name": "Vodenje ekipe", "required": False, "completed": 4, "expires": None},
            {"name": "Napredno kuhanje", "required": False, "completed": 3, "expires": None},
        ],
        "upcoming": [
            {"staff": "Luka K.", "course": "ALCG", "deadline": "2026-08-15"},
            {"staff": "Maja P.", "course": "Varnost požara", "deadline": "2026-08-30"},
        ]
    }

@router.get("/performance")
def performance():
    return {
        "reviews_due": 3,
        "avg_score": 4.2,
        "staff": [
            {"name": "Ana B.", "role": "Kuharica", "score": 4.8, "punctuality": 98, "efficiency": 95, "customer_rating": 4.7},
            {"name": "Marko H.", "role": "Kuhar", "score": 4.5, "punctuality": 92, "efficiency": 88, "customer_rating": 4.5},
            {"name": "Luka K.", "role": "Pomočnik", "score": 4.2, "punctuality": 95, "efficiency": 85, "customer_rating": 4.3},
            {"name": "Sara M.", "role": "Natakarica", "score": 4.6, "punctuality": 97, "efficiency": 92, "customer_rating": 4.8},
            {"name": "Jana Z.", "role": "Natakarica", "score": 4.1, "punctuality": 88, "efficiency": 82, "customer_rating": 4.2},
        ]
    }

@router.get("/scheduling")
def scheduling_optimization():
    return {
        "current_week_hours": {"scheduled": 420, "required": 400, "overtime": 20},
        "labor_cost_week": 8400.00,
        "cost_per_cover": 5.80,
        "recommendations": [
            {"title": "Zmanjaj urno soboto 14:00-18:00", "saving": 120, "impact": "Minimalen"},
            {"title": "Dodaj Luka petek 18:00-22:00", "saving": -80, "impact": "Izboljšanje storitve"},
            {"title": "Preuredi nedeljo", "saving": 200, "impact": "Manjše čakanje"},
        ],
        "peak_staffing": {"day": "Sobota", "hours": "19:00-21:00", "staff_needed": 8, "staff_current": 7}
    }

@router.get("/absences")
def absences():
    return {
        "active": 1,
        "upcoming": 2,
        "absences": [
            {"staff": "Jana Z.", "type": "Bolniška", "start": "2026-07-15", "end": "2026-07-18", "status": "active"},
            {"staff": "Marko H.", "type": "Dopust", "start": "2026-07-20", "end": "2026-07-25", "status": "upcoming"},
            {"staff": "Luka K.", "type": "Dopust", "start": "2026-08-01", "end": "2026-08-05", "status": "upcoming"},
        ],
        "absence_rate": 3.2
    }
