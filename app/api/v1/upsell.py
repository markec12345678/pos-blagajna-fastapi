from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.database import get_db
from app.models.menu_item import MenuItem, CrossSellItem
from app.models.order import Order, OrderItem
from app.models.inventory import Ingredient, RecipeItem
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timedelta

router = APIRouter(prefix="/upsell", tags=["upsell"])


class CartItem(BaseModel):
    name: str
    price: float
    category_id: Optional[int] = None
    quantity: int = 1


class UpsellRequest(BaseModel):
    cart_items: list[CartItem]
    total: float = 0
    hour: Optional[int] = None
    customer_id: Optional[int] = None


@router.post("/suggestions")
def get_upsell_suggestions(data: UpsellRequest, db: Session = Depends(get_db)):
    hour = data.hour or datetime.now().hour
    cart_names = [c.name.lower() for c in data.cart_items]
    cart_categories = [c.category_id for c in data.cart_items if c.category_id]
    total = data.total or sum(c.price * c.quantity for c in data.cart_items)

    suggestions = []

    cross_sell = db.query(CrossSellItem).filter(
        CrossSellItem.item_id.in_(
            db.query(MenuItem.id).filter(MenuItem.name.ilike("%" + name + "%")).scalar_subquery()
            for name in cart_names[:5]
        ) if cart_names else CrossSellItem.item_id == -1
    ).all()

    seen_ids = set()
    for cs in cross_sell:
        item = db.query(MenuItem).filter(MenuItem.id == cs.suggested_id, MenuItem.is_active == True).first()
        if item and item.id not in seen_ids and not item.is_out_of_stock:
            if item.name.lower() not in cart_names:
                seen_ids.add(item.id)
                suggestions.append({
                    "id": item.id, "name": item.name, "price": item.price,
                    "reason": f"{'Klasična kombinacija' if cs.type == 'cross-sell' else 'Nadgradnja'}",
                    "type": cs.type, "priority": 1
                })

    popular = db.query(
        MenuItem.id, MenuItem.name, MenuItem.price,
        func.sum(OrderItem.quantity).label("qty")
    ).join(OrderItem).join(Order).filter(
        Order.status.in_(["closed", "paid"]),
        Order.created_at >= datetime.now() - timedelta(days=30)
    ).group_by(MenuItem.id).order_by(func.sum(OrderItem.quantity).desc()).limit(10).all()

    for p in popular:
        if p.id not in seen_ids and p.name.lower() not in cart_names:
            item = db.query(MenuItem).filter(MenuItem.id == p.id).first()
            if item and not item.is_out_of_stock:
                seen_ids.add(p.id)
                suggestions.append({
                    "id": p.id, "name": p.name, "price": p.price,
                    "reason": f"Priljubljeno ({p.qty}× prodano)",
                    "type": "popular", "priority": 2
                })

    if not cart_names:
        time_suggestions = _time_based_suggestions(hour, db)
        for ts in time_suggestions:
            if ts["id"] not in seen_ids:
                seen_ids.add(ts["id"])
                suggestions.append({**ts, "priority": 0})

    if total > 0 and total < 15:
        cheap_items = db.query(MenuItem).filter(
            MenuItem.is_active == True, MenuItem.is_out_of_stock == False,
            MenuItem.price < 5
        ).order_by(func.random()).limit(2).all()
        for ci in cheap_items:
            if ci.id not in seen_ids:
                seen_ids.add(ci.id)
                suggestions.append({
                    "id": ci.id, "name": ci.name, "price": ci.price,
                    "reason": "Dodaj za popoln obrok",
                    "type": "upsell", "priority": 3
                })

    if total > 20 and total < 40:
        desserts = db.query(MenuItem).filter(
            MenuItem.is_active == True, MenuItem.is_out_of_stock == False,
            MenuItem.category_id.in_(
                db.query(func.distinct(MenuItem.category_id)).filter(
                    MenuItem.name.ilike("%sladica%") | MenuItem.name.ilike("%tiramisu%") | MenuItem.name.ilike("%panna%")
                ).scalar_subquery()
            )
        ).limit(2).all()
        for d in desserts:
            if d.id not in seen_ids:
                seen_ids.add(d.id)
                suggestions.append({
                    "id": d.id, "name": d.name, "price": d.price,
                    "reason": "Zaključi z sladico 🍰",
                    "type": "upsell", "priority": 3
                })

    suggestions.sort(key=lambda x: x["priority"])
    return {"suggestions": suggestions[:6]}


@router.post("/smart-promo")
def get_smart_promo(data: UpsellRequest, db: Session = Depends(get_db)):
    total = data.total or sum(c.price * c.quantity for c in data.cart_items)
    count = sum(c.quantity for c in data.cart_items)

    promos = []

    if count >= 3:
        promos.append({
            "type": "bundle", "title": "3+ artikli",
            "discount": round(total * 0.05, 2),
            "description": "5% popust za 3+ artikle"
        })

    if total > 25:
        promos.append({
            "type": "threshold", "title": "Nad 25€",
            "discount": 2.0,
            "description": "2€ popusta za naročila nad 25€"
        })

    hour = data.hour or datetime.now().hour
    if 11 <= hour <= 14:
        promos.append({
            "type": "lunch", "title": "Kosilo",
            "discount": round(total * 0.1, 2),
            "description": "10% kosilo popust (11-14h)"
        })

    if data.customer_id:
        orders_count = db.query(func.count(Order.id)).filter(
            Order.customer_id == data.customer_id,
            Order.status.in_(["closed", "paid"])
        ).scalar() or 0
        if orders_count >= 10:
            promos.append({
                "type": "loyalty", "title": "Redni gost",
                "discount": round(total * 0.05, 2),
                "description": "5% popust za zveste stranke"
            })

    return {"promos": promos, "total_savings": round(sum(p["discount"] for p in promos), 2)}


def _time_based_suggestions(hour: int, db: Session) -> list:
    results = []
    if 6 <= hour < 10:
        keywords = ["kava", "čaj", "zajtrk", "toast"]
    elif 10 <= hour < 14:
        keywords = ["solata", "juha", "kosilo"]
    elif 14 <= hour < 17:
        keywords = ["kava", "sladica", "torta"]
    elif 17 <= hour < 21:
        keywords = ["pizza", "testenine", "zrezek"]
    else:
        keywords = ["pivo", "vino", "prigrizek"]

    for kw in keywords:
        item = db.query(MenuItem).filter(
            MenuItem.is_active == True, MenuItem.is_out_of_stock == False,
            MenuItem.name.ilike(f"%{kw}%")
        ).first()
        if item:
            results.append({
                "id": item.id, "name": item.name, "price": item.price,
                "reason": f"Predlagano ob {hour}:00",
                "type": "time"
            })

    return results[:3]
