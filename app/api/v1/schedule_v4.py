from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.v1.auth import get_current_user

router = APIRouter(prefix="/schedule-v4", tags=["schedule-v4"])

@router.get("/ai-scheduling")
def get_ai_scheduling(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"ai": {
        "predictions": [
            {"day": "Ponedeljek", "predicted_orders": 45, "confidence": 0.88, "weather": "Sončno", "events": []},
            {"day": "Torek", "predicted_orders": 52, "confidence": 0.85, "weather": "Dež", "events": []},
            {"day": "Sreda", "predicted_orders": 48, "confidence": 0.90, "weather": "Delno oblačno", "events": ["Lokalni sejem"]},
            {"day": "Četrtek", "predicted_orders": 55, "confidence": 0.82, "weather": "Sončno", "events": []},
            {"day": "Petek", "predicted_orders": 78, "confidence": 0.92, "weather": "Sončno", "events": ["Poletni koncert"]},
            {"day": "Sobota", "predicted_orders": 92, "confidence": 0.95, "weather": "Sončno", "events": ["Festival hrane"]},
            {"day": "Nedelja", "predicted_orders": 65, "confidence": 0.87, "weather": "Delno oblačno", "events": ["Brunch"]},
        ],
        "recommended_staffing": [
            {"day": "Ponedeljek", "kitchen": 3, "service": 2, "total": 5},
            {"day": "Torek", "kitchen": 3, "service": 2, "total": 5},
            {"day": "Sreda", "kitchen": 3, "service": 3, "total": 6},
            {"day": "Četrtek", "kitchen": 3, "service": 3, "total": 6},
            {"day": "Petek", "kitchen": 4, "service": 4, "total": 8},
            {"day": "Sobota", "kitchen": 5, "service": 5, "total": 10},
            {"day": "Nedelja", "kitchen": 4, "service": 3, "total": 7},
        ],
        "optimization_score": 87,
        "potential_savings": 450
    }}

@router.get("/labor-cost-optimization")
def get_labor_cost_optimization(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"optimization": {
        "current_weekly_cost": 6200,
        "optimized_cost": 5750,
        "savings": 450,
        "savings_percentage": 7.3,
        "recommendations": [
            {"action": "Zmanjšaj osebje med 15:00-17:00", "saving": 180, "impact": "Nizko", "feasibility": "Visoko"},
            {"action": "Preloži čistilca na jutranjo izmeno", "saving": 120, "impact": "Srednje", "feasibility": "Srednje"},
            {"action": "Uporabi delne delovne čase ob koncu tedna", "saving": 150, "impact": "Nizko", "feasibility": "Visoko"},
        ],
        "overtime_analysis": {"this_week": 12, "last_week": 18, "trend": "down", "cost": 480},
        "break_compliance": {"compliant": 95, "violations": 2, "fine_risk": 0}
    }}

@router.get("/shift-swap-marketplace")
def get_shift_swap_marketplace(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"marketplace": [
        {"id": 1, "employee": "Ana K.", "shift": "Pet 14:00-22:00", "reason": "Osebni razlogi", "posted": "2025-07-12", "offers": [
            {"from": "Sara M.", "available": True, "match_score": 95},
            {"from": "Maja P.", "available": True, "match_score": 88},
        ], "status": "open"},
        {"id": 2, "employee": "Peter K.", "shift": "Sob 8:00-16:00", "reason": "Zdravniški pregled", "posted": "2025-07-13", "offers": [
            {"from": "Luka Z.", "available": True, "match_score": 92},
        ], "status": "open"},
        {"id": 3, "employee": "Sara M.", "shift": "Ned 12:00-20:00", "reason": "Družinski dogodek", "posted": "2025-07-14", "offers": [], "status": "open"},
    ], "stats": {"pending_swaps": 3, "completed_this_month": 8, "avg_fill_time": 2.5}}

