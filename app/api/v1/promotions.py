from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.promotion import Promotion
from app.models.order import Order, OrderItem
from app.models.menu_item import MenuItem
from app.models.audit_log import AuditLog
from app.schemas.promotion import CreatePromotion, UpdatePromotion, CalculatePromotion
from datetime import datetime
import json

router = APIRouter(prefix="/promotions", tags=["promotions"])


@router.get("")
def list_promotions(branch_id: int = 0, db: Session = Depends(get_db)):
    q = db.query(Promotion)
    if branch_id:
        q = q.filter(Promotion.branch_id == branch_id)
    return q.order_by(Promotion.created_at.desc()).all()


@router.post("")
def create_promotion(data: CreatePromotion, db: Session = Depends(get_db)):
    promo = Promotion(
        name=data.name, type=data.type, value=data.value,
        min_order=data.min_order,
        category_id=data.category_id,
        buy_qty=data.buy_qty, free_qty=data.free_qty,
        free_discount_pct=data.free_discount_pct,
        time_start=data.time_start, time_end=data.time_end,
        days_of_week=data.days_of_week,
        start_date=datetime.fromisoformat(data.start_date) if data.start_date else None,
        end_date=datetime.fromisoformat(data.end_date) if data.end_date else None,
        is_active=data.is_active,
        branch_id=data.branch_id, description=data.description,
    )
    db.add(promo)
    db.commit()
    db.refresh(promo)
    return promo


@router.put("/{promo_id}")
def update_promotion(promo_id: int, data: UpdatePromotion, db: Session = Depends(get_db)):
    promo = db.query(Promotion).filter(Promotion.id == promo_id).first()
    if not promo:
        raise HTTPException(404, "Promotion not found")
    update_data = data.model_dump(exclude_unset=True)
    for key in ("name", "type", "value", "min_order", "is_active", "branch_id",
                "description", "category_id", "buy_qty", "free_qty",
                "free_discount_pct", "time_start", "time_end", "days_of_week"):
        if key in update_data:
            setattr(promo, key, update_data[key])
    if "start_date" in update_data:
        promo.start_date = datetime.fromisoformat(update_data["start_date"]) if update_data["start_date"] else None
    if "end_date" in update_data:
        promo.end_date = datetime.fromisoformat(update_data["end_date"]) if update_data["end_date"] else None
    db.commit()
    db.refresh(promo)
    return promo


@router.delete("/{promo_id}")
def delete_promotion(promo_id: int, db: Session = Depends(get_db)):
    promo = db.query(Promotion).filter(Promotion.id == promo_id).first()
    if not promo:
        raise HTTPException(404, "Promotion not found")
    db.delete(promo)
    db.commit()
    return {"ok": True}


@router.post("/calculate")
def calculate_promotion(data: CalculatePromotion, db: Session = Depends(get_db)):
    branch_id = data.branch_id
    cart_items = data.items
    total = data.total
    now = datetime.now()
    weekday = str(now.weekday())
    time_str = now.strftime("%H:%M")

    q = db.query(Promotion).filter(Promotion.is_active == True)
    if branch_id:
        q = q.filter(Promotion.branch_id == branch_id)
    promos = q.all()

    best = None
    best_amount = 0

    for promo in promos:
        if promo.start_date and promo.start_date > now:
            continue
        if promo.end_date and promo.end_date < now:
            continue
        if total < promo.min_order:
            continue

        if promo.days_of_week:
            try:
                days = json.loads(promo.days_of_week) if isinstance(promo.days_of_week, str) else promo.days_of_week
                if weekday not in [str(d) for d in days] and weekday not in days:
                    continue
            except (json.JSONDecodeError, TypeError, ValueError):
                pass

        if promo.time_start and promo.time_end:
            if not (promo.time_start <= time_str <= promo.time_end):
                continue

        amount = 0
        label = ""

        if promo.type == "percentage":
            amount = round(total * promo.value / 100, 2)
            label = f"{promo.value}% na celotno naročilo"
        elif promo.type == "fixed":
            amount = min(promo.value, total)
            label = f"{promo.value:.2f} € popusta"
        elif promo.type == "bogo":
            valid_items = [ci for ci in cart_items if ci.get("price", 0) > 0]
            for ci in valid_items:
                if ci["quantity"] >= promo.buy_qty:
                    free_times = ci["quantity"] // (promo.buy_qty + promo.free_qty) if promo.free_qty > 0 else ci["quantity"] // promo.buy_qty
                    if promo.free_discount_pct >= 100:
                        free_val = free_times * promo.free_qty * ci["price"]
                    else:
                        free_val = free_times * promo.free_qty * ci["price"] * promo.free_discount_pct / 100
                    amount += round(free_val, 2)
            if amount > 0:
                label = f"BOGO: kupi {promo.buy_qty} × {promo.free_qty} gratis" if promo.free_discount_pct >= 100 else f"BOGO: kupi {promo.buy_qty} × {promo.free_qty} -{promo.free_discount_pct}%"
        elif promo.type == "category_percentage" and promo.category_id:
            for ci in cart_items:
                item = db.query(MenuItem).filter(MenuItem.id == ci["menu_item_id"]).first()
                if item and item.category_id == promo.category_id:
                    amount += round(ci["total"] * promo.value / 100, 2)
            if amount > 0:
                label = f"{promo.value}% na kategorijo"
        elif promo.type == "happy_hour":
            for ci in cart_items:
                item = db.query(MenuItem).filter(MenuItem.id == ci["menu_item_id"]).first()
                if item and promo.category_id and item.category_id == promo.category_id:
                    amount += round(ci["total"] * promo.value / 100, 2)
            if amount == 0:
                amount = round(total * promo.value / 100, 2)
            if amount > 0:
                label = f"Happy hour: {promo.value}%"

        if amount > best_amount:
            best_amount = amount
            best = {"id": promo.id, "name": promo.name, "amount": amount, "label": label}

    return best or None


@router.post("/{promo_id}/apply/{order_id}")
def apply_promotion(promo_id: int, order_id: int, db: Session = Depends(get_db)):
    promo = db.query(Promotion).filter(Promotion.id == promo_id).first()
    if not promo:
        raise HTTPException(404, "Promotion not found")
    if not promo.is_active:
        raise HTTPException(400, "Promotion is not active")
    if promo.end_date and promo.end_date < datetime.now():
        raise HTTPException(400, "Promotion has expired")
    if promo.start_date and promo.start_date > datetime.now():
        raise HTTPException(400, "Promotion has not started yet")

    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(404, "Order not found")
    if order.total < promo.min_order:
        raise HTTPException(400, f"Order total {order.total:.2f} is below minimum {promo.min_order:.2f}")

    if promo.type == "percentage":
        discount_amount = round(order.total * promo.value / 100, 2)
        order.discount_type = "percentage"
        order.discount_value = promo.value
        order.discount_amount = discount_amount
    elif promo.type == "fixed":
        discount_amount = min(promo.value, order.total)
        order.discount_type = "fixed"
        order.discount_value = promo.value
        order.discount_amount = discount_amount
    else:
        raise HTTPException(400, f"Manual apply not supported for type {promo.type}")

    order.total = order.total - discount_amount

    log = AuditLog(action="promotion_applied", resource_type="order", resource_id=order.id,
                   details=f"Promotion '{promo.name}' applied: {promo.type} {promo.value} = -{discount_amount}", timestamp=datetime.now())
    db.add(log)
    db.commit()

    return {"discount_type": order.discount_type, "discount_value": order.discount_value,
            "discount_amount": order.discount_amount, "new_total": order.total}
