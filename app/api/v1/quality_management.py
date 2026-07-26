"""Quality management — HACCP, food safety, temperature monitoring."""
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime, timedelta

from app.core.database import get_db
from app.api.v1.auth import get_current_user

router = APIRouter(prefix="/quality-management", tags=["Upravljanje kakovosti"])


class TemperatureLog(BaseModel):
    location: str
    temperature: float
    unit: str = "C"
    notes: Optional[str] = None


class HACCPCheck(BaseModel):
    area: str
    check_type: str
    value: str
    status: str  # ok, warning, critical
    notes: Optional[str] = None


@router.get("/haccp-plan")
def get_haccp_plan(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """HACCP načrt."""
    return {
        "ccps": [
            {
                "id": 1, "name": "Sprejem mesa",
                "description": "Preverjanje temperature ob prejetju",
                "critical_limit": "0-4°C",
                "monitoring": "Vsak sprejem",
                "corrective_action": "Zavrniti pošiljko",
                "status": "compliant",
            },
            {
                "id": 2, "name": "Shranjevanje mesa",
                "description": "Vzdrževanje temperature v hladilniku",
                "critical_limit": "0-4°C",
                "monitoring": "vsako uro",
                "corrective_action": "Premestiti ali zavreči",
                "status": "compliant",
            },
            {
                "id": 3, "name": "Kuhanje",
                "description": "Doseganje zadostne temperature",
                "critical_limit": "75°C",
                "monitoring": "Vsaka porcija",
                "corrective_action": "Nadaljevati kuhanje",
                "status": "compliant",
            },
            {
                "id": 4, "name": "Ohlajanje",
                "description": "Hitro ohlajanje kuhane hrane",
                "critical_limit": "60°C do 10°C v 2 urah",
                "monitoring": "vsako uro",
                "corrective_action": "Zavreči",
                "status": "compliant",
            },
            {
                "id": 5, "name": "Ponovno segrevanje",
                "description": "Segrevanje na 75°C",
                "critical_limit": "75°C",
                "monitoring": "Vsaka porcija",
                "corrective_action": "Zavreči",
                "status": "compliant",
            },
        ],
        "last_audit": "2026-01-10",
        "next_audit": "2026-02-10",
        "compliance_rate": 100.0,
    }


@router.get("/temperature-monitoring")
def get_temperature_monitoring(
    hours: int = Query(24, ge=1, le=168),
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Nadzor temperatur."""
    return {
        "period_hours": hours,
        "locations": [
            {
                "name": "Hladilnik 1",
                "current_temp": 3.8,
                "min_temp": 3.2,
                "max_temp": 4.5,
                "avg_temp": 3.9,
                "status": "ok",
                "last_check": "2026-01-15 14:30",
            },
            {
                "name": "Hladilnik 2",
                "current_temp": 4.2,
                "min_temp": 3.5,
                "max_temp": 5.0,
                "avg_temp": 4.1,
                "status": "ok",
                "last_check": "2026-01-15 14:30",
            },
            {
                "name": "Zamrzovalnik",
                "current_temp": -18.5,
                "min_temp": -20.0,
                "max_temp": -17.0,
                "avg_temp": -18.2,
                "status": "ok",
                "last_check": "2026-01-15 14:30",
            },
            {
                "name": "Topla vitrina",
                "current_temp": 65.2,
                "min_temp": 63.0,
                "max_temp": 68.0,
                "avg_temp": 65.5,
                "status": "ok",
                "last_check": "2026-01-15 14:30",
            },
        ],
        "alerts": 0,
        "compliance_rate": 100.0,
    }


@router.post("/temperature/log")
def log_temperature(data: TemperatureLog, db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Zabeleži temperaturo."""
    # In production: save to TemperatureLog table
    status = "ok"
    alert = None

    if "Hladilnik" in data.location:
        if data.temperature > 8:
            status = "critical"
            alert = f"Prestroga temperatura: {data.temperature}°C"
        elif data.temperature > 5:
            status = "warning"
            alert = f"Povišana temperatura: {data.temperature}°C"
    elif "Zamrzovalnik" in data.location:
        if data.temperature > -15:
            status = "critical"
            alert = f"Prestroga temperatura: {data.temperature}°C"
    elif "Topla vitrina" in data.location:
        if data.temperature < 63:
            status = "critical"
            alert = f"Nizka temperatura: {data.temperature}°C"

    return {
        "message": "Temperatura zabeležena",
        "location": data.location,
        "temperature": data.temperature,
        "status": status,
        "alert": alert,
    }


@router.get("/cleaning-schedule")
def get_cleaning_schedule(
    date: Optional[str] = None,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Urnik čiščenja."""
    return {
        "date": date or datetime.now().strftime('%Y-%m-%d'),
        "tasks": [
            {
                "id": 1, "area": "Kuhinja",
                "task": "Čiščenje delovnih površin",
                "frequency": "dnevno", "time": "06:00",
                "assigned_to": "Marija", "status": "completed",
            },
            {
                "id": 2, "area": "Kuhinja",
                "task": "Čiščenje pečic",
                "frequency": "tedensko", "time": "07:00",
                "assigned_to": "Marko", "status": "in_progress",
            },
            {
                "id": 3, "area": "Jedilnica",
                "task": "Dezinfekcija miz",
                "frequency": "dnevno", "time": "08:00",
                "assigned_to": "Peter", "status": "pending",
            },
            {
                "id": 4, "area": "Skladišče",
                "task": "Pregled polic",
                "frequency": "tedensko", "time": "09:00",
                "assigned_to": "Janez", "status": "pending",
            },
        ],
        "completed": 1,
        "pending": 3,
        "completion_rate": 25.0,
    }


@router.get("/food-safety-checks")
def get_food_safety_checks(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Pregledi varnosti hrane."""
    return {
        "checks": [
            {
                "id": 1, "item": "Mleko",
                "expiry_date": "2026-01-18",
                "days_until_expiry": 3,
                "storage_temp": 4.0,
                "status": "ok",
                "action": "Porabiti v 3 dneh",
            },
            {
                "id": 2, "item": "Jabolka",
                "expiry_date": "2026-01-20",
                "days_until_expiry": 5,
                "storage_temp": 4.2,
                "status": "ok",
                "action": "Porabiti v 5 dneh",
            },
            {
                "id": 3, "item": "Kruh",
                "expiry_date": "2026-01-17",
                "days_until_expiry": 2,
                "storage_temp": 20.0,
                "status": "warning",
                "action": "Porabiti takoj",
            },
        ],
        "total_checks": 3,
        "passed": 2,
        "warnings": 1,
        "failed": 0,
    }


@router.get("/audit-trail")
def get_audit_trail(
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Sledenje revizijam."""
    return {
        "period_days": days,
        "audits": [
            {
                "id": 1, "type": "HACCP",
                "date": "2026-01-10", "auditor": "Inšpektor",
                "result": "passed", "findings": 0,
                "notes": "Vse v skladu s predpisi",
            },
            {
                "id": 2, "type": "Notranji pregled",
                "date": "2026-01-05", "auditor": "Janez Novak",
                "result": "passed", "findings": 2,
                "notes": "Manjše pripombe glede čiščenja",
            },
            {
                "id": 3, "type": "Temperature check",
                "date": "2026-01-15", "auditor": "Sistem",
                "result": "passed", "findings": 0,
                "notes": "Vse temperature v normi",
            },
        ],
        "total_audits": 3,
        "passed": 3,
        "findings": 2,
        "compliance_rate": 100.0,
    }


@router.get("/incidents")
def list_incidents(
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Incidenti."""
    return {
        "incidents": [
            {
                "id": 1, "type": "temperature",
                "description": "Povišana temperatura v hladilniku",
                "date": "2026-01-12", "severity": "medium",
                "status": "resolved", "resolved_by": "Janez",
                "resolution": "Odpravljena okvara hladilnika",
            },
            {
                "id": 2, "type": "contamination",
                "description": "Križna kontaminacija",
                "date": "2026-01-08", "severity": "high",
                "status": "resolved", "resolved_by": "Marija",
                "resolution": "Zavrženi izdelki, očiščena površina",
            },
        ],
        "total": 2,
        "resolved": 2,
        "open": 0,
        "avg_resolution_time": 2.5,
    }


@router.get("/stats")
def get_quality_stats(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Statistika kakovosti."""
    return {
        "haccp_compliance": 100.0,
        "temperature_compliance": 100.0,
        "cleaning_completion": 87.5,
        "food_safety_score": 95.0,
        "total_audits": 3,
        "passed_audits": 3,
        "incidents": 2,
        "resolved_incidents": 2,
        "last_audit": "2026-01-10",
        "next_audit": "2026-02-10",
    }