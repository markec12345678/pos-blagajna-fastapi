"""Cash V2 — advanced cash register management with drawer audit, safe, reconciliation."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from datetime import datetime

from app.core.database import get_db
from app.api.v1.auth import get_current_user

router = APIRouter(prefix="/cash-v2", tags=["Cash V2"])


@router.get("/registers")
def get_registers(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Blagajne."""
    return {
        "registers": [
            {"id": 1, "name": "Blagajna 1", "location": "Glavna dvorana", "status": "open", "current_amount": 2450.00, "opened_at": "08:00", "opened_by": "Maja Pezdirc"},
            {"id": 2, "name": "Blagajna 2", "location": "Vrt", "status": "closed", "current_amount": 1820.00, "last_closed": "23:00", "closed_by": "Boštjan Kranjc"},
            {"id": 3, "name": "Bar", "location": "Bar pult", "status": "open", "current_amount": 890.00, "opened_at": "08:00", "opened_by": "Ana Novak"},
        ],
        "total_open": 2,
        "total_closed": 1,
    }


@router.get("/drawer-audit")
def get_drawer_audit(
    register_id: int = Query(1),
    db: Session = Depends(get_db), user=Depends(get_current_user)
):
    """Pregled blagajniškega predala."""
    return {
        "register_id": register_id,
        "denominations": [
            {"denomination": "50€", "count": 20, "total": 1000.00},
            {"denomination": "20€", "count": 35, "total": 700.00},
            {"denomination": "10€", "count": 45, "total": 450.00},
            {"denomination": "5€", "count": 60, "total": 300.00},
            {"denomination": "2€", "count": 30, "total": 60.00},
            {"denomination": "1€", "count": 25, "total": 25.00},
            {"denomination": "Kovanci", "count": 15, "total": 15.00},
        ],
        "total_cash": 2450.00,
        "coin_total": 100.00,
        "bill_total": 2350.00,
    }


@router.get("/safe")
def get_safe(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Varnostna omarica."""
    return {
        "safe_id": 1,
        "current_amount": 8500.00,
        "last_access": "2026-07-16 08:00",
        "accessed_by": "Maja Pezdirc",
        "transactions": [
            {"date": "2026-07-16 08:00", "type": "deposit", "amount": 2000.00, "description": "Dnevni polog", "by": "Maja Pezdirc"},
            {"date": "2026-07-15 23:00", "type": "withdrawal", "amount": 500.00, "description": "Vračilo za zaloge", "by": "Boštjan Kranjc"},
            {"date": "2026-07-15 08:00", "type": "deposit", "amount": 1800.00, "description": "Dnevni polog", "by": "Boštjan Kranjc"},
        ],
    }


@router.get("/daily-reconciliation")
def get_daily_reconciliation(
    date: str = Query(default=datetime.now().strftime("%Y-%m-%d")),
    db: Session = Depends(get_db), user=Depends(get_current_user)
):
    """Dnevno usklajevanje."""
    return {
        "date": date,
        "registers": [
            {"name": "Blagajna 1", "expected": 2450.00, "actual": 2448.00, "difference": -2.00, "status": "discrepancy"},
            {"name": "Bar", "expected": 890.00, "actual": 890.00, "difference": 0, "status": "balanced"},
        ],
        "total_expected": 3340.00,
        "total_actual": 3338.00,
        "total_difference": -2.00,
        "overall_status": "discrepancy",
        "notes": "Manjka 2€ v Blagajna 1",
    }


@router.get("/cash-flow")
def get_cash_flow(
    days: int = Query(7, ge=1, le=30),
    db: Session = Depends(get_db), user=Depends(get_current_user)
):
    """Pretok gotovine."""
    return {
        "period_days": days,
        "inflows": [
            {"date": "2026-07-16", "amount": 2450.00, "source": "Gotovina - Blagajna 1"},
            {"date": "2026-07-16", "amount": 890.00, "source": "Gotovina - Bar"},
            {"date": "2026-07-15", "amount": 2180.00, "source": "Gotovina - Blagajna 1"},
            {"date": "2026-07-15", "amount": 750.00, "source": "Gotovina - Bar"},
        ],
        "outflows": [
            {"date": "2026-07-16", "amount": 120.00, "source": "Vračilo stranki"},
            {"date": "2026-07-15", "amount": 500.00, "source": "Varnostna omarica"},
        ],
        "net_flow": 5650.00,
        "total_inflows": 6270.00,
        "total_outflows": 620.00,
    }


@router.get("/stats")
def get_cash_stats(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Statistika gotovine."""
    return {
        "total_cash_today": 3340.00,
        "total_safe": 8500.00,
        "registers_open": 2,
        "registers_closed": 1,
        "today_reconciliation": "discrepancy",
        "discrepancy_amount": -2.00,
    }
