"""Inventory batch operations — bulk updates, transfers, waste."""
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime, timedelta

from app.core.database import get_db
from app.api.v1.auth import get_current_user

router = APIRouter(prefix="/inventory-batch", tags=["Zaloge množične operacije"])


class BatchUpdate(BaseModel):
    ingredient_id: int
    new_stock: float
    notes: Optional[str] = None


class BatchTransfer(BaseModel):
    from_ingredient_id: int
    to_ingredient_id: int
    quantity: float
    notes: Optional[str] = None


class BatchWaste(BaseModel):
    ingredient_id: int
    quantity: float
    reason: str
    notes: Optional[str] = None


@router.post("/stock-update")
def batch_stock_update(updates: List[BatchUpdate], db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Množična posodobitev zalog."""
    from app.models.inventory import Ingredient

    results = []
    for update in updates:
        ing = db.query(Ingredient).filter(Ingredient.id == update.ingredient_id).first()
        if not ing:
            results.append({"id": update.ingredient_id, "error": "Sestavina ni najdena"})
            continue

        old_stock = getattr(ing, 'stock', 0) or 0
        ing.stock = update.new_stock
        results.append({
            "id": update.ingredient_id,
            "name": ing.name,
            "old_stock": old_stock,
            "new_stock": update.new_stock,
            "difference": update.new_stock - old_stock,
        })

    db.commit()

    return {
        "message": f"Posodobljenih {len(results)} sestavin",
        "updated": len([r for r in results if "error" not in r]),
        "errors": len([r for r in results if "error" in r]),
        "results": results,
    }


@router.post("/transfer")
def batch_transfer(transfers: List[BatchTransfer], db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Množični prenos zalog med sestavinami."""
    from app.models.inventory import Ingredient

    results = []
    for transfer in transfers:
        from_ing = db.query(Ingredient).filter(Ingredient.id == transfer.from_ingredient_id).first()
        to_ing = db.query(Ingredient).filter(Ingredient.id == transfer.to_ingredient_id).first()

        if not from_ing or not to_ing:
            results.append({"error": "Sestavina ni najdena"})
            continue

        from_stock = getattr(from_ing, 'stock', 0) or 0
        if from_stock < transfer.quantity:
            results.append({"error": f"Ni dovolj zaloge za {from_ing.name}"})
            continue

        from_ing.stock = from_stock - transfer.quantity
        to_stock = getattr(to_ing, 'stock', 0) or 0
        to_ing.stock = to_stock + transfer.quantity

        results.append({
            "from": from_ing.name,
            "to": to_ing.name,
            "quantity": transfer.quantity,
        })

    db.commit()

    return {
        "message": f"Prenesenih {len(results)} zalog",
        "results": results,
    }


@router.post("/waste")
def batch_waste(waste_items: List[BatchWaste], db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Množično zabeleži odpadke."""
    from app.models.inventory import Ingredient
    from app.models.waste import WasteLog

    results = []
    for waste in waste_items:
        ing = db.query(Ingredient).filter(Ingredient.id == waste.ingredient_id).first()
        if not ing:
            results.append({"id": waste.ingredient_id, "error": "Sestavina ni najdena"})
            continue

        old_stock = getattr(ing, 'stock', 0) or 0
        ing.stock = max(0, old_stock - waste.quantity)

        # Log waste
        waste_log = WasteLog(
            ingredient_id=waste.ingredient_id,
            quantity=waste.quantity,
            reason=waste.reason,
            notes=waste.notes,
            user_id=user.id,
        )
        db.add(waste_log)

        results.append({
            "id": waste.ingredient_id,
            "name": ing.name,
            "quantity": waste.quantity,
            "reason": waste.reason,
        })

    db.commit()

    return {
        "message": f"Zabeleženih {len(results)} odpadkov",
        "results": results,
    }


@router.get("/history")
def get_batch_history(
    days: int = Query(30, ge=1, le=365),
    operation: Optional[str] = None,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Vrni zgodovino množičnih operacij."""
    # In production: fetch from BatchOperationHistory table
    return {
        "period_days": days,
        "operation": operation,
        "history": [],
    }


@router.get("/quick-count")
def quick_count(category: Optional[str] = None, db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Hitro štetje zalog za kategorijo."""
    from app.models.inventory import Ingredient

    q = db.query(Ingredient).filter(Ingredient.is_active == True)
    if category:
        q = q.filter(Ingredient.category == category)

    ingredients = q.all()

    items = []
    for ing in ingredients:
        stock = getattr(ing, 'stock', 0) or 0
        min_stock = getattr(ing, 'min_stock', 0) or 0
        items.append({
            "id": ing.id,
            "name": ing.name,
            "current_stock": stock,
            "min_stock": min_stock,
            "unit": getattr(ing, 'unit', 'kg'),
            "needs_count": stock == 0 and min_stock > 0,
        })

    return {
        "category": category,
        "total_items": len(items),
        "items": items,
    }


@router.post("/cycle-count")
def cycle_count(
    items: List[dict],
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Izvedi ciklično štetje zalog."""
    from app.models.inventory import Ingredient

    results = []
    for item in items:
        ing_id = item.get("ingredient_id")
        counted_stock = item.get("counted_stock")

        if ing_id is None or counted_stock is None:
            continue

        ing = db.query(Ingredient).filter(Ingredient.id == ing_id).first()
        if not ing:
            results.append({"id": ing_id, "error": "Sestavina ni najdena"})
            continue

        old_stock = getattr(ing, 'stock', 0) or 0
        ing.stock = counted_stock
        difference = counted_stock - old_stock

        results.append({
            "id": ing_id,
            "name": ing.name,
            "old_stock": old_stock,
            "counted_stock": counted_stock,
            "difference": difference,
        })

    db.commit()

    return {
        "message": f"Ciklično štetje zaključeno za {len(results)} artiklov",
        "results": results,
        "total_adjustments": sum(1 for r in results if r.get("difference", 0) != 0),
    }