"""Gift Cards V2 — advanced gift card management with analytics."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from datetime import datetime

from app.core.database import get_db
from app.api.v1.auth import get_current_user

router = APIRouter(prefix="/gift-cards-v2", tags=["Gift Cards V2"])


@router.get("/list")
def list_gift_cards(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Seznam darilnih bonov."""
    return {
        "cards": [
            {"id": 1, "code": "GC-2026-001", "initial_amount": 100.00, "balance": 35.00, "buyer": "Novak Janez", "recipient": "Horvat Ana", "issued": "2026-06-15", "expires": "2027-06-15", "status": "active", "transactions": 4},
            {"id": 2, "code": "GC-2026-002", "initial_amount": 50.00, "balance": 0.00, "buyer": "Krajnc Peter", "recipient": "Podgoršek Marija", "issued": "2026-05-20", "expires": "2027-05-20", "status": "used", "transactions": 3},
            {"id": 3, "code": "GC-2026-003", "initial_amount": 200.00, "balance": 180.00, "buyer": "Podgoršek Peter", "recipient": "Poslovna stranka", "issued": "2026-07-01", "expires": "2027-07-01", "status": "active", "transactions": 1},
            {"id": 4, "code": "GC-2026-004", "initial_amount": 75.00, "balance": 75.00, "buyer": "Bernik Jan", "recipient": "Kovačič Stane", "issued": "2026-07-14", "expires": "2027-07-14", "status": "active", "transactions": 0},
        ],
        "total": 4,
        "active": 3,
        "used": 1,
    }


@router.get("/analytics")
def get_gift_card_analytics(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Analitika darilnih bonov."""
    return {
        "total_sold": 4,
        "total_value": 425.00,
        "total_used": 195.00,
        "total_outstanding": 290.00,
        "breakage_rate": 15.0,
        "avg_card_value": 106.25,
        "by_month": [
            {"month": "Junij 2026", "sold": 1, "value": 100.00, "redeemed": 65.00},
            {"month": "Maj 2026", "sold": 1, "value": 50.00, "redeemed": 50.00},
            {"month": "Julij 2026", "sold": 2, "value": 275.00, "redeemed": 80.00},
        ],
    }


@router.get("/stats")
def get_gift_cards_stats(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Statistika darilnih bonov."""
    return {
        "total_cards": 4,
        "active_cards": 3,
        "total_value": 425.00,
        "outstanding": 290.00,
        "breakage_rate": 15.0,
    }
