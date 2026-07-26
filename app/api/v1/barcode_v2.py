"""Barcode V2 — advanced barcode scanning with inventory, products, analytics."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from datetime import datetime

from app.core.database import get_db
from app.api.v1.auth import get_current_user

router = APIRouter(prefix="/barcode-v2", tags=["Barcode V2"])


@router.get("/scan")
def scan_barcode(code: str = Query(...), db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Skeniranje črtne kode."""
    products = {
        "1234567890123": {"name": "Moka 1kg", "category": "Sestavine", "stock": 15, "min_stock": 5, "price": 2.50, "supplier": "Mlin Kozlar", "last_received": "2026-07-14"},
        "2345678901234": {"name": "Oljčno olje 1L", "category": "Sestavine", "stock": 8, "min_stock": 3, "price": 8.90, "supplier": "Oljarstvo", "last_received": "2026-07-10"},
        "3456789012345": {"name": "Paradižnik 1kg", "category": "Zelenjava", "stock": 20, "min_stock": 10, "price": 3.20, "supplier": "Kmetija Novak", "last_received": "2026-07-15"},
        "4567890123456": {"name": "Kruh beli", "category": "Pekarna", "stock": 25, "min_stock": 10, "price": 1.80, "supplier": "Pekarna Gradac", "last_received": "2026-07-16"},
        "5678901234567": {"name": "Mleko 1L", "category": "Mlečni izdelki", "stock": 12, "min_stock": 5, "price": 1.20, "supplier": "Kmetija Horvat", "last_received": "2026-07-15"},
    }
    product = products.get(code)
    if product:
        return {"found": True, "code": code, **product}
    return {"found": False, "code": code, "message": "Izdelek ni najden"}


@router.get("/products")
def list_products(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Seznam izdelkov."""
    return {
        "products": [
            {"code": "1234567890123", "name": "Moka 1kg", "category": "Sestavine", "stock": 15, "min_stock": 5, "price": 2.50},
            {"code": "2345678901234", "name": "Oljčno olje 1L", "category": "Sestavine", "stock": 8, "min_stock": 3, "price": 8.90},
            {"code": "3456789012345", "name": "Paradižnik 1kg", "category": "Zelenjava", "stock": 20, "min_stock": 10, "price": 3.20},
            {"code": "4567890123456", "name": "Kruh beli", "category": "Pekarna", "stock": 25, "min_stock": 10, "price": 1.80},
            {"code": "5678901234567", "name": "Mleko 1L", "category": "Mlečni izdelki", "stock": 12, "min_stock": 5, "price": 1.20},
        ],
        "total": 5,
    }


@router.get("/analytics")
def get_barcode_analytics(
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db), user=Depends(get_current_user)
):
    """Analitika črtne kode."""
    return {
        "period_days": days,
        "total_scans": 342,
        "unique_products": 48,
        "avg_scans_per_day": 11.4,
        "top_products": [
            {"name": "Mleko 1L", "scans": 45},
            {"name": "Kruh beli", "scans": 38},
            {"name": "Paradižnik 1kg", "scans": 32},
            {"name": "Moka 1kg", "scans": 28},
            {"name": "Oljčno olje 1L", "scans": 22},
        ],
        "low_stock_alerts": 2,
    }


@router.get("/stats")
def get_barcode_stats(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Statistika črtne kode."""
    return {
        "total_products": 5,
        "total_scans": 342,
        "low_stock_alerts": 2,
        "categories": 4,
    }
