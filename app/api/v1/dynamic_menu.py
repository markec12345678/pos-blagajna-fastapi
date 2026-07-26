from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.database import get_db
from app.models.menu_item import MenuItem
from app.models.category import Category
from app.models.inventory import Ingredient, RecipeItem
from app.models.order import Order, OrderItem
from app.models.dynamic_menu import DynamicMenuSuggestion, MenuItemDemand, WeatherCache
from app.models.settings import Setting
from datetime import datetime, timedelta, date
import json
import math

router = APIRouter(prefix="/dynamic-menu", tags=["dynamic-menu"])


@router.get("/suggestions")
def get_suggestions(db: Session = Depends(get_db), branch_id: int = 0):
    now = datetime.now()
    q = db.query(DynamicMenuSuggestion).filter(
        DynamicMenuSuggestion.is_active == True,
        DynamicMenuSuggestion.valid_from <= now,
        DynamicMenuSuggestion.valid_to >= now
    )
    if branch_id:
        q = q.filter(DynamicMenuSuggestion.branch_id == branch_id)
    suggestions = q.all()
    return [_suggestion_dict(s, db) for s in suggestions]


@router.post("/generate")
def generate_suggestions(db: Session = Depends(get_db), branch_id: int = 0):
    now = datetime.now()
    hour = now.hour
    dow = now.weekday()

    existing = db.query(DynamicMenuSuggestion).filter(
        DynamicMenuSuggestion.is_active == True,
        func.date(DynamicMenuSuggestion.valid_from) == now.date()
    ).delete()

    items = db.query(MenuItem).filter(MenuItem.is_active == True, MenuItem.is_out_of_stock == False)
    if branch_id:
        items = items.filter(MenuItem.branch_id == branch_id)
    items = items.all()

    suggestions = []

    for item in items:
        ing_q = db.query(RecipeItem).filter(RecipeItem.menu_item_id == item.id).all()
        ingredients_ok = True
        low_stock_name = ""
        stock_ratio = 1.0
        for ri in ing_q:
            ing = db.query(Ingredient).filter(Ingredient.id == ri.ingredient_id).first()
            if ing:
                if ing.stock <= 0:
                    ingredients_ok = False
                    low_stock_name = ing.name
                    stock_ratio = 0
                elif ing.stock < ing.min_stock:
                    stock_ratio = min(stock_ratio, ing.stock / ing.min_stock) if ing.min_stock > 0 else 1
                    low_stock_name = ing.name

        if not ingredients_ok:
            continue

        demand = db.query(MenuItemDemand).filter(
            MenuItemDemand.menu_item_id == item.id,
            MenuItemDemand.day_of_week == dow,
            MenuItemDemand.hour == hour
        ).first()

        order_count_7d = db.query(func.sum(OrderItem.quantity)).join(Order).filter(
            OrderItem.menu_item_id == item.id,
            Order.created_at >= now - timedelta(days=7),
            Order.status.in_(["closed", "paid"])
        ).scalar() or 0

        avg_daily = order_count_7d / 7 if order_count_7d else 0

        if stock_ratio < 0.5 and stock_ratio > 0:
            discount = min(30, int((1 - stock_ratio) * 40))
            suggestions.append(_create_suggestion(
                db, item, "overstocked", f"Zaloga {low_stock_name}: {int(stock_ratio*100)}% — porabi pred iztekom",
                discount_pct=discount, branch_id=branch_id
            ))

        if avg_daily > 3 and (hour >= 11 and hour <= 14 or hour >= 18 and hour <= 21):
            suggestions.append(_create_suggestion(
                db, item, "trending",
                f"Priljubljeno: {order_count_7d} kosov v 7 dneh",
                discount_pct=5, branch_id=branch_id
            ))

        if hour >= 14 and hour < 17:
            is_food = db.query(Category).filter(Category.id == item.category_id, Category.name.ilike("%pizza%") | Category.name.ilike("%jed%") | Category.name.ilike("%solat%")).first()
            if is_food:
                suggestions.append(_create_suggestion(
                    db, item, "daily_special",
                    "Popoldanska ponudba — kosilo po znižani ceni",
                    discount_pct=15, branch_id=branch_id
                ))

        if hour >= 22 or hour < 6:
            suggestions.append(_create_suggestion(
                db, item, "daily_special",
                "Nočna ponudba — pozna večerja",
                discount_pct=10, branch_id=branch_id
            ))

    db.commit()
    return {"generated": len(suggestions), "suggestions": [_suggestion_dict(s, db) for s in suggestions]}


