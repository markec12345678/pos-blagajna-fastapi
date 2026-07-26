"""Payment improvements — gift cards, split bills, payment analytics."""
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime, timedelta

from app.core.database import get_db
from app.api.v1.auth import get_current_user

router = APIRouter(prefix="/payments-advanced", tags=["Napredno plačevanje"])


class GiftCardCreate(BaseModel):
    amount: float
    recipient_name: Optional[str] = None
    recipient_email: Optional[str] = None
    message: Optional[str] = None


class SplitBill(BaseModel):
    order_id: int
    split_type: str  # equal, by_item, custom
    split_count: Optional[int] = None
    custom_amounts: Optional[List[float]] = None


@router.get("/gift-cards")
def list_gift_cards(
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Seznam darilnih bonov."""
    return {
        "gift_cards": [
            {
                "id": 1, "code": "GC-2026-001",
                "initial_amount": 50.00, "current_balance": 35.00,
                "recipient": "Janez Novak", "status": "active",
                "created_date": "2026-01-10", "expiry_date": "2027-01-10",
                "transactions": [
                    {"date": "2026-01-12", "amount": -15.00, "description": "Plačilo računa"},
                ],
            },
            {
                "id": 2, "code": "GC-2026-002",
                "initial_amount": 100.00, "current_balance": 100.00,
                "recipient": "Marija Kovač", "status": "active",
                "created_date": "2026-01-14", "expiry_date": "2027-01-14",
                "transactions": [],
            },
            {
                "id": 3, "code": "GC-2025-015",
                "initial_amount": 75.00, "current_balance": 0.00,
                "recipient": "Peter Horvat", "status": "used",
                "created_date": "2025-06-15", "expiry_date": "2026-06-15",
                "transactions": [
                    {"date": "2025-07-20", "amount": -75.00, "description": "Plačilo računa"},
                ],
            },
        ],
        "total": 3,
        "active": 2,
        "total_value": 135.00,
    }


@router.post("/gift-cards")
def create_gift_card(data: GiftCardCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Ustvari darilni bon."""
    import secrets
    code = f"GC-2026-{secrets.token_hex(3).upper()}"

    return {
        "message": "Darilni bon ustvarjen",
        "gift_card": {
            "code": code,
            "amount": data.amount,
            "recipient": data.recipient_name,
            "message": data.message,
            "expiry_date": (datetime.now() + timedelta(days=365)).strftime('%Y-%m-%d'),
            "created_at": datetime.now().isoformat(),
        }
    }


@router.post("/gift-cards/redeem")
def redeem_gift_card(code: str, amount: float, db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Unovči darilni bon."""
    # In production: validate and update balance
    return {
        "message": "Darilni bon unovčen",
        "code": code,
        "redeemed_amount": amount,
        "remaining_balance": 35.00,
        "redeemed_at": datetime.now().isoformat(),
    }


@router.get("/split-bills")
def list_split_bills(
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Seznam deljenih računov."""
    return {
        "period_days": days,
        "split_bills": [
            {
                "id": 1, "order_id": 101,
                "total_amount": 45.00, "split_type": "equal",
                "split_count": 3, "amount_per_person": 15.00,
                "status": "completed", "date": "2026-01-15",
            },
            {
                "id": 2, "order_id": 102,
                "total_amount": 78.50, "split_type": "by_item",
                "splits": [
                    {"person": 1, "items": ["Rižota z gobami"], "amount": 14.00},
                    {"person": 2, "items": ["Pleskavica", "Štruklji"], "amount": 23.00},
                    {"person": 3, "items": ["Bela kava"], "amount": 3.50},
                ],
                "status": "completed", "date": "2026-01-14",
            },
            {
                "id": 3, "order_id": 103,
                "total_amount": 120.00, "split_type": "custom",
                "splits": [
                    {"person": 1, "amount": 50.00},
                    {"person": 2, "amount": 40.00},
                    {"person": 3, "amount": 30.00},
                ],
                "status": "completed", "date": "2026-01-13",
            },
        ],
        "total": 3,
        "total_amount": 243.50,
        "avg_per_person": 27.06,
    }


@router.post("/split-bills")
def create_split_bill(data: SplitBill, db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Ustvari deljen račun."""
    return {
        "message": "Deljen račun ustvarjen",
        "split_bill": {
            "order_id": data.order_id,
            "split_type": data.split_type,
            "split_count": data.split_count,
            "status": "pending",
            "created_at": datetime.now().isoformat(),
        }
    }


@router.get("/analytics")
def get_payment_analytics(
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Analiza plačil."""
    return {
        "period_days": days,
        "total_transactions": 1245,
        "total_revenue": 36789.01,
        "by_method": [
            {"method": "Gotovina", "count": 450, "amount": 13456.78, "percentage": 36.6},
            {"method": "Kartica", "count": 680, "amount": 20123.45, "percentage": 54.7},
            {"method": "Darilni bon", "count": 45, "amount": 1345.67, "percentage": 3.7},
            {"method": "Mobilno plačilo", "count": 70, "amount": 1863.11, "percentage": 5.1},
        ],
        "by_time": {
            "morning": {"count": 120, "amount": 3600.00},
            "lunch": {"count": 450, "amount": 13500.00},
            "afternoon": {"count": 225, "amount": 6750.00},
            "dinner": {"count": 450, "amount": 12939.01},
        },
        "trends": {
            "card_usage_change": 12.5,
            "cash_usage_change": -8.3,
            "mobile_usage_change": 25.0,
        },
    }


@router.get("/tips")
def get_tips_analytics(
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Analiza napitnin."""
    return {
        "period_days": days,
        "total_tips": 1845.67,
        "avg_tip_per_order": 1.48,
        "avg_tip_percentage": 5.0,
        "by_employee": [
            {"name": "Peter Horvat", "tips": 678.90, "orders": 156, "avg_tip": 4.35},
            {"name": "Ana Petrović", "tips": 567.89, "orders": 134, "avg_tip": 4.24},
            {"name": "Dejan Kovač", "tips": 598.88, "orders": 142, "avg_tip": 4.22},
        ],
        "by_payment_method": {
            "cash": 1234.56,
            "card": 611.11,
        },
        "trends": {
            "tips_change": 8.5,
            "avg_tip_change": 0.12,
        },
    }


@router.get("/refunds")
def list_refunds(
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Seznam povračil."""
    return {
        "period_days": days,
        "refunds": [
            {
                "id": 1, "order_id": 98,
                "amount": 14.00, "reason": "Napačna jed",
                "status": "completed", "date": "2026-01-15",
                "processed_by": "Janez Novak",
            },
            {
                "id": 2, "order_id": 87,
                "amount": 9.00, "reason": "Hrana mrzla",
                "status": "completed", "date": "2026-01-12",
                "processed_by": "Admin",
            },
        ],
        "total": 2,
        "total_amount": 23.00,
        "refund_rate": 0.6,
    }


@router.get("/stats")
def get_payment_stats(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Statistika plačil."""
    return {
        "total_transactions": 1245,
        "total_revenue": 36789.01,
        "total_tips": 1845.67,
        "total_gift_cards": 3,
        "gift_card_value": 135.00,
        "split_bills": 3,
        "refunds": 2,
        "refund_amount": 23.00,
        "avg_transaction": 29.55,
        "most_used_method": "Kartica",
    }