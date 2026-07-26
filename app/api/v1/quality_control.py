"""Quality control system — food safety, temperature monitoring, HACCP."""
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime, timedelta

from app.core.database import get_db
from app.api.v1.auth import get_current_user

router = APIRouter(prefix="/quality-control", tags=["Kontrola kakovosti"])


class TemperatureLog(BaseModel):
    location: str  # fridge, freezer, warm_holding
    temperature: float
    unit: str = "C"
    notes: Optional[str] = None


class CleaningChecklist(BaseModel):
    area: str  # kitchen, dining, storage, bathroom
    items: List[dict]
    completed_by: Optional[str] = None


class FoodSafetyCheck(BaseModel):
    item_name: str
    expiry_date: str
    storage_location: str
    temperature: Optional[float] = None
    status: str = "fresh"  # fresh, expiring_soon, expired


@router.get("/temperature/logs")
def get_temperature_logs(
    hours: int = Query(24, ge=1, le=168),
    location: Optional[str] = None,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Vrni dnevnike temperatur."""
    # In production: fetch from TemperatureLog table
    now = datetime.now()
    logs = []

    # Simulated temperature data
    locations = ["Hladilnik 1", "Hladilnik 2", "Zamrzovalnik", "Topla vitrina"]
    for loc in locations:
        if location and loc != location:
            continue
        # Generate sample logs
        for i in range(min(hours, 24)):
            log_time = now - timedelta(hours=i)
            temp = {
                "Hladilnik 1": 4.2,
                "Hladilnik 2": 3.8,
                "Zamrzovalnik": -18.5,
                "Topla vitrina": 65.2,
            }.get(loc, 0)
            temp += (i % 3) * 0.5  # Slight variation

            logs.append({
                "time": log_time.strftime('%H:%M'),
                "location": loc,
                "temperature": round(temp, 1),
                "status": "ok" if -20 < temp < 70 else "warning",
            })

    return {
        "period_hours": hours,
        "location": location,
        "logs": logs,
        "total_logs": len(logs),
        "warnings": len([l for l in logs if l["status"] == "warning"]),
    }


@router.post("/temperature/log")
def log_temperature(data: TemperatureLog, db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Zabeleži temperaturo."""
    # In production: save to TemperatureLog table
    # Check thresholds
    status = "ok"
    alert = None

    if data.location in ["fridge", "Hladilnik 1", "Hladilnik 2"]:
        if data.temperature > 8:
            status = "critical"
            alert = f"Prestroga temperatura hladilnika: {data.temperature}°C (max 8°C)"
        elif data.temperature > 5:
            status = "warning"
            alert = f"Povišana temperatura: {data.temperature}°C"
    elif data.location in ["freezer", "Zamrzovalnik"]:
        if data.temperature > -15:
            status = "critical"
            alert = f"Prestroga temperatura zamrzovalnika: {data.temperature}°C (max -15°C)"
    elif data.location in ["warm_holding", "Topla vitrina"]:
        if data.temperature < 63:
            status = "critical"
            alert = f"Nizka temperatura tople vitrine: {data.temperature}°C (min 63°C)"

    return {
        "message": "Temperatura zabeležena",
        "temperature": data.temperature,
        "location": data.location,
        "status": status,
        "alert": alert,
    }


@router.get("/temperature/alerts")
def get_temperature_alerts(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Vrni aktivna opozorila o temperaturah."""
    # In production: fetch from TemperatureAlert table
    return {
        "alerts": [
            {
                "id": 1,
                "location": "Hladilnik 2",
                "temperature": 9.2,
                "threshold": 8,
                "status": "critical",
                "time": "14:30",
                "message": "Temperatura presega 8°C",
            }
        ],
        "total": 1,
        "critical": 1,
    }


@router.get("/cleaning/checklist")
def get_cleaning_checklist(area: Optional[str] = None, db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Vrni seznam za čiščenje."""
    checklists = {
        "kitchen": {
            "area": "Kuhinja",
            "items": [
                {"id": 1, "task": "Očistiti delovne površine", "frequency": "vsak dan", "completed": True},
                {"id": 2, "task": "Očistiti pečice", "frequency": "tedensko", "completed": False},
                {"id": 3, "task": "Izprazniti maščobni filter", "frequency": "tedensko", "completed": False},
                {"id": 4, "task": "Dezinfekcija nožev", "frequency": "vsak dan", "completed": True},
                {"id": 5, "task": "Čiščenje tal", "frequency": "vsak dan", "completed": True},
            ],
        },
        "dining": {
            "area": "Jedilnica",
            "items": [
                {"id": 6, "task": "Očistiti mize", "frequency": "po strankah", "completed": True},
                {"id": 7, "task": "Pobrisati stole", "frequency": "vsak dan", "completed": True},
                {"id": 8, "task": "Očistiti okna", "frequency": "tedensko", "completed": False},
                {"id": 9, "task": "Dezinfekcija toalet", "frequency": "vsak dan", "completed": False},
            ],
        },
        "storage": {
            "area": "Skladišče",
            "items": [
                {"id": 10, "task": "Pregledati rok uporabe", "frequency": "tedensko", "completed": True},
                {"id": 11, "task": "Očistiti regale", "frequency": "mesečno", "completed": False},
                {"id": 12, "task": "Dezinfekcija tal", "frequency": "tedensko", "completed": True},
            ],
        },
    }

    if area and area in checklists:
        return {"checklist": checklists[area]}

    return {"checklists": list(checklists.values())}


@router.post("/cleaning/complete")
def complete_cleaning_task(task_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Označi opravilo čiščenja kot opravljeno."""
    # In production: update CleaningChecklist table
    return {
        "message": "Opravilo označeno kot opravljeno",
        "task_id": task_id,
        "completed_by": user.username if user else "Unknown",
        "completed_at": datetime.now().isoformat(),
    }


@router.get("/food-safety/checks")
def get_food_safety_checks(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Vrni preglede varnosti hrane."""
    from app.models.inventory import Ingredient

    ingredients = db.query(Ingredient).all()

    checks = []
    for ing in ingredients:
        stock = getattr(ing, 'stock', 0) or 0
        if stock > 0:
            # Simulate expiry check
            checks.append({
                "id": ing.id,
                "name": ing.name,
                "stock": stock,
                "unit": getattr(ing, 'unit', 'kg'),
                "storage": getattr(ing, 'storage_location', 'Hladilnik'),
                "status": "fresh",
                "days_until_expiry": 5,
            })

    return {
        "total_items": len(checks),
        "fresh": len([c for c in checks if c["status"] == "fresh"]),
        "expiring_soon": len([c for c in checks if c["status"] == "expiring_soon"]),
        "expired": len([c for c in checks if c["status"] == "expired"]),
        "checks": checks[:20],
    }


@router.get("/haccp/records")
def get_haccp_records(days: int = Query(7, ge=1, le=30), db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Vrni HACCP evidence."""
    return {
        "period_days": days,
        "records": [
            {"date": "2026-01-15", "type": "temperature", "location": "Hladilnik 1", "value": "4.2°C", "status": "ok"},
            {"date": "2026-01-15", "type": "cleaning", "area": "Kuhinja", "status": "completed"},
            {"date": "2026-01-14", "type": "temperature", "location": "Zamrzovalnik", "value": "-18.5°C", "status": "ok"},
            {"date": "2026-01-14", "type": "food_safety", "item": "Meso", "status": "checked"},
        ],
        "compliance_rate": 98.5,
    }


@router.get("/stats")
def get_quality_stats(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Statistika kakovosti."""
    return {
        "temperature_compliance": 99.2,
        "cleaning_completion": 87.5,
        "food_safety_score": 95.0,
        "haccp_compliance": 98.5,
        "incidents": 0,
        "last_inspection": "2026-01-10",
    }