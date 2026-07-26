from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.v1.auth import get_current_user

router = APIRouter(prefix="/staff-v6", tags=["staff-v6"])

@router.get("/performance-scorecard")
def get_performance_scorecard(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"scorecard": [
        {"employee": "Luka Z.", "role": "Vodja", "sales": 1850, "upsells": 42, "customer_rating": 4.8, "punctuality": 98, "efficiency": 92, "overall_score": 95, "trend": "up", "bonuses_earned": 180},
        {"employee": "Ana K.", "role": "Natakarica", "sales": 1420, "upsells": 28, "customer_rating": 4.6, "punctuality": 95, "efficiency": 88, "overall_score": 91, "trend": "stable", "bonuses_earned": 120},
        {"employee": "Peter K.", "role": "Kuhar", "sales": 0, "upsells": 0, "customer_rating": 4.5, "punctuality": 88, "efficiency": 85, "overall_score": 82, "trend": "down", "bonuses_earned": 0},
        {"employee": "Sara M.", "role": "Natakarica", "sales": 1180, "upsells": 22, "customer_rating": 4.4, "punctuality": 92, "efficiency": 86, "overall_score": 87, "trend": "up", "bonuses_earned": 80},
        {"employee": "Maja P.", "role": "Kuharica", "sales": 0, "upsells": 0, "customer_rating": 4.7, "punctuality": 96, "efficiency": 90, "overall_score": 88, "trend": "up", "bonuses_earned": 0},
    ], "team_avg": 88.6, "top_performer": "Luka Z."}

@router.get("/training-progress")
def get_training_progress(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"training": [
        {"employee": "Luka Z.", "courses": [
            {"name": "Varnost hrane", "status": "completed", "completed": "2025-06-15", "score": 95},
            {"name": "Vodenje ekipe", "status": "completed", "completed": "2025-06-20", "score": 92},
            {"name": "Napredni POS", "status": "in_progress", "progress": 75, "deadline": "2025-07-31"},
        ], "total_hours": 24, "certifications": 3},
        {"employee": "Ana K.", "courses": [
            {"name": "Varnost hrane", "status": "completed", "completed": "2025-06-15", "score": 88},
            {"name": "Postrežba", "status": "completed", "completed": "2025-06-25", "score": 90},
            {"name": "Alkoholni napitki", "status": "in_progress", "progress": 60, "deadline": "2025-08-15"},
        ], "total_hours": 18, "certifications": 2},
    ], "pending_completions": 3, "upcoming_deadlines": 2}

@router.get("/shift-coverage")
def get_shift_coverage(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"coverage": {
        "this_week": [
            {"day": "Pon", "kitchen": 3, "service": 2, "total": 5, "optimal": 5, "status": "ok"},
            {"day": "Tor", "kitchen": 3, "service": 2, "total": 5, "optimal": 5, "status": "ok"},
            {"day": "Sre", "kitchen": 3, "service": 3, "total": 6, "optimal": 6, "status": "ok"},
            {"day": "Čet", "kitchen": 3, "service": 2, "total": 5, "optimal": 6, "status": "understaffed"},
            {"day": "Pet", "kitchen": 4, "service": 4, "total": 8, "optimal": 8, "status": "ok"},
            {"day": "Sob", "kitchen": 5, "service": 5, "total": 10, "optimal": 10, "status": "ok"},
            {"day": "Ned", "kitchen": 4, "service": 3, "total": 7, "optimal": 7, "status": "ok"},
        ],
        "understaffed_days": 1,
        "overstaffed_days": 0,
        "coverage_rate": 97.6
    }}

