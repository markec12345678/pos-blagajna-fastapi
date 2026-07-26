"""Exports V2 — advanced export management with financial, inventory, employee, analytics, multiple formats."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.v1.auth import get_current_user

router = APIRouter(prefix="/exports-v2", tags=["Exports V2"])


@router.get("/templates")
def list_export_templates(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Seznam predlog za izvoz."""
    return {
        "templates": [
            {"id": 1, "name": "Dnevno poročilo", "category": "financial", "format": "PDF", "last_used": "2026-07-16", "uses": 45, "description": "Dnevni prihodki, stroški, dobiček"},
            {"id": 2, "name": "Tedenski inventar", "category": "inventory", "format": "CSV", "last_used": "2026-07-14", "uses": 12, "description": "Stanje zalog, minimalne zaloge, poraba"},
            {"id": 3, "name": "Mesečni obračun", "category": "employee", "format": "Excel", "last_used": "2026-07-01", "uses": 6, "description": "Ure, nadure, napitnine, neto plače"},
            {"id": 4, "name": "Analitika prodaje", "category": "analytics", "format": "PDF", "last_used": "2026-07-10", "uses": 8, "description": "Prodaja po kategorijah, trendi, KPI"},
            {"id": 5, "name": "Seznam dobaviteljev", "category": "suppliers", "format": "CSV", "last_used": "2026-06-20", "uses": 3, "description": "Kontakti, cene, dostave"},
            {"id": 6, "name": "Finančno poročilo Q2", "category": "financial", "format": "PDF", "last_used": "2026-07-05", "uses": 2, "description": "Kvartalno P&L, primerjava"},
        ],
        "total": 6,
    }


@router.get("/recent")
def list_recent_exports(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Nedavni izvozi."""
    return {
        "exports": [
            {"id": 1, "name": "Dnevno poročilo", "format": "PDF", "size_kb": 245, "created": "2026-07-16 08:00", "status": "completed", "downloaded": True},
            {"id": 2, "name": "Tedenski inventar", "format": "CSV", "size_kb": 89, "created": "2026-07-14 06:00", "status": "completed", "downloaded": False},
            {"id": 3, "name": "Mesečni obračun", "format": "Excel", "size_kb": 156, "created": "2026-07-01 05:00", "status": "completed", "downloaded": True},
            {"id": 4, "name": "Analitika prodaje", "format": "PDF", "size_kb": 312, "created": "2026-07-10 07:30", "status": "completed", "downloaded": True},
        ],
        "total": 4,
    }


@router.get("/categories")
def get_export_categories(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Kategorije izvoza."""
    return {
        "categories": [
            {"name": "financial", "label": "Finance", "count": 2, "formats": ["PDF", "CSV", "Excel"]},
            {"name": "inventory", "label": "Inventura", "count": 1, "formats": ["CSV", "Excel"]},
            {"name": "employee", "label": "Zaposleni", "count": 1, "formats": ["Excel", "PDF"]},
            {"name": "analytics", "label": "Analitika", "count": 1, "formats": ["PDF", "CSV"]},
            {"name": "suppliers", "label": "Dobavitelji", "count": 1, "formats": ["CSV", "PDF"]},
        ],
    }


@router.get("/stats")
def get_exports_stats(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Statistika izvozov."""
    return {
        "total_templates": 6,
        "total_exports": 4,
        "total_size_kb": 802,
        "most_used": "Dnevno poročilo",
    }
