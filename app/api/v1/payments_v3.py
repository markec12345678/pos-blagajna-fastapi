from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.v1.auth import get_current_user

router = APIRouter(prefix="/payments-v3", tags=["payments-v3"])

@router.get("/split-bills")
def get_split_bills(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"splits": [
        {"id": 1, "table": "T5", "total": 85.00, "method": "per_person", "guests": 4, "per_person": 21.25, "status": "completed", "payments": [
            {"person": "Oseba 1", "amount": 21.25, "method": "kartica"},
            {"person": "Oseba 2", "amount": 21.25, "method": "gotovina"},
            {"person": "Oseba 3", "amount": 21.25, "method": "kartica"},
            {"person": "Oseba 4", "amount": 21.25, "method": "mobilno"},
        ]},
        {"id": 2, "table": "T7", "total": 62.50, "method": "custom", "guests": 2, "status": "pending", "payments": [
            {"person": "Oseba 1", "amount": 38.00, "method": "kartica"},
            {"person": "Oseba 2", "amount": 24.50, "method": "gotovina"},
        ]},
    ], "today_stats": {"total_splits": 8, "avg_per_person": 18.50}}

@router.get("/tipping")
def get_tipping(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"tipping": {
        "total_tips_today": 125.00,
        "avg_tip_percentage": 12.5,
        "tips_by_method": [
            {"method": "Gotovina", "amount": 65.00, "count": 12, "avg_percentage": 13.0},
            {"method": "Kartica", "amount": 45.00, "count": 18, "avg_percentage": 11.5},
            {"method": "Mobilno", "amount": 15.00, "count": 5, "avg_percentage": 10.0},
        ],
        "top_tippers": [
            {"table": "T3", "amount": 25.00, "percentage": 15.0},
            {"table": "T7", "amount": 18.00, "percentage": 14.0},
            {"table": "T12", "amount": 12.00, "percentage": 12.0},
        ],
        "daily_trend": [
            {"day": "Pon", "tips": 95},
            {"day": "Tor", "tips": 110},
            {"day": "Sre", "tips": 125},
            {"day": "Čet", "tips": 88},
            {"day": "Pet", "tips": 155},
            {"day": "Sob", "tips": 180},
            {"day": "Ned", "tips": 125},
        ]
    }}

@router.get("/refunds")
def get_refunds(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"refunds": [
        {"id": 1, "order_id": 998, "amount": 12.50, "reason": "Hladna hrana", "method": "kartica", "processed_by": "Luka Z.", "time": "14:30", "status": "completed"},
        {"id": 2, "order_id": 1002, "amount": 8.00, "reason": "Napačna postrežba", "method": "gotovina", "processed_by": "Ana K.", "time": "16:45", "status": "completed"},
    ], "stats": {"total_refunded_today": 20.50, "refund_rate": 0.45, "avg_refund": 10.25, "refunds_this_month": 185.00}}

@router.get("/payment-reconciliation")
def get_payment_reconciliation(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"reconciliation": {
        "expected": {"gotovina": 8500.00, "kartica": 24500.00, "mobilno": 7000.00, "darilni_bon": 1125.00, "hišni_račun": 875.00},
        "actual": {"gotovina": 8485.00, "kartica": 24500.00, "mobilno": 7000.00, "darilni_bon": 1125.00, "hišni_račun": 875.00},
        "differences": {"gotovina": -15.00, "kartica": 0, "mobilno": 0, "darilni_bon": 0, "hišni_račun": 0},
        "status": "minor_discrepancy",
        "last_reconciliation": "2025-07-14 23:00",
        "reconciled_by": "Luka Z."
    }}

@router.get("/void-transactions")
def get_void_transactions(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"voids": [
        {"id": 1, "order_id": 995, "amount": 28.00, "reason": "Dvojna postrežba", "voided_by": "Luka Z.", "time": "13:15", "approved_by": "Ana K."},
        {"id": 2, "order_id": 1000, "amount": 15.50, "reason": "Napaka v naročilu", "voided_by": "Peter K.", "time": "17:30", "approved_by": "Luka Z."},
    ], "stats": {"total_voided_today": 43.50, "void_count": 2, "avg_void": 21.75, "approval_required": True}}

@router.get("/cash-drawer")
def get_cash_drawer(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"drawer": {
        "opening_balance": 300.00,
        "cash_in": 8500.00,
        "cash_out": 120.00,
        "expected_close": 8680.00,
        "actual_close": 8665.00,
        "difference": -15.00,
        "transactions": 142,
        "last_counted": "2025-07-14 23:00",
        "counted_by": "Luka Z.",
        "denominations": [
            {"denom": "€50", "count": 45, "total": 2250.00},
            {"denom": "€20", "count": 85, "total": 1700.00},
            {"denom": "€10", "count": 120, "total": 1200.00},
            {"denom": "€5", "count": 180, "total": 900.00},
            {"denom": "€2", "count": 250, "total": 500.00},
            {"denom": "€1", "count": 320, "total": 320.00},
            {"denom": "kovanci", "count": 450, "total": 195.00},
        ]
    }}

@router.get("/loyalty-redemptions")
def get_loyalty_redemptions(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"redemptions": [
        {"id": 1, "customer": "Marko Novak", "points_used": 500, "reward": "Brezplačna kava", "value": 3.50, "time": "10:15"},
        {"id": 2, "customer": "Ana Horvat", "points_used": 2000, "reward": "20% popust", "value": 14.00, "time": "13:30"},
        {"id": 3, "customer": "Peter Kovač", "points_used": 1000, "reward": "Brezplačen desert", "value": 6.50, "time": "19:45"},
    ], "stats": {"total_redemptions_today": 3, "total_points_used": 3500, "total_value": 24.00, "redemptions_this_month": 45}}
