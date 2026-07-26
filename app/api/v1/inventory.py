from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from typing import List
from app.core.database import get_db
from app.models.inventory import Ingredient, RecipeItem, StockTransaction, StockCountSession, StockCountItem
from app.models.order import Order, OrderItem
from app.models.menu_item import MenuItem
from app.models.supplier import Supplier
from app.schemas.inventory import (
    IngredientCreate, IngredientUpdate, AddStock, RecordWaste,
    DeductIngredients, RecipeCreate, StockCountSessionCreate, StockCountItemUpdate
)
from datetime import datetime, timedelta

router = APIRouter(prefix="/inventory", tags=["inventory"])


@router.get("/ingredients")
def list_ingredients(category: str = "", branch_id: int = 0, supplier_id: int = 0, db: Session = Depends(get_db)):
    q = db.query(Ingredient)
    if category:
        q = q.filter(Ingredient.category == category)
    if branch_id:
        q = q.filter(Ingredient.branch_id == branch_id)
    if supplier_id:
        q = q.filter(Ingredient.supplier_id == supplier_id)
    ingredients = q.order_by(Ingredient.category, Ingredient.name).all()
    suppliers = {s.id: s for s in db.query(Supplier).all()}
    result = []
    for i in ingredients:
        low_stock = i.min_stock > 0 and i.stock <= i.min_stock
        result.append({
            "id": i.id,
            "name": i.name,
            "unit": i.unit,
            "category": i.category,
            "stock": i.stock,
            "min_stock": i.min_stock,
            "cost_per_unit": i.cost_per_unit,
            "low_stock": low_stock,
            "supplier_id": i.supplier_id,
            "supplier_name": suppliers[i.supplier_id].name if i.supplier_id and i.supplier_id in suppliers else None,
            "barcode": i.barcode or ""
        })
    return result


@router.post("/ingredients")
def create_ingredient(data: IngredientCreate, db: Session = Depends(get_db)):
    ing = Ingredient(
        name=data.name,
        unit=data.unit,
        category=data.category,
        stock=data.stock,
        min_stock=data.min_stock,
        cost_per_unit=data.cost_per_unit,
        supplier_id=data.supplier_id,
        barcode=data.barcode
    )
    db.add(ing)
    db.commit()
    db.refresh(ing)
    return {"id": ing.id, "name": ing.name}


@router.put("/ingredients/{ingredient_id}")
def update_ingredient(ingredient_id: int, data: IngredientUpdate, db: Session = Depends(get_db)):
    ing = db.query(Ingredient).filter(Ingredient.id == ingredient_id).first()
    if not ing:
        raise HTTPException(404, "Ingredient not found")
    update_data = data.model_dump(exclude_unset=True)
    for k, v in update_data.items():
        setattr(ing, k, v)
    db.commit()
    return {"id": ing.id, "name": ing.name}


@router.post("/stock")
def add_stock(data: AddStock, db: Session = Depends(get_db)):
    ing = db.query(Ingredient).filter(Ingredient.id == data.ingredient_id).first()
    if not ing:
        raise HTTPException(404, "Ingredient not found")
    ing.stock += data.quantity
    tx = StockTransaction(
        ingredient_id=ing.id,
        type=data.type,
        quantity=data.quantity,
        note=data.note
    )
    db.add(tx)
    db.commit()
    return {"id": ing.id, "stock": ing.stock}


@router.post("/waste")
def record_waste(data: RecordWaste, db: Session = Depends(get_db)):
    ing = db.query(Ingredient).filter(Ingredient.id == data.ingredient_id).first()
    if not ing:
        raise HTTPException(404, "Ingredient not found")
    qty = abs(data.quantity)
    ing.stock -= qty
    tx = StockTransaction(
        ingredient_id=ing.id,
        type="waste",
        quantity=-qty,
        note=data.reason
    )
    db.add(tx)
    db.commit()
    return {"id": ing.id, "stock": ing.stock}


@router.post("/deduct")
def deduct_ingredients(data: DeductIngredients, db: Session = Depends(get_db)):
    deductions = []
    for item in data.items:
        menu_item_id = item.menu_item_id
        quantity = item.quantity
        recipes = db.query(RecipeItem).filter(
            RecipeItem.menu_item_id == menu_item_id
        ).all()
        for r in recipes:
            ing = db.query(Ingredient).filter(Ingredient.id == r.ingredient_id).first()
            if ing:
                deduct_qty = r.quantity * quantity
                ing.stock -= deduct_qty
                tx = StockTransaction(
                    ingredient_id=ing.id,
                    type="sale",
                    quantity=-deduct_qty,
                    note=f"Naročilo #{data.order_id or '?'} - artikel #{menu_item_id}"
                )
                db.add(tx)
                deductions.append({
                    "ingredient_id": ing.id,
                    "name": ing.name,
                    "deducted": deduct_qty,
                    "remaining": ing.stock
                })
    db.commit()
    return {"deductions": deductions}


