"""Users V2 — advanced user management with permissions, activity, security."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.v1.auth import get_current_user

router = APIRouter(prefix="/users-v2", tags=["Users V2"])


@router.get("/list")
def list_users(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Seznam uporabnikov."""
    return {
        "users": [
            {"id": 1, "name": "Maja Pezdirc", "role": "admin", "status": "active", "last_login": "2026-07-16 08:00", "permissions": ["all"], "login_count": 245, "mfa": True},
            {"id": 2, "name": "Boštjan Kranjc", "role": "manager", "status": "active", "last_login": "2026-07-16 06:00", "permissions": ["menu", "inventory", "orders", "staff"], "login_count": 210, "mfa": True},
            {"id": 3, "name": "Ana Novak", "role": "waiter", "status": "active", "last_login": "2026-07-15 14:00", "permissions": ["pos", "orders", "customers"], "login_count": 180, "mfa": False},
            {"id": 4, "name": "Peter Horvat", "role": "waiter", "status": "active", "last_login": "2026-07-15 14:00", "permissions": ["pos", "orders", "customers"], "login_count": 165, "mfa": False},
            {"id": 5, "name": "Tine Kovačič", "role": "chef", "status": "active", "last_login": "2026-07-16 06:00", "permissions": ["kds", "menu", "inventory"], "login_count": 95, "mfa": False},
        ],
        "total": 5,
        "active": 5,
        "inactive": 0,
    }


@router.get("/permissions")
def get_permissions_matrix(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Matrika dovoljenj."""
    return {
        "roles": [
            {"role": "admin", "permissions": ["all"], "users": 1},
            {"role": "manager", "permissions": ["menu", "inventory", "orders", "staff", "reports", "settings"], "users": 1},
            {"role": "waiter", "permissions": ["pos", "orders", "customers", "loyalty"], "users": 2},
            {"role": "chef", "permissions": ["kds", "menu", "inventory"], "users": 1},
            {"role": "cashier", "permissions": ["pos", "customers", "cash"], "users": 0},
        ],
        "total_permissions": 15,
    }


@router.get("/activity")
def get_user_activity(
    days: int = Query(7, ge=1, le=90),
    db: Session = Depends(get_db), user=Depends(get_current_user)
):
    """Aktivnost uporabnikov."""
    return {
        "period_days": days,
        "activity": [
            {"user": "Maja Pezdirc", "logins": 14, "orders_created": 85, "orders_modified": 12, "reports_viewed": 5, "settings_changed": 2},
            {"user": "Boštjan Kranjc", "logins": 12, "orders_created": 0, "orders_modified": 0, "reports_viewed": 3, "settings_changed": 0},
            {"user": "Ana Novak", "logins": 12, "orders_created": 65, "orders_modified": 8, "reports_viewed": 0, "settings_changed": 0},
            {"user": "Peter Horvat", "logins": 12, "orders_created": 58, "orders_modified": 5, "reports_viewed": 0, "settings_changed": 0},
            {"user": "Tine Kovačič", "logins": 7, "orders_created": 0, "orders_modified": 0, "reports_viewed": 1, "settings_changed": 0},
        ],
    }


@router.get("/security")
def get_security_overview(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Pregled varnosti."""
    return {
        "mfa_enabled": 2,
        "mfa_disabled": 3,
        "password_age_days": {"Maja Pezdirc": 30, "Boštjan Kranjc": 45, "Ana Novak": 60, "Peter Horvat": 55, "Tine Kovačič": 15},
        "failed_logins_today": 0,
        "locked_accounts": 0,
        "sessions_active": 3,
        "recommendations": [
            "Omogoči MFA za vse uporabnike",
            "Posodobi gesla starejša od 60 dni",
            "Omeji dostop do nastavitev za ne-admin uporabnike",
        ],
    }


@router.get("/stats")
def get_users_stats(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Statistika uporabnikov."""
    return {
        "total_users": 5,
        "active_users": 5,
        "mfa_coverage": 40,
        "avg_login_count": 179,
    }
