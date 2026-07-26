"""Quality V2 — advanced quality management, HACCP, food safety, audits."""
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime

from app.core.database import get_db
from app.api.v1.auth import get_current_user

router = APIRouter(prefix="/quality-v2", tags=["Kakovost V2"])


@router.get("/haccp")
def get_haccp_plan(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """HACCP načrt."""
    return {
        "hazards": [
            {"id": 1, "stage": "Prejem surovin", "hazard": "Fizikalna kontaminacija", "risk": "medium", "control": "Vizualni pregled", "frequency": "Vsaka pošiljka", "status": "compliant"},
            {"id": 2, "stage": "Shranjevanje", "hazard": "Mikrobiološka rast", "risk": "high", "control": "Temperatura 0-4°C", "frequency": "Neprekinjeno", "status": "compliant"},
            {"id": 3, "stage": "Priprava", "hazard": "Križna kontaminacija", "risk": "high", "control": "Ločena deska", "frequency": "Vsak obrok", "status": "compliant"},
            {"id": 4, "stage": "Kuhanje", "hazard": "Neustrezna temperatura", "risk": "high", "control": "Termometer", "frequency": "Vsak obrok", "status": "compliant"},
            {"id": 5, "stage": "Strežba", "hazard": "Časovna izpostavljenost", "risk": "medium", "control": "Časovnik", "frequency": "Vsak obrok", "status": "compliant"},
        ],
        "ccp_points": 5,
        "compliance_rate": 100,
        "last_audit": "2026-01-10",
    }


@router.get("/temperature")
def get_temperature_logs(days: int = Query(7, ge=1, le=30), db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Dnevniki temperature."""
    return {
        "readings": [
            {"device": "Hladilnik 1", "current": 3.2, "target_min": 0, "target_max": 4, "status": "ok", "last_check": "2026-01-15 14:00"},
            {"device": "Hladilnik 2", "current": 3.8, "target_min": 0, "target_max": 4, "status": "ok", "last_check": "2026-01-15 14:00"},
            {"device": "Zamrzovalnik", "current": -18.5, "target_min": -20, "target_max": -15, "status": "ok", "last_check": "2026-01-15 14:00"},
            {"device": "Vitrina", "current": 5.2, "target_min": 0, "target_max": 4, "status": "warning", "last_check": "2026-01-15 14:00"},
        ],
        "alerts": 1,
        "compliance_rate": 98.5,
    }


@router.get("/cleaning")
def get_cleaning_schedule(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Razpored čiščenja."""
    return {
        "tasks": [
            {"area": "Kuhinja", "task": "Globinsko čiščenje", "frequency": "Tedensko", "last_done": "2026-01-12", "next_due": "2026-01-19", "status": "up_to_date"},
            {"area": "Kuhinja", "task": "Dnevno čiščenje", "frequency": "Dnevno", "last_done": "2026-01-15", "next_due": "2026-01-16", "status": "up_to_date"},
            {"area": "Jedilnica", "task": "Čiščenje tal", "frequency": "Dnevno", "last_done": "2026-01-15", "next_due": "2026-01-16", "status": "up_to_date"},
            {"area": "Skladišče", "task": "Pregled zalog", "frequency": "Tedensko", "last_done": "2026-01-13", "next_due": "2026-01-20", "status": "up_to_date"},
            {"area": "Toaletni prostori", "task": "Čiščenje", "frequency": "Dnevno", "last_done": "2026-01-15", "next_due": "2026-01-16", "status": "up_to_date"},
        ],
        "compliance_rate": 100,
        "overdue_tasks": 0,
    }


@router.get("/audits")
def get_audit_trail(days: int = Query(30, ge=1, le=365), db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Revizijska sled."""
    return {
        "audits": [
            {"date": "2026-01-15", "type": "Dnevni pregled", "auditor": "Ana", "result": "V redu", "notes": "Vsi CCP točki v normi"},
            {"date": "2026-01-10", "type": "Tedenski pregled", "auditor": "Peter", "result": "V redu", "notes": "Temperatura vitrine rahlo povišana"},
            {"date": "2026-01-05", "type": "Mesečni pregled", "auditor": "Vodja", "result": "V redu", "notes": "Vse v skladu s HACCP"},
        ],
        "total_audits": 3,
        "pass_rate": 100,
    }


@router.get("/incidents")
def get_quality_incidents(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Incidenti kakovosti."""
    return {
        "incidents": [
            {"id": 1, "date": "2026-01-10", "type": " temperatura", "severity": "low", "description": "Temperatura vitrine 5.2°C", "action": "Pregled", "status": "resolved"},
        ],
        "total": 1,
        "resolved": 1,
        "open": 0,
    }


@router.get("/stats")
def get_quality_stats(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Statistika kakovosti."""
    return {
        "haccp_compliance": 100,
        "temperature_compliance": 98.5,
        "cleaning_compliance": 100,
        "audit_pass_rate": 100,
        "open_incidents": 0,
        "last_haccp_audit": "2026-01-10",
    }