@router.get("/low-stock")
def low_stock_alerts(db: Session = Depends(get_db)):
    ingredients = db.query(Ingredient).filter(
        Ingredient.min_stock > 0,
        Ingredient.stock <= Ingredient.min_stock
    ).all()
    return [{"id": i.id, "name": i.name, "stock": i.stock, "min_stock": i.min_stock} for i in ingredients]


@router.get("/check-stock/{menu_item_id}")
def check_item_stock(menu_item_id: int, quantity: int = 1, db: Session = Depends(get_db)):
    recipes = db.query(RecipeItem).filter(RecipeItem.menu_item_id == menu_item_id).all()
    warnings = []
    for r in recipes:
        ing = db.query(Ingredient).filter(Ingredient.id == r.ingredient_id).first()
        if ing:
            needed = r.quantity * quantity
            remaining = ing.stock - needed
            if ing.min_stock > 0 and remaining <= ing.min_stock:
                warnings.append({
                    "ingredient_id": ing.id,
                    "name": ing.name,
                    "stock": ing.stock,
                    "min_stock": ing.min_stock,
                    "needed": needed,
                    "remaining": remaining,
                    "critical": remaining <= 0
                })
    return {"menu_item_id": menu_item_id, "warnings": warnings, "has_warnings": len(warnings) > 0}


@router.get("/transactions")
def list_transactions(ingredient_id: int = 0, db: Session = Depends(get_db)):
    q = db.query(StockTransaction)
    if ingredient_id:
        q = q.filter(StockTransaction.ingredient_id == ingredient_id)
    transactions = q.order_by(StockTransaction.created_at.desc()).limit(100).all()
    return [{
        "id": t.id,
        "ingredient_id": t.ingredient_id,
        "type": t.type,
        "quantity": t.quantity,
        "note": t.note,
        "created_at": t.created_at.isoformat() if t.created_at else ""
    } for t in transactions]


@router.get("/recipes")
def list_recipes(db: Session = Depends(get_db)):
    recipes = db.query(RecipeItem).all()
    result = []
    for r in recipes:
        ing = db.query(Ingredient).filter(Ingredient.id == r.ingredient_id).first()
        result.append({
            "id": r.id,
            "menu_item_id": r.menu_item_id,
            "ingredient_id": r.ingredient_id,
            "ingredient_name": ing.name if ing else "",
            "quantity": r.quantity
        })
    return result


@router.post("/recipes")
def create_recipe(data: RecipeCreate, db: Session = Depends(get_db)):
    recipe = RecipeItem(
        menu_item_id=data.menu_item_id,
        ingredient_id=data.ingredient_id,
        quantity=data.quantity
    )
    db.add(recipe)
    db.commit()
    db.refresh(recipe)
    return {"id": recipe.id}


@router.delete("/recipes/{recipe_id}")
def delete_recipe(recipe_id: int, db: Session = Depends(get_db)):
    recipe = db.query(RecipeItem).filter(RecipeItem.id == recipe_id).first()
    if not recipe:
        raise HTTPException(404, "Recipe not found")
    db.delete(recipe)
    db.commit()
    return {"ok": True}


