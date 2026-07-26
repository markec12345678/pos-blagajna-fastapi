from fastapi import APIRouter
router = APIRouter(prefix="/reports-v5", tags=["Reports V5"])

@router.get("/templates")
def report_templates():
    return {
        "templates": [
            {"id": 1, "name": "Dnevno poročilo", "category": "Finančno", "frequency": "Dnevno", "last_run": "2026-07-16", "recipients": ["manager@pos.si"], "format": "PDF"},
            {"id": 2, "name": "Tedensko analitiko", "category": "Analitika", "frequency": "Tedensko", "last_run": "2026-07-14", "recipients": ["team@pos.si"], "format": "Excel"},
            {"id": 3, "name": "Mesečno P&L", "category": "Finančno", "frequency": "Mesečno", "last_run": "2026-06-30", "recipients": ["finance@pos.si", "owner@pos.si"], "format": "PDF"},
            {"id": 4, "name": "Zaloge poročilo", "category": "Inventura", "frequency": "Tedensko", "last_run": "2026-07-14", "recipients": ["chef@pos.si"], "format": "Excel"},
            {"id": 5, "name": "Kadrovsko poročilo", "category": "Osebje", "frequency": "Mesečno", "last_run": "2026-06-30", "recipients": ["hr@pos.si"], "format": "PDF"},
        ]
    }

@router.get("/scheduled")
def scheduled_reports():
    return {
        "active": 8,
        "completed_today": 2,
        "upcoming": [
            {"name": "Dnevno poročilo", "next_run": "2026-07-17 06:00", "format": "PDF"},
            {"name": "Tedensko analitiko", "next_run": "2026-07-21 07:00", "format": "Excel"},
            {"name": "Zaloge poročilo", "next_run": "2026-07-21 07:00", "format": "Excel"},
        ],
        "delivery_log": [
            {"time": "2026-07-16 06:00", "report": "Dnevno poročilo", "status": "delivered", "recipient": "manager@pos.si"},
            {"time": "2026-07-16 06:00", "report": "Dnevno poročilo", "status": "delivered", "recipient": "owner@pos.si"},
        ]
    }

@router.get("/distribution")
def distribution():
    return {
        "channels": [
            {"channel": "Email", "count": 45, "pct": 62.5},
            {"channel": "Portal", "count": 18, "pct": 25.0},
            {"channel": "API", "count": 9, "pct": 12.5},
        ],
        "total_reports_sent": 72,
        "avg_delivery_time_sec": 12.4,
        "success_rate": 98.6
    }

@router.get("/custom")
def custom_reports():
    return {
        "recent": [
            {"name": "Poletna analiza", "created": "2026-07-10", "tables": 4, "rows": 245, "author": "Ana"},
            {"name": "Primerjava vej", "created": "2026-07-08", "tables": 6, "rows": 180, "author": "Marko"},
            {"name": "Stroški po dobaviteljih", "created": "2026-07-05", "tables": 3, "rows": 120, "author": "Ana"},
        ],
        "total_custom": 12,
        "most_used_table": "Orders"
    }
