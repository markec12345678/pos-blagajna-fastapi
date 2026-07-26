from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.v1.auth import get_current_user

router = APIRouter(prefix="/quality-v4", tags=["quality-v4"])

@router.get("/food-safety")
def get_food_safety(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"safety": {
        "compliance_score": 96,
        "last_inspection": "2025-06-15",
        "next_inspection": "2025-09-15",
        "violations": 0,
        "certifications": ["HACCP", "VARNO", "ISO 22000"],
        "temperature_log": [
            {"time": "08:00", "fridge": 3.2, "freezer": -18.5, "status": "ok"},
            {"time": "12:00", "fridge": 3.8, "freezer": -18.2, "status": "ok"},
            {"time": "16:00", "fridge": 4.1, "freezer": -17.8, "status": "ok"},
            {"time": "20:00", "fridge": 3.5, "freezer": -18.0, "status": "ok"},
        ],
        "hygiene_checklist": {"cleaned": 12, "sanitized": 12, "documented": 12, "total": 12}
    }}

@router.get("/food-waste")
def get_food_waste(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"waste": {
        "total_kg": 28.5,
        "total_cost": 185.50,
        "waste_per_order": 0.15,
        "by_category": [
            {"category": "Hrana", "kg": 18.2, "cost": 125.00, "percentage": 63.9},
            {"category": "Pijača", "kg": 3.5, "cost": 18.50, "percentage": 12.3},
            {"category": "Prerezano", "kg": 4.8, "cost": 28.00, "percentage": 16.8},
            {"category": "Pokvarjeno", "kg": 2.0, "cost": 14.00, "percentage": 7.0},
        ],
        "top_wasted_items": [
            {"item": "Solata", "kg": 5.2, "cost": 7.80, "reason": "Preveč pripravljeno"},
            {"item": "Kruh", "kg": 3.8, "cost": 3.80, "reason": "Sušenje"},
            {"item": "Zelenjava", "kg": 3.2, "cost": 4.80, "reason": "Poškodbe"},
        ],
        "reduction_trend": [
            {"month": "Jan", "kg": 35.0},
            {"month": "Feb", "kg": 32.0},
            {"month": "Mar", "kg": 30.0},
            {"month": "Apr", "kg": 28.5},
            {"month": "Maj", "kg": 27.0},
            {"month": "Jun", "kg": 28.5},
        ]
    }}

@router.get("/customer-complaints")
def get_customer_complaints(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"complaints": {
        "total_this_month": 8,
        "resolved": 7,
        "pending": 1,
        "avg_resolution_time": 4.5,
        "satisfaction_after_resolution": 4.2,
        "by_type": [
            {"type": "Hrana", "count": 3, "percentage": 37.5},
            {"type": "Postrežba", "count": 2, "percentage": 25.0},
            {"type": "Čakanje", "count": 2, "percentage": 25.0},
            {"type": "Cena", "count": 1, "percentage": 12.5},
        ],
        "recent": [
            {"id": 1, "date": "2025-07-10", "type": "Hrana", "detail": "Hladna pizza", "status": "resolved", "compensation": "Ponovna priprava"},
            {"id": 2, "date": "2025-07-12", "type": "Postrežba", "detail": "Dolgo čakanje", "status": "resolved", "compensation": "10% popust"},
            {"id": 3, "date": "2025-07-14", "type": "Čakanje", "detail": "45 min za mizo", "status": "pending", "compensation": "V obdelavi"},
        ]
    }}

@router.get("/supplier-quality")
def get_supplier_quality(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"suppliers": [
        {"name": "Kmetija Kranjc", "category": "Zelenjava", "quality_score": 4.8, "delivery_reliability": 96, "issues_this_month": 0, "trend": "stable"},
        {"name": "Meso Žabar", "category": "Meso", "quality_score": 4.5, "delivery_reliability": 92, "issues_this_month": 1, "trend": "improving"},
        {"name": "Pečarna Hleb", "category": "Kruh", "quality_score": 4.7, "delivery_reliability": 98, "issues_this_month": 0, "trend": "stable"},
        {"name": "Vino Bizeljsko", "category": "Vino", "quality_score": 4.9, "delivery_reliability": 100, "issues_this_month": 0, "trend": "stable"},
        {"name": "Mlekarne Kozjek", "category": "Mlečni izdelki", "quality_score": 4.3, "delivery_reliability": 88, "issues_this_month": 2, "trend": "declining"},
    ], "avg_quality_score": 4.64, "avg_delivery_reliability": 94.8}

@router.get("/kpi-quality")
def get_kpi_quality(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"kpis": [
        {"name": "Hrana", "score": 96, "target": 95, "status": "above", "trend": "stable"},
        {"name": "Postrežba", "score": 92, "target": 90, "status": "above", "trend": "up"},
        {"name": "Čistoča", "score": 98, "target": 95, "status": "above", "trend": "stable"},
        {"name": "Hitrost", "score": 88, "target": 90, "status": "below", "trend": "down"},
        {"name": "Temperature", "score": 100, "target": 100, "status": "at_target", "trend": "stable"},
        {"name": "Skladnost", "score": 96, "target": 95, "status": "above", "trend": "up"},
    ], "overall_quality_score": 95.0}

@router.get("/audit-trail")
def get_audit_trail(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"audits": [
        {"date": "2025-07-01", "type": "Dnevni pregled", "conducted_by": "Luka Z.", "score": 98, "notes": "Vse v redu", "issues": 0},
        {"date": "2025-07-05", "type": "Tedenski pregled", "conducted_by": "Ana K.", "score": 95, "notes": "Očistiti hladilnik", "issues": 1},
        {"date": "2025-07-08", "type": "Mesečni pregled", "conducted_by": "Vodja", "score": 96, "notes": "Dopolniti zaloge čistil", "issues": 1},
        {"date": "2025-07-12", "type": "Dnevni pregled", "conducted_by": "Sara M.", "score": 99, "notes": "Vse odlično", "issues": 0},
    ]}

@router.get("/corrective-actions")
def get_corrective_actions(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"actions": [
        {"id": 1, "issue": "Nizka temperatura hladilnika", "date_identified": "2025-07-05", "action": "Nastaviti termostat", "assigned_to": "Luka Z.", "status": "completed", "completed_date": "2025-07-05"},
        {"id": 2, "issue": "Preveč odpadkov solate", "date_identified": "2025-07-08", "action": "Optimizirati naročila", "assigned_to": "Peter K.", "status": "in_progress", "deadline": "2025-07-15"},
        {"id": 3, "issue": "Pritožba glede čakanja", "date_identified": "2025-07-14", "action": "Povečati osebje v petek", "assigned_to": "Vodja", "status": "pending", "deadline": "2025-07-18"},
    ], "open_actions": 2, "completed_this_month": 5}
