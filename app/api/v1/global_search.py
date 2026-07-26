"""Global Search API — iskanje po vseh entitetah."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional

from app.core.database import get_db
from app.api.v1.auth import get_current_user

router = APIRouter(prefix="/global-search", tags=["Globalno iskanje"])


@router.get("/")
def global_search(
    q: str = Query(..., min_length=1, max_length=100),
    limit: int = Query(20, ge=1, le=50),
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Iskanje po vseh entitetah: jedilnik, stranke, naročila, dobavitelji, zaposleni."""
    results = []

    # Search menu items
    from app.models.menu_item import MenuItem
    menu_items = db.query(MenuItem).filter(
        MenuItem.name.ilike(f"%{q}%")
    ).limit(limit).all()
    for item in menu_items:
        results.append({
            "type": "menu_item",
            "icon": "🍽️",
            "id": item.id,
            "title": item.name,
            "subtitle": f"€{float(item.price):.2f} • {getattr(item, 'category', '')}",
            "url": "menu-editor",
        })

    # Search customers
    from app.models.customer import Customer
    customers = db.query(Customer).filter(
        (Customer.name.ilike(f"%{q}%")) | (Customer.email.ilike(f"%{q}%"))
    ).limit(limit).all()
    for c in customers:
        results.append({
            "type": "customer",
            "icon": "👤",
            "id": c.id,
            "title": c.name,
            "subtitle": c.email or c.phone or '',
            "url": "customers",
        })

    # Search orders
    from app.models.order import Order
    try:
        order_id = int(q)
        orders = db.query(Order).filter(Order.id == order_id).limit(limit).all()
    except ValueError:
        orders = db.query(Order).filter(
            Order.notes.ilike(f"%{q}%")
        ).limit(limit).all()
    for o in orders:
        results.append({
            "type": "order",
            "icon": "📋",
            "id": o.id,
            "title": f"Naročilo #{o.id}",
            "subtitle": f"€{float(o.total or 0):.2f} • {o.status}",
            "url": "order-history",
        })

    # Search suppliers
    from app.models.supplier import Supplier
    suppliers = db.query(Supplier).filter(
        Supplier.name.ilike(f"%{q}%")
    ).limit(limit).all()
    for s in suppliers:
        results.append({
            "type": "supplier",
            "icon": "🚚",
            "id": s.id,
            "title": s.name,
            "subtitle": getattr(s, 'contact_email', '') or getattr(s, 'phone', ''),
            "url": "suppliers",
        })

    # Search ingredients
    from app.models.ingredient import Ingredient
    ingredients = db.query(Ingredient).filter(
        Ingredient.name.ilike(f"%{q}%")
    ).limit(limit).all()
    for ing in ingredients:
        results.append({
            "type": "ingredient",
            "icon": "🧪",
            "id": ing.id,
            "title": ing.name,
            "subtitle": f"Zaloga: {getattr(ing, 'current_stock', 0)} {getattr(ing, 'unit', '')}",
            "url": "inventory",
        })

    # Search users/employees
    from app.models.user import User
    users = db.query(User).filter(
        (User.username.ilike(f"%{q}%")) | (User.full_name.ilike(f"%{q}%"))
    ).limit(limit).all()
    for u in users:
        results.append({
            "type": "user",
            "icon": "👨‍🍳",
            "id": u.id,
            "title": getattr(u, 'full_name', u.username),
            "subtitle": getattr(u, 'role', ''),
            "url": "users",
        })

    # Sort by relevance: exact match > starts with > contains
    def sort_key(r):
        title_lower = r["title"].lower()
        q_lower = q.lower()
        if title_lower == q_lower:
            return 0
        if title_lower.startswith(q_lower):
            return 1
        return 2

    results.sort(key=sort_key)

    return {
        "query": q,
        "results": results[:limit],
        "total": len(results),
    }
