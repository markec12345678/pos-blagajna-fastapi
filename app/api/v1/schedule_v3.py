from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.v1.auth import get_current_user

router = APIRouter(prefix="/schedule-v3", tags=["schedule-v3"])

@router.get("/demand-forecast")
def get_demand_forecast(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"forecast": [
        {"day": "Pon", "date": "2025-07-07", "expected_orders": 180, "peak_hours": ["12:00-13:00", "19:00-20:00"], "staff_needed": {"kitchen": 3, "service": 4, "bar": 1}},
        {"day": "Tor", "date": "2025-07-08", "expected_orders": 200, "peak_hours": ["19:00-20:00"], "staff_needed": {"kitchen": 3, "service": 4, "bar": 1}},
        {"day": "Sre", "date": "2025-07-09", "expected_orders": 220, "peak_hours": ["12:00-13:00", "19:00-21:00"], "staff_needed": {"kitchen": 4, "service": 5, "bar": 1}},
        {"day": "Čet", "date": "2025-07-10", "expected_orders": 250, "peak_hours": ["19:00-21:00"], "staff_needed": {"kitchen": 4, "service": 5, "bar": 2}},
        {"day": "Pet", "date": "2025-07-11", "expected_orders": 350, "peak_hours": ["18:00-21:00"], "staff_needed": {"kitchen": 5, "service": 6, "bar": 2}},
        {"day": "Sob", "date": "2025-07-12", "expected_orders": 380, "peak_hours": ["18:00-21:00"], "staff_needed": {"kitchen": 5, "service": 7, "bar": 2}},
        {"day": "Ned", "date": "2025-07-13", "expected_orders": 270, "peak_hours": ["12:00-14:00"], "staff_needed": {"kitchen": 4, "service": 5, "bar": 1}},
    ], "total_expected": 1850, "labor_cost_est": 8500}

@router.get("/shift-optimization")
def get_shift_optimization(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"optimization": {
        "current_schedule": {"total_hours": 320, "labor_cost": 8500, "coverage_gaps": 2, "overtime_hours": 12},
        "optimized_schedule": {"total_hours": 305, "labor_cost": 7900, "coverage_gaps": 0, "overtime_hours": 4},
        "savings": {"hours": 15, "cost": 600, "overtime_reduction": 67},
        "recommendations": [
            "Zmanjšaj popoldansko izmeno v ponedeljek za 2 uri",
            "Dodaj dodatnega kuharja v petek zvečer",
            "Preloži Saro Z. na jutranjo izmeno v soboto",
            "Zamenjaj Luka K. in Marko P. v četrtek",
        ]
    }}

@router.get("/employee-availability")
def get_employee_availability(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"employees": [
        {"name": "Ana K.", "role": "Natakar", "hours_this_week": 32, "max_hours": 40, "preferred_shifts": ["jutro", "popoldne"], "time_off": [], "overtime_available": 8},
        {"name": "Marko P.", "role": "Natakar", "hours_this_week": 28, "max_hours": 40, "preferred_shifts": ["večer"], "time_off": ["2025-07-12"], "overtime_available": 12},
        {"name": "Luka Z.", "role": "Kuhar", "hours_this_week": 35, "max_hours": 45, "preferred_shifts": ["jutro", "večer"], "time_off": [], "overtime_available": 10},
        {"name": "Sara M.", "role": "Natakar", "hours_this_week": 25, "max_hours": 35, "preferred_shifts": ["popoldne", "večer"], "time_off": ["2025-07-10"], "overtime_available": 10},
        {"name": "Peter K.", "role": "Kuhar", "hours_this_week": 30, "max_hours": 45, "preferred_shifts": ["jutro"], "time_off": [], "overtime_available": 15},
    ]}

@router.get("/skill-matrix")
def get_skill_matrix(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"matrix": [
        {"employee": "Ana K.", "skills": {"blagajna": 5, "strežba": 4, "vino": 3, "organizacija": 4}, "certifications": ["HACCP", "VARNO"], "flexibility": "visoka"},
        {"employee": "Marko P.", "skills": {"blagajna": 4, "strežba": 5, "vino": 4, "organizacija": 3}, "certifications": ["HACCP"], "flexibility": "srednja"},
        {"employee": "Luka Z.", "skills": {"kuhinja": 5, "pizza": 5, "sladice": 4, "vegan": 3}, "certifications": ["HACCP", "VARNO"], "flexibility": "nizka"},
        {"employee": "Sara M.", "skills": {"blagajna": 3, "strežba": 4, "vino": 2, "organizacija": 3}, "certifications": [], "flexibility": "visoka"},
        {"employee": "Peter K.", "skills": {"kuhinja": 4, "pizza": 3, "sladice": 5, "vegan": 4}, "certifications": ["HACCP"], "flexibility": "srednja"},
    ]}

@router.get("/compliance")
def get_compliance(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"compliance": {
        "max_weekly_hours": 40,
        "min_rest_hours": 12,
        "overtime_limit": 8,
        "break_rules": {"min_break_after": 6, "break_duration": 30},
        "violations": [
            {"employee": "Luka Z.", "type": "overtime", "hours": 45, "limit": 45, "status": "at_limit"},
            {"employee": "Marko P.", "type": "rest_period", "detail": "10h namesto 12h", "status": "warning"},
        ],
        "compliance_score": 92
    }}

@router.get("/cost-analysis")
def get_cost_analysis(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"costs": {
        "total_labor_cost": 8500,
        "regular_hours_cost": 7200,
        "overtime_cost": 1300,
        "cost_per_order": 4.59,
        "cost_per_hour": 26.56,
        "by_role": [
            {"role": "Natakar", "hours": 160, "cost": 3200, "percentage": 37.6},
            {"role": "Kuhar", "hours": 120, "cost": 3600, "percentage": 42.4},
            {"role": "Bar", "hours": 40, "cost": 960, "percentage": 11.3},
            {"role": "Vodja", "hours": 20, "cost": 740, "percentage": 8.7},
        ],
        "trend": [
            {"month": "Jan", "cost": 8000},
            {"month": "Feb", "cost": 7800},
            {"month": "Mar", "cost": 8200},
            {"month": "Apr", "cost": 8100},
            {"month": "Maj", "cost": 8300},
            {"month": "Jun", "cost": 8500},
        ]
    }}

@router.get("/swap-requests")
def get_swap_requests(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"swaps": [
        {"id": 1, "requester": "Ana K.", "target": "Sara M.", "date": "2025-07-12", "shift": "večer", "status": "pending", "reason": "Osebni razlogi"},
        {"id": 2, "requester": "Marko P.", "target": "Ana K.", "date": "2025-07-15", "shift": "jutro", "status": "approved", "reason": "Zdravniški pregled"},
        {"id": 3, "requester": "Sara M.", "target": "Marko P.", "date": "2025-07-18", "shift": "popoldne", "status": "pending", "reason": "Družinski dogodek"},
    ]}

@router.get("/template-usage")
def get_template_usage(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"templates": [
        {"name": "Standardni teden", "usage_count": 24, "avg_satisfaction": 4.2, "coverage": 95, "last_used": "2025-06-30"},
        {"name": "Poletni urnik", "usage_count": 8, "avg_satisfaction": 4.5, "coverage": 100, "last_used": "2025-06-28"},
        {"name": "Prazniki", "usage_count": 4, "avg_satisfaction": 4.0, "coverage": 90, "last_used": "2025-05-01"},
        {"name": "Minimalni teden", "usage_count": 2, "avg_satisfaction": 3.5, "coverage": 80, "last_used": "2025-04-15"},
    ]}
