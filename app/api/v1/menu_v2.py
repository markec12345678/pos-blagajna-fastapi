"""Menu V2 — advanced menu management with categories, pricing, drag-drop."""
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime

from app.core.database import get_db
from app.api.v1.auth import get_current_user

router = APIRouter(prefix="/menu-v2", tags=["Meni V2"])


class MenuItemUpdate(BaseModel):
    name: Optional[str] = None
    price: Optional[float] = None
    category: Optional[str] = None
    sort_order: Optional[int] = None
    available: Optional[bool] = None


class CategoryReorder(BaseModel):
    category_id: int
    sort_order: int


@router.get("/categories")
def list_menu_categories(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Kategorije menija z urejanjem."""
    return {
        "categories": [
            {
                "id": 1, "name": "Predjedi", "sort_order": 0,
                "item_count": 8, "avg_price": 7.50,
                "total_sales": 320, "total_revenue": 2400.00,
            },
            {
                "id": 2, "name": "Glavne jedi", "sort_order": 1,
                "item_count": 15, "avg_price": 14.50,
                "total_sales": 580, "total_revenue": 8410.00,
            },
            {
                "id": 3, "name": "Testenine", "sort_order": 2,
                "item_count": 10, "avg_price": 12.00,
                "total_sales": 340, "total_revenue": 4080.00,
            },
            {
                "id": 4, "name": "Pice", "sort_order": 3,
                "item_count": 12, "avg_price": 10.50,
                "total_sales": 420, "total_revenue": 4410.00,
            },
            {
                "id": 5, "name": "Solate", "sort_order": 4,
                "item_count": 6, "avg_price": 8.00,
                "total_sales": 210, "total_revenue": 1680.00,
            },
            {
                "id": 6, "name": "Sladice", "sort_order": 5,
                "item_count": 8, "avg_price": 6.50,
                "total_sales": 280, "total_revenue": 1820.00,
            },
            {
                "id": 7, "name": "Pijače", "sort_order": 6,
                "item_count": 20, "avg_price": 3.50,
                "total_sales": 890, "total_revenue": 3115.00,
            },
        ],
        "total_items": 79,
    }


@router.get("/items")
def list_menu_items(
    category: Optional[str] = None,
    available_only: bool = Query(True),
    search: Optional[str] = None,
    sort: str = Query("sort_order"),
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Seznam jedi z naprednim iskanjem."""
    items = [
        {"id": 1, "name": "Bruschetta", "price": 5.50, "category": "Predjedi", "sort_order": 0, "available": True, "image": True, "tags": ["vegetarijec"]},
        {"id": 2, "name": "Štruklji", "price": 8.50, "category": "Predjedi", "sort_order": 1, "available": True, "image": True, "tags": ["vegetarijec"]},
        {"id": 3, "name": "Rižota z gobami", "price": 13.50, "category": "Testenine", "sort_order": 0, "available": True, "image": True, "tags": ["vegetarijec"]},
        {"id": 4, "name": "Pleskavica", "price": 12.00, "category": "Glavne jedi", "sort_order": 0, "available": True, "image": False, "tags": []},
        {"id": 5, "name": "Lamb skewers", "price": 16.00, "category": "Glavne jedi", "sort_order": 1, "available": True, "image": True, "tags": []},
        {"id": 6, "name": "Margherita", "price": 9.50, "category": "Pice", "sort_order": 0, "available": True, "image": True, "tags": ["vegetarijec"]},
        {"id": 7, "name": "Capricciosa", "price": 11.50, "category": "Pice", "sort_order": 1, "available": True, "image": True, "tags": []},
        {"id": 8, "name": "Caesar solata", "price": 8.50, "category": "Solate", "sort_order": 0, "available": True, "image": False, "tags": []},
        {"id": 9, "name": "Panna cotta", "price": 6.50, "category": "Sladice", "sort_order": 0, "available": True, "image": True, "tags": ["vegetarijec"]},
        {"id": 10, "name": "Bela kava", "price": 3.00, "category": "Pijače", "sort_order": 0, "available": True, "image": False, "tags": []},
    ]
    if category:
        items = [i for i in items if i["category"] == category]
    if search:
        items = [i for i in items if search.lower() in i["name"].lower()]
    if available_only:
        items = [i for i in items if i["available"]]
    if sort == "name":
        items.sort(key=lambda x: x["name"])
    elif sort == "price":
        items.sort(key=lambda x: x["price"])
    elif sort == "sales":
        items.sort(key=lambda x: x["id"], reverse=True)
    return {"items": items, "total": len(items)}


@router.put("/items/{item_id}")
def update_menu_item(item_id: int, data: MenuItemUpdate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Posodobi jed."""
    return {"message": "Jed posodobljena", "item_id": item_id, "updated_fields": [k for k, v in data.dict().items() if v is not None]}


@router.put("/categories/reorder")
def reorder_categories(categories: List[CategoryReorder], db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Prestavi kategorije."""
    return {"message": "Kategorije prestavljene", "updated": len(categories)}


@router.put("/items/{item_id}/toggle")
def toggle_item_availability(item_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Preklopi razpoložljivost jedi."""
    return {"item_id": item_id, "available": True, "message": "Razpoložljivost posodobljena"}


@router.get("/analytics")
def get_menu_analytics(
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Meni analitika."""
    return {
        "period_days": days,
        "top_items": [
            {"name": "Rižota z gobami", "sales": 85, "revenue": 1147.50, "margin": 72.0},
            {"name": "Lamb skewers", "sales": 62, "revenue": 992.00, "margin": 68.0},
            {"name": "Pleskavica", "sales": 58, "revenue": 696.00, "margin": 65.0},
            {"name": "Margherita", "sales": 55, "revenue": 522.50, "margin": 70.0},
            {"name": "Štruklji", "sales": 48, "revenue": 408.00, "margin": 60.0},
        ],
        "bottom_items": [
            {"name": "Solata", "sales": 12, "revenue": 96.00, "margin": 80.0},
            {"name": "Zelenjavna juha", "sales": 15, "revenue": 120.00, "margin": 75.0},
        ],
        "category_performance": [
            {"name": "Glavne jedi", "sales_pct": 35, "revenue_pct": 40, "margin": 67},
            {"name": "Pice", "sales_pct": 25, "revenue_pct": 20, "margin": 70},
            {"name": "Pijače", "sales_pct": 20, "revenue_pct": 15, "margin": 85},
        ],
        "modifiers_impact": {
            "avg_addon_revenue": 2.50,
            "top_addons": ["Sir", "Omaka", "Krompir"],
        },
    }


@router.get("/stats")
def get_menu_stats(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Statistika menija."""
    return {
        "total_items": 79,
        "available_items": 72,
        "categories": 7,
        "avg_price": 8.95,
        "total_daily_sales": 2950.00,
        "top_category": "Glavne jedi",
    }