"""Inventory alerts and auto-ordering system."""
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime, timedelta

from app.core.database import get_db
from app.api.v1.auth import get_current_user

router = APIRouter(prefix="/inventory-alerts", tags=["Inventory opozorila"])


class AlertRule(BaseModel):
    ingredient_id: int
    alert_level: str = "warning"  # warning, critical, emergency
    threshold: float = 0
    auto_order: bool = False
    order_quantity: float = 0
    supplier_id: Optional[int] = None


@router.get("/rules")
def get_alert_rules(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Vrni pravila za opozorila zalog."""
    from app.models.inventory import Ingredient

    ingredients = db.query(Ingredient).filter(Ingredient.is_active == True).all()

    rules = []
    for ing in ingredients:
        min_stock = getattr(ing, 'min_stock', 0) or 0
        stock = getattr(ing, 'stock', 0) or 0
        
        if min_stock > 0:
            # Determine alert level
            if stock == 0:
                level = "emergency"
            elif stock < min_stock * 0.5:
                level = "critical"
            elif stock <= min_stock:
                level = "warning"
            else:
                level = "ok"

            rules.append({
                "ingredient_id": ing.id,
                "ingredient_name": ing.name,
                "current_stock": stock,
                "min_stock": min_stock,
                "unit": getattr(ing, 'unit', 'kg'),
                "alert_level": level,
                "auto_order": False,
                "order_quantity": min_stock * 2 - stock if stock < min_stock else 0,
                "supplier_id": getattr(ing, 'supplier_id', None),
            })

    return {"rules": rules}


@router.post("/rules")
def update_alert_rule(data: AlertRule, db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Posodobi pravilo za opozorilo."""
    from app.models.inventory import Ingredient

    ing = db.query(Ingredient).filter(Ingredient.id == data.ingredient_id).first()
    if not ing:
        return {"error": "Sestavina ni najdena"}

    # In production: save to AlertRule table
    return {
        "message": f"Pravilo za {ing.name} posodobljeno",
        "ingredient_id": data.ingredient_id,
        "alert_level": data.alert_level,
        "auto_order": data.auto_order,
    }


@router.get("/active")
def get_active_alerts(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Vrni aktivna opozorila za nizko zalogo."""
    from app.models.inventory import Ingredient

    ingredients = db.query(Ingredient).filter(Ingredient.is_active == True).all()

    alerts = []
    for ing in ingredients:
        min_stock = getattr(ing, 'min_stock', 0) or 0
        stock = getattr(ing, 'stock', 0) or 0
        
        if min_stock > 0 and stock <= min_stock:
            if stock == 0:
                level = "emergency"
                urgency = 1
            elif stock < min_stock * 0.5:
                level = "critical"
                urgency = 2
            else:
                level = "warning"
                urgency = 3

            alerts.append({
                "id": ing.id,
                "ingredient_name": ing.name,
                "current_stock": stock,
                "min_stock": min_stock,
                "unit": getattr(ing, 'unit', 'kg'),
                "alert_level": level,
                "urgency": urgency,
                "days_until_stockout": max(0, int(stock / (min_stock / 7))) if min_stock > 0 else 0,
                "supplier_id": getattr(ing, 'supplier_id', None),
            })

    alerts.sort(key=lambda x: x["urgency"])

    return {
        "alerts": alerts,
        "total": len(alerts),
        "emergency": len([a for a in alerts if a["alert_level"] == "emergency"]),
        "critical": len([a for a in alerts if a["alert_level"] == "critical"]),
        "warning": len([a for a in alerts if a["alert_level"] == "warning"]),
    }


@router.post("/auto-order")
def auto_order_low_stock(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Avtomatsko naroči artikle pod minimalno zalogo."""
    from app.models.inventory import Ingredient
    from app.models.supplier import Supplier

    ingredients = db.query(Ingredient).filter(
        Ingredient.is_active == True,
        Ingredient.supplier_id.isnot(None)
    ).all()

    orders_by_supplier = {}
    for ing in ingredients:
        min_stock = getattr(ing, 'min_stock', 0) or 0
        stock = getattr(ing, 'stock', 0) or 0
        supplier_id = getattr(ing, 'supplier_id', None)

        if min_stock > 0 and stock <= min_stock and supplier_id:
            if supplier_id not in orders_by_supplier:
                supplier = db.query(Supplier).filter(Supplier.id == supplier_id).first()
                orders_by_supplier[supplier_id] = {
                    "supplier": supplier,
                    "items": []
                }
            
            reorder_qty = min_stock * 2 - stock
            orders_by_supplier[supplier_id]["items"].append({
                "ingredient_id": ing.id,
                "name": ing.name,
                "quantity": reorder_qty,
                "unit": getattr(ing, 'unit', 'kg'),
            })

    created_orders = []
    for supplier_id, data in orders_by_supplier.items():
        supplier = data["supplier"]
        if supplier and data["items"]:
            created_orders.append({
                "supplier_id": supplier_id,
                "supplier_name": supplier.name if supplier else "Neznan",
                "items": data["items"],
                "total_items": len(data["items"]),
                "status": "pending"
            })

    return {
        "message": f"Pripravljena {len(created_orders)} naročil",
        "orders": created_orders,
    }


@router.get("/history")
def get_alert_history(
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Vrni zgodovino opozoril."""
    # In production: fetch from AlertHistory table
    return {
        "period_days": days,
        "history": [],
        "total_alerts": 0,
        "resolved": 0,
        "pending": 0,
    }


@router.get("/statistics")
def get_alert_statistics(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Statistika opozoril."""
    from app.models.inventory import Ingredient

    ingredients = db.query(Ingredient).filter(Ingredient.is_active == True).all()

    total = 0
    by_level = {"ok": 0, "warning": 0, "critical": 0, "emergency": 0}
    by_category = {}

    for ing in ingredients:
        min_stock = getattr(ing, 'min_stock', 0) or 0
        stock = getattr(ing, 'stock', 0) or 0
        
        if min_stock > 0:
            total += 1
            if stock == 0:
                by_level["emergency"] += 1
            elif stock < min_stock * 0.5:
                by_level["critical"] += 1
            elif stock <= min_stock:
                by_level["warning"] += 1
            else:
                by_level["ok"] += 1

    return {
        "total_ingredients": total,
        "by_level": by_level,
        "health_score": round(by_level["ok"] / total * 100, 1) if total > 0 else 100,
    }