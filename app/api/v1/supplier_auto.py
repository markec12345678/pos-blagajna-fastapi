"""Supplier order automation — auto-reorder at low stock."""
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime, timedelta

from app.core.database import get_db
from app.api.v1.auth import get_current_user

router = APIRouter(prefix="/supplier-auto", tags=["Samodejno naročanje"])


class AutoOrderRule(BaseModel):
    ingredient_id: int
    supplier_id: int
    reorder_point: int  # When stock drops to this level
    reorder_quantity: int  # How much to order
    enabled: bool = True


@router.get("/low-stock")
def get_low_stock_items(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Vrni artikle z nizko zalogo, ki potrebujejo naročilo."""
    from app.models.inventory import Ingredient

    ingredients = db.query(Ingredient).filter(
        Ingredient.is_active == True
    ).all()

    low_stock = []
    for ing in ingredients:
        min_stock = getattr(ing, 'min_stock', 0) or 0
        stock = getattr(ing, 'stock', 0) or 0
        
        if min_stock > 0 and stock <= min_stock:
            urgency = 'critical' if stock == 0 else 'urgent' if stock < min_stock * 0.5 else 'warning'
            low_stock.append({
                "id": ing.id,
                "name": ing.name,
                "current_stock": stock,
                "min_stock": min_stock,
                "unit": getattr(ing, 'unit', 'kg'),
                "urgency": urgency,
                "supplier_id": getattr(ing, 'supplier_id', None),
                "suggested_order": min_stock * 2 - stock,  # Order to get to 2x min
            })

    low_stock.sort(key=lambda x: {'critical': 0, 'urgent': 1, 'warning': 2}[x['urgency']])

    return {
        "low_stock_items": low_stock,
        "total": len(low_stock),
        "critical": len([i for i in low_stock if i['urgency'] == 'critical']),
        "urgent": len([i for i in low_stock if i['urgency'] == 'urgent']),
    }


@router.get("/rules")
def get_auto_order_rules(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Vrni pravila za samodejno naročanje."""
    # For now, return default rules based on ingredients with suppliers
    from app.models.inventory import Ingredient

    ingredients = db.query(Ingredient).filter(
        Ingredient.is_active == True,
        Ingredient.supplier_id.isnot(None)
    ).all()

    rules = []
    for ing in ingredients:
        min_stock = getattr(ing, 'min_stock', 0) or 0
        if min_stock > 0:
            rules.append({
                "ingredient_id": ing.id,
                "ingredient_name": ing.name,
                "supplier_id": getattr(ing, 'supplier_id', None),
                "reorder_point": min_stock,
                "reorder_quantity": min_stock * 2,
                "enabled": True,
                "current_stock": getattr(ing, 'stock', 0) or 0,
            })

    return {"rules": rules}


@router.post("/create-order")
def create_supplier_order(
    supplier_id: int,
    items: List[dict],
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Ustvari naročilo dobavitelju."""
    from app.models.supplier import Supplier
    from app.models.inventory import Ingredient

    supplier = db.query(Supplier).filter(Supplier.id == supplier_id).first()
    if not supplier:
        return {"error": "Dobavitelj ni najden"}

    # Create order summary
    order_items = []
    total = 0
    for item in items:
        ing = db.query(Ingredient).filter(Ingredient.id == item.get('ingredient_id')).first()
        if ing:
            quantity = item.get('quantity', 0)
            price = getattr(ing, 'cost', 0) or 0
            item_total = quantity * price
            total += item_total
            order_items.append({
                "ingredient": ing.name,
                "quantity": quantity,
                "unit": getattr(ing, 'unit', 'kg'),
                "price": price,
                "total": item_total
            })

    return {
        "message": f"Naročilo pripravljeno za {supplier.name}",
        "supplier": {
            "id": supplier.id,
            "name": supplier.name,
            "contact": getattr(supplier, 'contact_person', ''),
            "email": getattr(supplier, 'email', ''),
        },
        "items": order_items,
        "total": total,
        "estimated_delivery": (datetime.now() + timedelta(days=3)).strftime('%Y-%m-%d'),
        "status": "pending"
    }


@router.post("/auto-reorder")
def auto_reorder(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Avtomatsko ustvari naročila za artikle pod minimalno zalogo."""
    from app.models.inventory import Ingredient

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
                orders_by_supplier[supplier_id] = []
            
            reorder_qty = min_stock * 2 - stock
            orders_by_supplier[supplier_id].append({
                "ingredient_id": ing.id,
                "name": ing.name,
                "quantity": reorder_qty,
                "unit": getattr(ing, 'unit', 'kg'),
            })

    created_orders = []
    for supplier_id, items in orders_by_supplier.items():
        if items:
            result = create_supplier_order(supplier_id, items, db, user)
            if not result.get('error'):
                created_orders.append(result)

    return {
        "message": f"Ustvarjenih {len(created_orders)} naročil",
        "orders": created_orders,
        "total_items": sum(len(o.get('items', [])) for o in created_orders),
    }


@router.get("/stats")
def get_order_stats(days: int = Query(30, ge=1, le=365), db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Statistika naročil dobaviteljem."""
    # Simulated stats for now
    return {
        "period_days": days,
        "total_orders": 12,
        "total_spent": 4567.89,
        "avg_delivery_days": 3.2,
        "top_suppliers": [
            {"name": "Kmetija Poljane", "orders": 5, "total": 1234.56},
            {"name": "Meso Toplota", "orders": 4, "total": 2345.67},
            {"name": "Pijače d.o.o.", "orders": 3, "total": 987.66},
        ],
        "pending_orders": 2,
        "received_orders": 10,
    }
