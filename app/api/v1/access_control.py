"""Role-based page access control API."""
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional, List
import json

from app.core.database import get_db
from app.api.v1.auth import get_current_user

router = APIRouter(prefix="/access-control", tags=["Nadzor dostopa"])

# Default permissions per role
DEFAULT_PERMISSIONS = {
    "admin": ["*"],  # Admin sees everything
    "manager": [
        "Dashboard", "Naročila", "Kuhinjski zaslon", "Menu", "Zaloge",
        "Zaposleni", "Urnik", "Porocila", "Analytics", "Nastavitve",
        "Stranke", "Rezervacije", "Dobavitelji", "Gift Cards", "Loyalty",
        "Feedback", "Notifications", "Inventory Analytics", "Schedule Calendar",
        "Barcode", "KDS Timers", "Reports", "QR Code", "Voice Ordering"
    ],
    "waiter": ["Dashboard", "Naročila", "Kuhinjski zaslon", "Stranke", "Menu"],
    "kitchen": ["Dashboard", "Kuhinjski zaslon", "Menu"],
    "cashier": ["Dashboard", "Naročila"],
}

class PagePermission(BaseModel):
    page: str
    allowed_roles: List[str]

class BulkPermissionUpdate(BaseModel):
    permissions: List[PagePermission]

@router.get("/permissions")
def get_permissions(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Vrni dovoljenja za vse strani."""
    # For now, return default permissions
    # In future, store in DB for per-restaurant customization
    return {"permissions": DEFAULT_PERMISSIONS, "source": "default"}


@router.get("/pages")
def get_protected_pages(user=Depends(get_current_user)):
    """Vrni seznam vseh zaščitenih strani z dovoljenji."""
    all_pages = [
        "Dashboard", "Naročila", "Kuhinjski zaslon", "Menu", "Zaloge",
        "Zaposleni", "Urnik", "Porocila", "Analytics", "Nastavitve",
        "Stranke", "Rezervacije", "Dobavitelji", "Gift Cards", "Loyalty",
        "Feedback", "Notifications", "Inventory Analytics", "Schedule Calendar",
        "Barcode", "KDS Timers", "Reports", "QR Code", "Voice Ordering"
    ]
    
    role = getattr(user, 'role', 'waiter')
    user_permissions = DEFAULT_PERMISSIONS.get(role, DEFAULT_PERMISSIONS["waiter"])
    
    result = []
    for page in all_pages:
        has_access = "*" in user_permissions or page in user_permissions
        result.append({
            "page": page,
            "has_access": has_access,
            "role": role
        })
    
    return {"pages": result, "role": role}


@router.post("/check/{page}")
def check_page_access(page: str, user=Depends(get_current_user)):
    """Preveri dostop do strani za trenutnega uporabnika."""
    role = getattr(user, 'role', 'waiter')
    user_permissions = DEFAULT_PERMISSIONS.get(role, DEFAULT_PERMISSIONS["waiter"])
    
    has_access = "*" in user_permissions or page in user_permissions
    
    return {
        "page": page,
        "has_access": has_access,
        "role": role,
        "message": "Dovoljeno" if has_access else "Ni dovoljenja"
    }


@router.post("/bulk-update")
def bulk_update_permissions(update: BulkPermissionUpdate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Posodobi dovoljenja za več strani hkrati (admin only)."""
    role = getattr(user, 'role', 'admin')
    if role != 'admin':
        return {"error": "Samo admin lahko posodobi dovoljenja"}
    
    # In future: save to DB
    # For now: just acknowledge
    return {
        "message": f"Posodobljena dovoljenja za {len(update.permissions)} strani",
        "updated": len(update.permissions)
    }