@router.post("/apply/{suggestion_id}")
def apply_suggestion(suggestion_id: int, db: Session = Depends(get_db)):
    s = db.query(DynamicMenuSuggestion).filter(DynamicMenuSuggestion.id == suggestion_id).first()
    if not s:
        raise HTTPException(404, "Suggestion not found")
    item = db.query(MenuItem).filter(MenuItem.id == s.menu_item_id).first()
    if item:
        if s.discount_pct > 0:
            item.price = round(s.original_price * (1 - s.discount_pct / 100), 2)
        s.applied_count += 1
        db.commit()
        return {"ok": True, "new_price": item.price, "message": f"Cena posodobljena: {item.price:.2f}€"}
    raise HTTPException(404, "Menu item not found")


@router.post("/dismiss/{suggestion_id}")
def dismiss_suggestion(suggestion_id: int, db: Session = Depends(get_db)):
    s = db.query(DynamicMenuSuggestion).filter(DynamicMenuSuggestion.id == suggestion_id).first()
    if not s:
        raise HTTPException(404, "Suggestion not found")
    s.is_active = False
    db.commit()
    return {"ok": True}


@router.post("/reset-prices")
def reset_prices(db: Session = Depends(get_db), branch_id: int = 0):
    suggestions = db.query(DynamicMenuSuggestion).filter(
        DynamicMenuSuggestion.applied_count > 0
    )
    if branch_id:
        suggestions = suggestions.filter(DynamicMenuSuggestion.branch_id == branch_id)
    suggestions = suggestions.all()

    reset_count = 0
    for s in suggestions:
        item = db.query(MenuItem).filter(MenuItem.id == s.menu_item_id).first()
        if item and abs(item.price - s.original_price) > 0.01:
            item.price = s.original_price
            reset_count += 1
        s.is_active = False
    db.commit()
    return {"reset": reset_count}


@router.get("/demand/{menu_item_id}")
def get_item_demand(menu_item_id: int, db: Session = Depends(get_db)):
    demands = db.query(MenuItemDemand).filter(
        MenuItemDemand.menu_item_id == menu_item_id
    ).all()

    grid = {}
    for d in demands:
        grid[f"{d.day_of_week}_{d.hour}"] = {
            "orders": d.order_count, "quantity": d.total_quantity,
            "avg_prep": d.avg_prep_time
        }

    total_7d = db.query(func.sum(OrderItem.quantity)).join(Order).filter(
        OrderItem.menu_item_id == menu_item_id,
        Order.created_at >= datetime.now() - timedelta(days=7),
        Order.status.in_(["closed", "paid"])
    ).scalar() or 0

    return {
        "menu_item_id": menu_item_id,
        "total_7d": total_7d,
        "avg_daily": round(total_7d / 7, 1) if total_7d else 0,
        "demand_grid": grid
    }


@router.post("/record-order")
def record_order_from_items(order_id: int, db: Session = Depends(get_db)):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(404, "Order not found")

    created = order.created_at or datetime.now()
    dow = created.weekday()
    hour = created.hour

    for item in order.items:
        demand = db.query(MenuItemDemand).filter(
            MenuItemDemand.menu_item_id == item.menu_item_id,
            MenuItemDemand.day_of_week == dow,
            MenuItemDemand.hour == hour
        ).first()

        if not demand:
            demand = MenuItemDemand(
                menu_item_id=item.menu_item_id, day_of_week=dow, hour=hour,
                order_count=0, total_quantity=0
            )
            db.add(demand)

        demand.order_count += 1
        demand.total_quantity += item.quantity

    db.commit()
    return {"ok": True, "recorded_items": len(order.items)}


