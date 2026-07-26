from fastapi import APIRouter
router = APIRouter(prefix="/staff-v5", tags=["Staff V5"])

@router.get("/skills")
def skills_matrix():
    return {
        "total_skills": 24,
        "staff_count": 12,
        "matrix": [
            {"staff": "Ana B.", "skills": ["Kuhanje", "Vodenje", "HACCP", "Alergeni"], "level": 5, "gaps": []},
            {"staff": "Marko H.", "skills": ["Kuhanje", "HACCP"], "level": 4, "gaps": ["Vodenje", "Napredno kuhanje"]},
            {"staff": "Sara M.", "skills": ["Postrežba", "Vino", "Alergeni"], "level": 4, "gaps": ["Kuhanje"]},
            {"staff": "Luka K.", "skills": ["Pomoč"], "level": 3, "gaps": ["Postrežba", "HACCP", "Vodenje"]},
        ],
        "skill_gaps": ["Vodenje", "Napredno kuhanje", "Vino"],
        "coverage_rate": 72
    }

@router.get("/training-paths")
def training_paths():
    return {
        "paths": [
            {"name": "Novinec → Natakar", "steps": 4, "duration_weeks": 6, "progress": [
                {"step": "Osnove postrežbe", "status": "completed"},
                {"step": "Meni in alergeni", "status": "completed"},
                {"step": "Vino in pijače", "status": "in_progress"},
                {"step": "Napredna storitev", "status": "pending"},
            ]},
            {"name": "Natakar → Vodja", "steps": 5, "duration_weeks": 12, "progress": [
                {"step": "Vodenje ekipe", "status": "in_progress"},
                {"step": "Blagajna", "status": "pending"},
                {"step": "Naročila", "status": "pending"},
                {"step": "Kadri", "status": "pending"},
                {"step": "Marketing", "status": "pending"},
            ]},
        ]
    }

@router.get("/performance-reviews")
def performance_reviews():
    return {
        "due_this_month": 3,
        "completed": 9,
        "reviews": [
            {"staff": "Ana B.", "date": "2026-07-20", "score": 4.8, "status": "due", "areas": ["Kuhanje", "Vodenje"]},
            {"staff": "Marko H.", "date": "2026-07-22", "score": 4.5, "status": "due", "areas": ["Kuhanje", "Timsko delo"]},
            {"staff": "Sara M.", "date": "2026-07-25", "score": 4.6, "status": "due", "areas": ["Postrežba", "Komunikacija"]},
        ],
        "avg_score_all": 4.3,
        "improvement_areas": ["Timsko delo", "Upravljanje časa"]
    }

@router.get("/labor-optimization")
def labor_optimization():
    return {
        "current_cost_week": 8400.00,
        "optimized_cost_week": 7900.00,
        "saving_week": 500.00,
        "recommendations": [
            {"title": "Preuredi urno soboto", "saving": 200, "impact": "Minimalen vpliv na storitev"},
            {"title": "Zmanjaj 1 uro ob 14:00", "saving": 120, "impact": "Manjša zasedenost"},
            {"title": "Preloži 1 zaposlenega na petek", "saving": 180, "impact": "Izboljšanje pokritosti"},
        ],
        "peak_hours": ["12:00-13:00", "19:00-21:00"],
        "off_peak_hours": ["14:00-17:00"]
    }