@router.get("/variance")
def inventory_variance(days: int = 7, db: Session = Depends(get_db)):
    since = datetime.now() - timedelta(days=days)
    closed_orders = db.query(Order).filter(Order.closed_at >= since, Order.status == "closed").all()

    sold_items: dict[int, float] = {}
    for o in closed_orders:
        for oi in db.query(OrderItem).filter(OrderItem.order_id == o.id).all():
            if oi.menu_item_id:
                sold_items[oi.menu_item_id] = sold_items.get(oi.menu_item_id, 0) + oi.quantity

    theoretical: dict[int, float] = {}
    for mid, qty in sold_items.items():
        recipes = db.query(RecipeItem).filter(RecipeItem.menu_item_id == mid).all()
        for r in recipes:
            theoretical[r.ingredient_id] = theoretical.get(r.ingredient_id, 0) + r.quantity * qty

    actual_deductions = db.query(
        StockTransaction.ingredient_id,
        func.sum(StockTransaction.quantity).label("total")
    ).filter(
        StockTransaction.type == "sale",
        StockTransaction.created_at >= since
    ).group_by(StockTransaction.ingredient_id).all()
    actual = {a.ingredient_id: abs(a.total) for a in actual_deductions}

    ingredients = {i.id: i for i in db.query(Ingredient).all()}
    result = []
    for ing_id, theo_usage in theoretical.items():
        actual_usage = actual.get(ing_id, 0)
        ing = ingredients.get(ing_id)
        variance = actual_usage - theo_usage if theo_usage > 0 else 0
        variance_pct = round(variance / theo_usage * 100, 1) if theo_usage > 0 else 0
        cost_impact = round(variance * (ing.cost_per_unit if ing else 0), 2)
        result.append({
            "ingredient_id": ing_id,
            "ingredient_name": ing.name if ing else "—",
            "unit": ing.unit if ing else "",
            "theoretical": round(theo_usage, 2),
            "actual": round(actual_usage, 2),
            "variance": round(variance, 2),
            "variance_pct": variance_pct,
            "cost_impact": cost_impact
        })

    result.sort(key=lambda r: abs(r["variance"]), reverse=True)
    total_cost_impact = sum(r["cost_impact"] for r in result)
    return {"items": result, "total_cost_impact": round(total_cost_impact, 2), "days": days}


# ---------- Stocktaking ----------

@router.get("/stock-counts")
def list_stock_count_sessions(branch_id: int = 0, db: Session = Depends(get_db)):
    q = db.query(StockCountSession).order_by(StockCountSession.created_at.desc())
    if branch_id:
        q = q.filter(StockCountSession.branch_id == branch_id)
    sessions = q.all()
    result = []
    for s in sessions:
        items = db.query(StockCountItem).filter(StockCountItem.session_id == s.id).all()
        counted = sum(1 for i in items if i.physical_quantity is not None)
        result.append({
            "id": s.id,
            "counted_by": s.counted_by,
            "branch_id": s.branch_id,
            "status": s.status,
            "notes": s.notes or "",
            "total_items": len(items),
            "counted_items": counted,
            "created_at": s.created_at.isoformat() if s.created_at else "",
            "completed_at": s.completed_at.isoformat() if s.completed_at else ""
        })
    return result


@router.post("/stock-counts")
def create_stock_count_session(data: StockCountSessionCreate, db: Session = Depends(get_db)):
    branch_id = data.branch_id
    ing_q = db.query(Ingredient)
    if branch_id:
        ing_q = ing_q.filter(Ingredient.branch_id == branch_id)
    ingredients = ing_q.order_by(Ingredient.category, Ingredient.name).all()
    if not ingredients:
        raise HTTPException(400, "No ingredients found for this branch")

    session = StockCountSession(
        counted_by=data.counted_by,
        branch_id=branch_id,
        status="in_progress",
        notes=data.notes
    )
    db.add(session)
    db.flush()

    for ing in ingredients:
        item = StockCountItem(
            session_id=session.id,
            ingredient_id=ing.id,
            system_quantity=ing.stock
        )
        db.add(item)
    db.commit()
    db.refresh(session)
    return {"id": session.id, "status": session.status, "total_items": len(ingredients)}


@router.get("/stock-counts/{session_id}")
def get_stock_count_session(session_id: int, db: Session = Depends(get_db)):
    session = db.query(StockCountSession).filter(StockCountSession.id == session_id).first()
    if not session:
        raise HTTPException(404, "Session not found")
    items = db.query(StockCountItem).filter(StockCountItem.session_id == session_id).all()
    item_list = []
    for item in items:
        ing = db.query(Ingredient).filter(Ingredient.id == item.ingredient_id).first()
        item_list.append({
            "id": item.id,
            "ingredient_id": item.ingredient_id,
            "ingredient_name": ing.name if ing else "—",
            "unit": ing.unit if ing else "",
            "category": ing.category if ing else "",
            "system_quantity": item.system_quantity,
            "physical_quantity": item.physical_quantity,
            "variance": item.variance,
            "notes": item.notes or ""
        })
    return {
        "id": session.id,
        "counted_by": session.counted_by,
        "branch_id": session.branch_id,
        "status": session.status,
        "notes": session.notes or "",
        "created_at": session.created_at.isoformat() if session.created_at else "",
        "completed_at": session.completed_at.isoformat() if session.completed_at else "",
        "items": item_list
    }