@router.get("/insights")
def get_dynamic_menu_insights(db: Session = Depends(get_db), branch_id: int = 0):
    now = datetime.now()
    dow = now.weekday()
    hour = now.hour

    top_trending = db.query(
        MenuItem.id, MenuItem.name, func.sum(OrderItem.quantity).label("qty")
    ).join(Order).filter(
        Order.created_at >= now - timedelta(days=7),
        Order.status.in_(["closed", "paid"])
    ).group_by(MenuItem.id).order_by(func.sum(OrderItem.quantity).desc())

    if branch_id:
        top_trending = top_trending.filter(Order.branch_id == branch_id)
    top_trending = top_trending.limit(5).all()

    low_stock_items = []
    items = db.query(MenuItem).filter(MenuItem.is_active == True, MenuItem.is_out_of_stock == False)
    if branch_id:
        items = items.filter(MenuItem.branch_id == branch_id)
    for item in items.all():
        recipes = db.query(RecipeItem).filter(RecipeItem.menu_item_id == item.id).all()
        for ri in recipes:
            ing = db.query(Ingredient).filter(Ingredient.id == ri.ingredient_id).first()
            if ing and ing.stock < ing.min_stock * 0.5:
                low_stock_items.append({"item": item.name, "ingredient": ing.name, "stock": ing.stock, "min": ing.min_stock})
                break

    active_suggestions = db.query(DynamicMenuSuggestion).filter(
        DynamicMenuSuggestion.is_active == True
    ).count()

    return {
        "trending": [{"id": t[0], "name": t[1], "qty_7d": t[2]} for t in top_trending],
        "low_stock_warnings": low_stock_items[:10],
        "active_suggestions": active_suggestions,
        "current_hour": hour,
        "day_of_week": dow,
        "time_category": _time_category(hour)
    }


@router.put("/settings")
def update_dynamic_menu_settings(data: dict, db: Session = Depends(get_db)):
    for k, v in data.items():
        row = db.query(Setting).filter(Setting.key == f"dynamic_menu_{k}").first()
        if row:
            row.value = str(v)
        else:
            db.add(Setting(key=f"dynamic_menu_{k}", value=str(v)))
    db.commit()
    return {"ok": True}


@router.get("/settings")
def get_dynamic_menu_settings(db: Session = Depends(get_db)):
    s = {}
    for k in ["enabled", "auto_generate", "max_discount", "weather_enabled"]:
        row = db.query(Setting).filter(Setting.key == f"dynamic_menu_{k}").first()
        s[k] = row.value if row else ("true" if k in ("enabled",) else "30" if k == "max_discount" else "false")
    return s


def _time_category(hour: int) -> str:
    if 6 <= hour < 10: return "zajtrk"
    if 10 <= hour < 14: return "kosilo"
    if 14 <= hour < 17: return "popoldne"
    if 17 <= hour < 21: return "večerja"
    return "pozno"


def _create_suggestion(db: Session, item: MenuItem, stype: str, reason: str, discount_pct: int = 0, branch_id: int = 0):
    now = datetime.now()
    s = DynamicMenuSuggestion(
        menu_item_id=item.id, suggestion_type=stype,
        original_price=item.price,
        suggested_price=round(item.price * (1 - discount_pct / 100), 2) if discount_pct else item.price,
        discount_pct=discount_pct, reason=reason,
        valid_from=now.replace(hour=0, minute=0, second=0),
        valid_to=now.replace(hour=23, minute=59, second=59),
        is_active=True, branch_id=branch_id or item.branch_id
    )
    db.add(s)
    return s


def _suggestion_dict(s: DynamicMenuSuggestion, db: Session) -> dict:
    item = db.query(MenuItem).filter(MenuItem.id == s.menu_item_id).first()
    return {
        "id": s.id, "menu_item_id": s.menu_item_id,
        "item_name": item.name if item else "?", "item_price": item.price if item else 0,
        "suggestion_type": s.suggestion_type,
        "original_price": s.original_price, "suggested_price": s.suggested_price,
        "discount_pct": s.discount_pct, "reason": s.reason,
        "valid_from": s.valid_from.isoformat() if s.valid_from else None,
        "valid_to": s.valid_to.isoformat() if s.valid_to else None,
        "is_active": s.is_active, "applied_count": s.applied_count
    }
