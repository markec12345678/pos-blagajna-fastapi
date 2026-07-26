"""Multi-branch management — comparison, inter-branch transfers, analytics."""
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime, timedelta

from app.core.database import get_db
from app.api.v1.auth import get_current_user

router = APIRouter(prefix="/branch-management", tags=["Več-poslovalnična podpora"])


class BranchTransfer(BaseModel):
    from_branch: int
    to_branch: int
    items: List[dict]
    notes: Optional[str] = None


@router.get("/overview")
def get_branch_overview(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Pregled vseh poslovalnic."""
    # In production: fetch from Branch table with stats
    return {
        "branches": [
            {
                "id": 1, "name": "River Kolpa - Glavna",
                "address": "Griblje 70, 8332 Gradac",
                "phone": "040 234 567", "email": "info@riverkolpa.si",
                "is_active": True, "tables": 15, "seats": 60,
                "today_orders": 42, "today_revenue": 1234.56,
                "staff_on_duty": 5,
            },
            {
                "id": 2, "name": "River Kolpa - center",
                "address": "Glavni trg 10, 8330 Metlika",
                "phone": "040 234 568", "email": "center@riverkolpa.si",
                "is_active": True, "tables": 10, "seats": 40,
                "today_orders": 28, "today_revenue": 876.54,
                "staff_on_duty": 3,
            },
        ],
        "total_branches": 2,
        "total_tables": 25,
        "total_seats": 100,
        "total_today_orders": 70,
        "total_today_revenue": 2111.10,
    }


@router.get("/comparison")
def compare_branches(
    days: int = Query(7, ge=1, le=90),
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Primerjava poslovalnic."""
    return {
        "period_days": days,
        "branches": [
            {
                "id": 1, "name": "River Kolpa - Glavna",
                "revenue": 8654.32, "orders": 294, "avg_order": 29.44,
                "customers": 187, "popular_items": ["Rižota z gobami", "Pleskavica", "Štruklji"],
                "peak_hours": ["12:00-13:00", "18:00-19:00"],
                "satisfaction": 4.6,
            },
            {
                "id": 2, "name": "River Kolpa - center",
                "revenue": 6123.45, "orders": 198, "avg_order": 30.93,
                "customers": 132, "popular_items": ["Bela kava", "Krofi", "Sachertorte"],
                "peak_hours": ["10:00-11:00", "15:00-16:00"],
                "satisfaction": 4.8,
            },
        ],
        "comparison_metrics": {
            "revenue_diff": 2530.87,
            "revenue_diff_pct": 29.3,
            "orders_diff": 96,
            "orders_diff_pct": 32.7,
            "avg_order_diff": -1.49,
            "avg_order_diff_pct": -5.1,
            "satisfaction_diff": -0.2,
        },
    }


@router.get("/transfers")
def get_inter_branch_transfers(
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Vrni prenose med poslovalnicami."""
    return {
        "transfers": [
            {
                "id": 1,
                "from": "River Kolpa - Glavna",
                "to": "River Kolpa - center",
                "items": [
                    {"name": "Moka", "quantity": 5, "unit": "kg"},
                    {"name": "Mleko", "quantity": 10, "unit": "l"},
                ],
                "status": "delivered",
                "date": "2026-01-14",
                "notes": "Tedenski prenos",
            },
            {
                "id": 2,
                "from": "River Kolpa - center",
                "to": "River Kolpa - Glavna",
                "items": [
                    {"name": "Vino", "quantity": 2, "unit": "steklenic"},
                ],
                "status": "in_transit",
                "date": "2026-01-15",
                "notes": "Za posebno prireditev",
            },
        ],
        "total": 2,
        "pending": 1,
        "delivered": 1,
    }


@router.post("/transfer")
def create_inter_branch_transfer(data: BranchTransfer, db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Ustvari prenos med poslovalnicama."""
    # In production: save to BranchTransfer table
    return {
        "message": "Prenos ustvarjen",
        "transfer": {
            "from_branch": data.from_branch,
            "to_branch": data.to_branch,
            "items": data.items,
            "status": "pending",
            "created_by": user.username if user else "Unknown",
            "created_at": datetime.now().isoformat(),
        }
    }


@router.get("/staff-distribution")
def get_staff_distribution(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Porazdelitev zaposlenih po poslovalnicah."""
    return {
        "branches": [
            {
                "id": 1, "name": "River Kolpa - Glavna",
                "staff": [
                    {"name": "Janez Novak", "role": "Manager", "shift": "08:00-16:00"},
                    {"name": "Marija Kovač", "role": "Kuhar", "shift": "10:00-18:00"},
                    {"name": "Peter Horvat", "role": "Natakar", "shift": "12:00-20:00"},
                    {"name": "Ana Petrović", "role": "Natakar", "shift": "12:00-20:00"},
                    {"name": "Marko Korošec", "role": "Kuhar", "shift": "06:00-14:00"},
                ],
                "total": 5,
            },
            {
                "id": 2, "name": "River Kolpa - center",
                "staff": [
                    {"name": "Luka Babić", "role": "Manager", "shift": "09:00-17:00"},
                    {"name": "Sara Horvat", "role": "Natakar", "shift": "10:00-18:00"},
                    {"name": "Dejan Kovač", "role": "Kuhar", "shift": "08:00-16:00"},
                ],
                "total": 3,
            },
        ],
        "total_staff": 8,
    }


@router.get("/inventory-transfer")
def get_inventory_transfer_suggestions(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Predlogi za prenos zalog med poslovalnicama."""
    return {
        "suggestions": [
            {
                "from": "River Kolpa - Glavna",
                "to": "River Kolpa - center",
                "items": [
                    {"name": "Moka", "from_stock": 25, "to_stock": 8, "suggested_qty": 10, "unit": "kg"},
                    {"name": "Sladkor", "from_stock": 15, "to_stock": 3, "suggested_qty": 5, "unit": "kg"},
                ],
                "reason": "Nizka zaloga v poslovalnici center",
            },
            {
                "from": "River Kolpa - center",
                "to": "River Kolpa - Glavna",
                "items": [
                    {"name": "Kava", "from_stock": 20, "to_stock": 5, "suggested_qty": 10, "unit": "kg"},
                ],
                "reason": "Nizka zaloga v glavni poslovalnici",
            },
        ],
        "total_suggestions": 2,
    }


@router.get("/performance-ranking")
def get_performance_ranking(
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Uvrstitev poslovalnic po uspešnosti."""
    return {
        "period_days": days,
        "ranking": [
            {
                "rank": 1, "branch": "River Kolpa - center",
                "score": 92, "metrics": {
                    "revenue": 24500, "orders": 792, "satisfaction": 4.8,
                    "efficiency": 95, "waste_pct": 3.2,
                },
            },
            {
                "rank": 2, "branch": "River Kolpa - Glavna",
                "score": 88, "metrics": {
                    "revenue": 34600, "orders": 1176, "satisfaction": 4.6,
                    "efficiency": 91, "waste_pct": 4.5,
                },
            },
        ],
        "insights": [
            "Poslovalnica center ima višjo zadovoljstvo strank",
            "Glavna poslovalnica generira več prometa",
            "Obe poslovalnici imata nizek % odpadkov",
        ],
    }


@router.get("/stats")
def get_branch_stats(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Statistika več-poslovalničnega poslovanja."""
    return {
        "total_branches": 2,
        "active_branches": 2,
        "total_tables": 25,
        "total_seats": 100,
        "total_staff": 8,
        "avg_revenue_per_branch": 1055.55,
        "best_performing": "River Kolpa - center",
        "improvement_areas": [
            "Povečati zadovoljstvo v glavni poslovalnici",
            "Zmanjšati odpadke v glavni poslovalnici",
            "Optimizirati razporeditev zaposlenih",
        ],
    }