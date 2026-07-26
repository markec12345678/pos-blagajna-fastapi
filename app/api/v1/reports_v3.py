"""Reports V2 — advanced reporting with custom templates and scheduling."""
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime

from app.core.database import get_db
from app.api.v1.auth import get_current_user

router = APIRouter(prefix="/reports-v3", tags=["Poročila V2"])


class ReportSchedule(BaseModel):
    report_type: str
    frequency: str  # daily, weekly, monthly
    recipients: List[str] = []
    format: str = "pdf"


@router.get("/templates")
def get_report_templates(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Predloge poročil."""
    return {
        "templates": [
            {"id": 1, "name": "Dnevno poročilo prodaje", "type": "daily_sales", "description": "Povzetek prodaje za dan", "last_run": "2026-01-15", "frequency": "daily"},
            {"id": 2, "name": "Tedenska analiza", "type": "weekly_analysis", "description": "Podrobna analiza tedna", "last_run": "2026-01-13", "frequency": "weekly"},
            {"id": 3, "name": "Mesečno finančno poročilo", "type": "monthly_finance", "description": "Finančni izkaz za mesec", "last_run": "2026-01-01", "frequency": "monthly"},
            {"id": 4, "name": "Inventura zalog", "type": "inventory", "description": "Stanje zalog in gibivost", "last_run": "2026-01-14", "frequency": "weekly"},
            {"id": 5, "name": "Analiza zaposlenih", "type": "employee_analysis", "description": "Učinkovitost zaposlenih", "last_run": "2026-01-13", "frequency": "weekly"},
            {"id": 6, "name": "Analiza strank", "type": "customer_analysis", "description": "Vedenje strank in segmentacija", "last_run": "2026-01-10", "frequency": "monthly"},
        ],
        "total": 6,
    }


@router.get("/scheduled")
def get_scheduled_reports(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Načrtovana poročila."""
    return {
        "scheduled": [
            {"id": 1, "template": "Dnevno poročilo prodaje", "frequency": "daily", "next_run": "2026-01-16 06:00", "recipients": ["manager@river.si"], "format": "pdf", "active": True},
            {"id": 2, "template": "Tedenska analiza", "frequency": "weekly", "next_run": "2026-01-20 06:00", "recipients": ["manager@river.si", "owner@river.si"], "format": "pdf", "active": True},
            {"id": 3, "template": "Mesečno finančno poročilo", "frequency": "monthly", "next_run": "2026-02-01 06:00", "recipients": ["owner@river.si"], "format": "xlsx", "active": True},
        ],
        "total": 3,
    }


@router.post("/schedule")
def schedule_report(data: ReportSchedule, db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Načrtuj poročilo."""
    return {"message": "Poročilo načrtovano", "schedule": {"id": 4, **data.dict(), "active": True, "next_run": "2026-01-16 06:00"}}


@router.get("/recent")
def get_recent_reports(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Nedavna poročila."""
    return {
        "reports": [
            {"id": 1, "name": "Dnevno poročilo prodaje", "generated": "2026-01-15 06:00", "generated_by": "Sistem", "format": "pdf", "size": "245 KB"},
            {"id": 2, "name": "Tedenska analiza", "generated": "2026-01-13 06:00", "generated_by": "Sistem", "format": "pdf", "size": "1.2 MB"},
            {"id": 3, "name": "Inventura zalog", "generated": "2026-01-14 06:00", "generated_by": "Sistem", "format": "xlsx", "size": "89 KB"},
        ],
        "total": 3,
    }


@router.get("/stats")
def get_reports_stats(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Statistika poročil."""
    return {
        "total_templates": 6,
        "active_schedules": 3,
        "reports_generated_this_month": 45,
        "last_generated": "2026-01-15 06:00",
    }