@router.get("/attendance-patterns")
def get_attendance_patterns(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"patterns": {
        "employees": [
            {"name": "Luka Z.", "punctuality": 98, "absences": 1, "tardiness": 0, "overtime_hours": 5, "pattern": "Stalen"},
            {"name": "Ana K.", "punctuality": 95, "absences": 2, "tardiness": 1, "overtime_hours": 3, "pattern": "Stalen"},
            {"name": "Peter K.", "punctuality": 88, "absences": 3, "tardiness": 4, "overtime_hours": 8, "pattern": "Nereden"},
            {"name": "Sara M.", "punctuality": 92, "absences": 2, "tardiness": 2, "overtime_hours": 2, "pattern": "Dobro"},
            {"name": "Maja P.", "punctuality": 96, "absences": 1, "tardiness": 1, "overtime_hours": 4, "pattern": "Stalen"},
        ],
        "monthly_trend": {"avg_punctuality": 93.8, "avg_absences": 1.8, "trend": "improving"},
        "alerts": [
            {"employee": "Peter K.", "alert": "3 zamude v zadnjem tednu", "severity": "medium"},
        ]
    }}

@router.get("/seasonal-staffing")
def get_seasonal_staffing(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"seasonal": {
        "current_season": "Poletje",
        "staffing_level": "Povečano",
        "seasonal_staff": [
            {"name": "Poletni študent 1", "role": "Pomočnik", "start": "2025-06-15", "end": "2025-08-31", "hours_per_week": 20, "hourly_rate": 8.50},
            {"name": "Poletni študent 2", "role": "Pomočnik", "start": "2025-07-01", "end": "2025-08-31", "hours_per_week": 16, "hourly_rate": 8.50},
        ],
        "forecast": [
            {"month": "Jul", "base_staff": 8, "seasonal_needed": 2, "total": 10, "cost": 7800},
            {"month": "Avg", "base_staff": 8, "seasonal_needed": 2, "total": 10, "cost": 7800},
            {"month": "Sep", "base_staff": 8, "seasonal_needed": 0, "total": 8, "cost": 6200},
        ],
        "training_progress": {"completed": 2, "in_progress": 0, "pending": 0}
    }}

@router.get("/compliance-dashboard")
def get_compliance_dashboard(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"compliance": {
        "working_hours": {"max_weekly": 40, "avg_weekly": 36.5, "violations": 0, "compliance_rate": 100},
        "break_rules": {"min_break_after": 6, "avg_break": 30, "compliance_rate": 97, "violations": 1},
        "rest_periods": {"min_between_shifts": 11, "avg_between": 13.5, "compliance_rate": 100, "violations": 0},
        "night_shifts": {"max_per_month": 8, "avg_per_month": 3, "compliance_rate": 100, "violations": 0},
        "minors": {"max_daily_hours": 8, "current_minors": 0, "compliance_rate": 100},
        "overtime": {"max_monthly_hours": 20, "avg_monthly_hours": 8, "compliance_rate": 100, "violations": 0},
        "overall_score": 98.3,
        "last_audit": "2025-06-30",
        "next_audit": "2025-09-30"
    }}

@router.get("/employee-scheduling-preferences")
def get_employee_scheduling_preferences(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"preferences": [
        {"employee": "Luka Z.", "preferred_days": ["Pon", "Tor", "Sre", "Čet"], "preferred_hours": "8:00-16:00", "max_hours_per_week": 40, "constraints": ["Ne v petek zvečer"]},
        {"employee": "Ana K.", "preferred_days": ["Pon", "Sre", "Pet", "Sob"], "preferred_hours": "12:00-20:00", "max_hours_per_week": 32, "constraints": []},
        {"employee": "Peter K.", "preferred_days": ["Tor", "Čet", "Pet", "Sob"], "preferred_hours": "14:00-22:00", "max_hours_per_week": 36, "constraints": ["Ne zjutraj"]},
        {"employee": "Sara M.", "preferred_days": ["Sre", "Čet", "Pet", "Sob", "Ned"], "preferred_hours": "16:00-00:00", "max_hours_per_week": 28, "constraints": ["Samo popoldne"]},
    ]}
