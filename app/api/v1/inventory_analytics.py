"""Advanced Inventory Analytics API — ABC analitika, poročila zalog."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime, timedelta
from collections import defaultdict

from app.core.database import get_db
from app.api.v1.auth import get_current_user

router = APIRouter(prefix="/inventory-analytics", tags=["Analitika zalog"])


@router.get("/abc")
def abc_analysis(
    days: int = Query(90, ge=7, le=365),
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """ABC analiza zalog — kategorizacija artiklov po porabi."""
    from app.models.inventory import StockTransaction
    from app.models.ingredient import Ingredient

    start = datetime.now() - timedelta(days=days)

    # Get all stock transactions
    txs = db.query(StockTransaction).filter(
        StockTransaction.created_at >= start,
        StockTransaction.type.in_(['deduct', 'adjustment', 'waste'])
    ).all()

    # Aggregate by ingredient
    usage = defaultdict(float)
    for tx in txs:
        ing_id = getattr(tx, 'ingredient_id', 0)
        qty = abs(float(getattr(tx, 'quantity', 0) or 0))
        usage[ing_id] += qty

    # Get ingredient details
    ingredients = db.query(Ingredient).all()
    ing_map = {i.id: i for i in ingredients}

    # Calculate total usage
    total_usage = sum(usage.values()) or 1

    # ABC Classification
    items = []
    for ing_id, qty in sorted(usage.items(), key=lambda x: x[1], reverse=True):
        ing = ing_map.get(ing_id)
        if not ing:
            continue
        pct = (qty / total_usage) * 100
        items.append({
            "id": ing_id,
            "name": ing.name,
            "usage_quantity": round(qty, 2),
            "usage_percentage": round(pct, 1),
            "current_stock": float(getattr(ing, 'current_stock', 0) or 0),
            "unit": getattr(ing, 'unit', 'kg'),
            "cost_per_unit": float(getattr(ing, 'cost_per_unit', 0) or 0),
        })

    # Assign ABC categories
    cumulative = 0
    for item in items:
        cumulative += item["usage_percentage"]
        if cumulative <= 80:
            item["category"] = "A"
        elif cumulative <= 95:
            item["category"] = "B"
        else:
            item["category"] = "C"

    a_count = sum(1 for i in items if i["category"] == "A")
    b_count = sum(1 for i in items if i["category"] == "B")
    c_count = sum(1 for i in items if i["category"] == "C")

    return {
        "period_days": days,
        "summary": {
            "total_items": len(items),
            "a_items": a_count,
            "b_items": b_count,
            "c_items": c_count,
            "a_pct_items": round(a_count / len(items) * 100, 1) if items else 0,
        },
        "items": items,
    }


@router.get("/stock-valuation")
def stock_valuation(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Vrednost zalog."""
    from app.models.ingredient import Ingredient

    ingredients = db.query(Ingredient).filter(Ingredient.is_active == True).all()

    total_value = 0
    items = []
    for ing in ingredients:
        stock = float(getattr(ing, 'current_stock', 0) or 0)
        cost = float(getattr(ing, 'cost_per_unit', 0) or 0)
        value = stock * cost
        total_value += value

        items.append({
            "id": ing.id,
            "name": ing.name,
            "stock": stock,
            "unit": getattr(ing, 'unit', 'kg'),
            "cost_per_unit": cost,
            "total_value": round(value, 2),
        })

    items.sort(key=lambda x: x["total_value"], reverse=True)

    return {
        "total_value": round(total_value, 2),
        "items": items,
        "top_5_by_value": items[:5],
    }


@router.get("/waste-report")
def waste_report(
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Poročilo o zavrženi hrani."""
    from app.models.inventory import StockTransaction
    from app.models.ingredient import Ingredient

    start = datetime.now() - timedelta(days=days)

    txs = db.query(StockTransaction).filter(
        StockTransaction.created_at >= start,
        StockTransaction.type == 'waste'
    ).all()

    waste_by_ingredient = defaultdict(float)
    waste_cost = 0

    ingredients = db.query(Ingredient).all()
    ing_map = {i.id: i for i in ingredients}

    for tx in txs:
        ing_id = getattr(tx, 'ingredient_id', 0)
        qty = abs(float(getattr(tx, 'quantity', 0) or 0))
        waste_by_ingredient[ing_id] += qty

        ing = ing_map.get(ing_id)
        if ing:
            cost = float(getattr(ing, 'cost_per_unit', 0) or 0)
            waste_cost += qty * cost

    waste_items = []
    for ing_id, qty in sorted(waste_by_ingredient.items(), key=lambda x: x[1], reverse=True):
        ing = ing_map.get(ing_id)
        if ing:
            cost = float(getattr(ing, 'cost_per_unit', 0) or 0)
            waste_items.append({
                "name": ing.name,
                "quantity": round(qty, 2),
                "unit": getattr(ing, 'unit', 'kg'),
                "cost": round(qty * cost, 2),
            })

    return {
        "period_days": days,
        "total_waste_cost": round(waste_cost, 2),
        "total_waste_items": len(waste_items),
        "items": waste_items,
    }


@router.get("/reorder-suggestions")
def reorder_suggestions(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Predlogi za naročilo zalog."""
    from app.models.ingredient import Ingredient
    from app.models.inventory import StockTransaction
    from datetime import datetime, timedelta

    ingredients = db.query(Ingredient).filter(Ingredient.is_active == True).all()

    suggestions = []
    for ing in ingredients:
        stock = float(getattr(ing, 'current_stock', 0) or 0)
        min_stock = float(getattr(ing, 'min_stock', 0) or 0)
        max_stock = float(getattr(ing, 'max_stock', 0) or 0)
        cost = float(getattr(ing, 'cost_per_unit', 0) or 0)

        # Calculate daily usage (last 30 days)
        start = datetime.now() - timedelta(days=30)
        txs = db.query(StockTransaction).filter(
            StockTransaction.ingredient_id == ing.id,
            StockTransaction.created_at >= start,
            StockTransaction.type.in_(['deduct', 'waste'])
        ).all()

        daily_usage = sum(abs(float(getattr(tx, 'quantity', 0) or 0)) for tx in txs) / 30

        # Days until stockout
        days_until_stockout = stock / daily_usage if daily_usage > 0 else float('inf')

        # Urgency
        if stock <= 0:
            urgency = "critical"
        elif days_until_stockout <= 3:
            urgency = "urgent"
        elif days_until_stockout <= 7:
            urgency = "warning"
        elif stock < min_stock:
            urgency = "low"
        else:
            urgency = "ok"

        if urgency != "ok":
            # Suggested order quantity (restock to max or 7-day supply)
            target = max(max_stock or 0, daily_usage * 7)
            suggested_qty = max(0, target - stock)

            suggestions.append({
                "id": ing.id,
                "name": ing.name,
                "current_stock": stock,
                "min_stock": min_stock,
                "daily_usage": round(daily_usage, 2),
                "days_until_stockout": round(days_until_stockout, 1) if days_until_stockout != float('inf') else None,
                "urgency": urgency,
                "suggested_order_qty": round(suggested_qty, 2),
                "unit": getattr(ing, 'unit', 'kg'),
                "estimated_cost": round(suggested_qty * cost, 2),
            })

    urgency_order = {"critical": 0, "urgent": 1, "warning": 2, "low": 3}
    suggestions.sort(key=lambda x: urgency_order.get(x["urgency"], 99))

    return {
        "total_suggestions": len(suggestions),
        "total_estimated_cost": round(sum(s["estimated_cost"] for s in suggestions), 2),
        "suggestions": suggestions,
    }