@router.put("/stock-counts/{session_id}/items/{item_id}")
def update_stock_count_item(session_id: int, item_id: int, data: StockCountItemUpdate, db: Session = Depends(get_db)):
    item = db.query(StockCountItem).filter(
        StockCountItem.id == item_id,
        StockCountItem.session_id == session_id
    ).first()
    if not item:
        raise HTTPException(404, "Count item not found")
    if data.physical_quantity is not None:
        item.physical_quantity = data.physical_quantity
        item.variance = round(item.physical_quantity - item.system_quantity, 3)
    if data.notes is not None:
        item.notes = data.notes
    db.commit()
    return {"id": item.id, "variance": item.variance}


@router.post("/stock-counts/{session_id}/complete")
def complete_stock_count_session(session_id: int, db: Session = Depends(get_db)):
    session = db.query(StockCountSession).filter(StockCountSession.id == session_id).first()
    if not session:
        raise HTTPException(404, "Session not found")
    if session.status == "completed":
        raise HTTPException(400, "Session already completed")

    items = db.query(StockCountItem).filter(StockCountItem.session_id == session_id).all()
    adjustments = []
    for item in items:
        if item.physical_quantity is None:
            continue
        diff = item.physical_quantity - item.system_quantity
        ing = db.query(Ingredient).filter(Ingredient.id == item.ingredient_id).first()
        if ing and abs(diff) > 0.001:
            ing.stock = item.physical_quantity
            tx = StockTransaction(
                ingredient_id=ing.id,
                type="adjustment",
                quantity=diff,
                note=f"Popis #{session_id}: {item.system_quantity} -> {item.physical_quantity} ({'+' if diff > 0 else ''}{diff})"
            )
            db.add(tx)
            adjustments.append({
                "ingredient_id": ing.id,
                "name": ing.name,
                "from": item.system_quantity,
                "to": item.physical_quantity,
                "diff": diff
            })

    session.status = "completed"
    session.completed_at = datetime.now()
    db.commit()
    return {
        "id": session.id,
        "status": "completed",
        "adjustments": adjustments,
        "total_adjustments": len(adjustments)
    }


@router.delete("/stock-counts/{session_id}")
def delete_stock_count_session(session_id: int, db: Session = Depends(get_db)):
    session = db.query(StockCountSession).filter(StockCountSession.id == session_id).first()
    if not session:
        raise HTTPException(404, "Session not found")
    db.query(StockCountItem).filter(StockCountItem.session_id == session_id).delete()
    db.delete(session)
    db.commit()
    return {"ok": True}


@router.get("/barcode/{code}")
def lookup_barcode(code: str, db: Session = Depends(get_db)):
    ing = db.query(Ingredient).filter(Ingredient.barcode == code).first()
    if not ing:
        raise HTTPException(404, "Ingredient not found")
    return {
        "id": ing.id, "name": ing.name, "unit": ing.unit,
        "stock": ing.stock, "cost_per_unit": ing.cost_per_unit,
        "category": ing.category, "barcode": ing.barcode
    }


class BulkRestockRequest(BaseModel):
    items: List[dict]


class BulkWasteRequest(BaseModel):
    items: List[dict]
    reason: str = ""


@router.post("/bulk/restock")
def bulk_restock(body: BulkRestockRequest, db: Session = Depends(get_db)):
    count = 0
    for item in body.items:
        ing = db.query(Ingredient).filter(Ingredient.id == item["id"]).first()
        if not ing:
            continue
        qty = item.get("quantity", 0)
        if qty <= 0:
            continue
        ing.stock += qty
        db.add(StockTransaction(
            ingredient_id=ing.id, type="restock", quantity=qty,
            notes=f"Bulk restock"
        ))
        count += 1
    db.commit()
    return {"restocked": count}


@router.post("/bulk/waste")
def bulk_waste(body: BulkWasteRequest, db: Session = Depends(get_db)):
    count = 0
    for item in body.items:
        ing = db.query(Ingredient).filter(Ingredient.id == item["id"]).first()
        if not ing:
            continue
        qty = item.get("quantity", 0)
        if qty <= 0:
            continue
        ing.stock = max(0, ing.stock - qty)
        db.add(StockTransaction(
            ingredient_id=ing.id, type="waste", quantity=-qty,
            notes=body.reason or "Bulk waste"
        ))
        count += 1
    db.commit()
    return {"wasted": count}
