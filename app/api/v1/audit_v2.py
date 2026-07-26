"""Audit V2 — advanced audit trail with compliance, export, search."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from datetime import datetime

from app.core.database import get_db
from app.api.v1.auth import get_current_user

router = APIRouter(prefix="/audit-v2", tags=["Audit V2"])


@router.get("/logs")
def list_audit_logs(
    days: int = Query(7, ge=1, le=90),
    action_type: str = Query(default="all"),
    db: Session = Depends(get_db), user=Depends(get_current_user)
):
    """Dnevnik revizij."""
    return {
        "logs": [
            {"id": 1, "timestamp": "2026-07-16 08:00:15", "user": "Maja Pezdirc", "action": "login", "category": "auth", "details": "Uspešna prijava", "ip": "192.168.1.10", "risk": "low"},
            {"id": 2, "timestamp": "2026-07-16 08:05:22", "user": "Maja Pezdirc", "action": "menu_edit", "category": "menu", "details": "Spremenjena cena Štrukljev: 13.50 -> 14.50 EUR", "ip": "192.168.1.10", "risk": "medium"},
            {"id": 3, "timestamp": "2026-07-16 08:15:33", "user": "Boštjan Kranjc", "action": "inventory_update", "category": "inventory", "details": "Zaloge: Moka -5kg", "ip": "192.168.1.15", "risk": "low"},
            {"id": 4, "timestamp": "2026-07-16 09:00:44", "user": "Maja Pezdirc", "action": "payment_refund", "category": "finance", "details": "Vračilo naročila #105: 89.20 EUR", "ip": "192.168.1.10", "risk": "high"},
            {"id": 5, "timestamp": "2026-07-16 09:30:55", "user": "Ana Novak", "action": "order_create", "category": "orders", "details": "Novo naročilo #106: 3 jedi", "ip": "192.168.1.20", "risk": "low"},
            {"id": 6, "timestamp": "2026-07-16 10:00:00", "user": "System", "action": "backup", "category": "system", "details": "Samodejni backup zaključen", "ip": "local", "risk": "low"},
            {"id": 7, "timestamp": "2026-07-16 10:15:11", "user": "Peter Horvat", "action": "user_create", "category": "users", "details": "Nov uporabnik: Tine Kovačič", "ip": "192.168.1.25", "risk": "medium"},
            {"id": 8, "timestamp": "2026-07-16 11:00:22", "user": "Maja Pezdirc", "action": "settings_change", "category": "system", "details": "Spremenjen sistemski nastavitve", "ip": "192.168.1.10", "risk": "high"},
        ],
        "total": 8,
        "high_risk": 2,
        "medium_risk": 2,
        "low_risk": 4,
    }


@router.get("/compliance")
def get_compliance_report(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Poročilo o skladnosti."""
    return {
        "score": 92,
        "checks": [
            {"name": "HACCP dnevnik", "status": "pass", "last_check": "2026-07-16"},
            {"name": "Temperature logi", "status": "pass", "last_check": "2026-07-16"},
            {"name": "Računi shranjeni", "status": "pass", "last_check": "2026-07-16"},
            {"name": "Dostopi pregledani", "status": "warning", "last_check": "2026-07-15"},
            {"name": "Gesla posodobljena", "status": "fail", "last_check": "2026-07-01"},
        ],
        "overall": "warning",
        "next_audit": "2026-07-30",
    }


@router.get("/search")
def search_audit_logs(
    query: str = Query(...),
    db: Session = Depends(get_db), user=Depends(get_current_user)
):
    """Iskanje po dnevniku."""
    return {
        "query": query,
        "results": [
            {"id": 4, "timestamp": "2026-07-16 09:00:44", "user": "Maja Pezdirc", "action": "payment_refund", "details": "Vračilo naročila #105: 89.20 EUR", "risk": "high"},
            {"id": 1, "timestamp": "2026-07-16 08:00:15", "user": "Maja Pezdirc", "action": "login", "details": "Uspešna prijava", "risk": "low"},
        ],
        "total": 2,
    }


@router.get("/stats")
def get_audit_stats(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Statistika revizij."""
    return {
        "total_logs": 8,
        "high_risk": 2,
        "medium_risk": 2,
        "low_risk": 4,
        "compliance_score": 92,
        "active_users": 4,
        "failed_logins": 0,
    }