@router.get("/employee-wellness")
def get_employee_wellness(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"wellness": [
        {"employee": "Luka Z.", "overtime_hours": 5, "days_since_rest": 2, "burnout_risk": "low", "mood_score": 8.5, "satisfaction": 92, "stress_level": "low"},
        {"employee": "Ana K.", "overtime_hours": 3, "days_since_rest": 1, "burnout_risk": "low", "mood_score": 8.0, "satisfaction": 88, "stress_level": "low"},
        {"employee": "Peter K.", "overtime_hours": 8, "days_since_rest": 0, "burnout_risk": "medium", "mood_score": 6.5, "satisfaction": 75, "stress_level": "medium"},
        {"employee": "Sara M.", "overtime_hours": 2, "days_since_rest": 3, "burnout_risk": "low", "mood_score": 7.8, "satisfaction": 85, "stress_level": "low"},
        {"employee": "Maja P.", "overtime_hours": 4, "days_since_rest": 2, "burnout_risk": "low", "mood_score": 8.2, "satisfaction": 90, "stress_level": "low"},
    ], "team_avg_satisfaction": 86, "team_avg_mood": 7.8}

@router.get("/payroll-summary")
def get_payroll_summary(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"payroll": [
        {"employee": "Luka Z.", "hours_worked": 40, "hourly_rate": 14.50, "base_pay": 580, "overtime": 72.50, "bonus": 180, "deductions": 145, "net_pay": 687.50},
        {"employee": "Ana K.", "hours_worked": 32, "hourly_rate": 11.00, "base_pay": 352, "overtime": 33, "bonus": 120, "deductions": 112.75, "net_pay": 392.25},
        {"employee": "Peter K.", "hours_worked": 40, "hourly_rate": 13.00, "base_pay": 520, "overtime": 104, "bonus": 0, "deductions": 131.60, "net_pay": 492.40},
        {"employee": "Sara M.", "hours_worked": 28, "hourly_rate": 10.50, "base_pay": 294, "overtime": 0, "bonus": 80, "deductions": 93.45, "net_pay": 280.55},
        {"employee": "Maja P.", "hours_worked": 36, "hourly_rate": 12.00, "base_pay": 432, "overtime": 48, "bonus": 0, "deductions": 115.20, "net_pay": 364.80},
    ], "total_gross": 2380, "total_deductions": 598, "total_net": 2217.50, "payroll_date": "2025-07-25"}

@router.get("/team-utilization")
def get_team_utilization(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"utilization": [
        {"employee": "Luka Z.", "role": "Vodja", "scheduled_hours": 40, "productive_hours": 36.8, "idle_hours": 3.2, "utilization": 92, "break_compliance": 100},
        {"employee": "Ana K.", "role": "Natakarica", "scheduled_hours": 32, "productive_hours": 28.2, "idle_hours": 3.8, "utilization": 88, "break_compliance": 100},
        {"employee": "Peter K.", "role": "Kuhar", "scheduled_hours": 40, "productive_hours": 34.0, "idle_hours": 6.0, "utilization": 85, "break_compliance": 95},
        {"employee": "Sara M.", "role": "Natakarica", "scheduled_hours": 28, "productive_hours": 24.1, "idle_hours": 3.9, "utilization": 86, "break_compliance": 100},
        {"employee": "Maja P.", "role": "Kuharica", "scheduled_hours": 36, "productive_hours": 32.4, "idle_hours": 3.6, "utilization": 90, "break_compliance": 100},
    ], "team_utilization": 88.2, "optimal_range": [85, 95]}

@router.get("/skill-gaps")
def get_skill_gaps(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"gaps": [
        {"skill": "Napredno vodenje", "required": 90, "current_team_avg": 72, "gap": 18, "priority": "high", "affected": ["Luka Z."]},
        {"skill": "Delo z alergijami", "required": 85, "current_team_avg": 68, "gap": 17, "priority": "high", "affected": ["Peter K.", "Maja P."]},
        {"skill": "Upselling", "required": 80, "current_team_avg": 65, "gap": 15, "priority": "medium", "affected": ["Ana K.", "Sara M."]},
        {"skill": "HACCP", "required": 85, "current_team_avg": 78, "gap": 7, "priority": "medium", "affected": ["Peter K."]},
        {"skill": "Osnove računalništva", "required": 70, "current_team_avg": 60, "gap": 10, "priority": "low", "affected": ["Peter K."]},
    ], "training_budget_needed": 2400}
