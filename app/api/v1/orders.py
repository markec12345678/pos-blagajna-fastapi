import json
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.database import get_db
from app.core.cache import invalidate
from app.models.order import Order, OrderItem
from app.models.menu_item import MenuItem
from app.models.table_model import TableModel
from app.models.customer import Customer
from app.models.payment import Payment
from app.models.invoice import Invoice
from app.models.user import User
from app.models.inventory import RecipeItem, StockTransaction, Ingredient
from app.schemas.order import (
    OrderCreate, OrderOut, OrderItemOut,
    UpdateOrderItem, UpdateOrderNotes, CancelOrder,
    ApplyDiscount, AddServiceCharge, MoveItems, AddOrderItem,
    RefundOrder, SendReceipt, MergeOrders, SplitOrder
)
from app.api.v1.audit_log import log_action
from app.models.settings import Setting
from app.core.websocket_manager import broadcast
from app.core.pricing import get_effective_price
from app.core.notifications import notify_order_status
from app.api.v1.auth import get_current_user
from datetime import datetime

router = APIRouter(prefix="/orders", tags=["orders"])


@router.post("")
def create_order(data: OrderCreate, db: Session = Depends(get_db)):
    table = db.query(TableModel).filter(TableModel.id == data.table_id).first()
    if not table:
        raise HTTPException(status_code=404, detail="Table not found")
    if table.status != "free":
        raise HTTPException(status_code=400, detail="Table is not free")

    total = 0
    tax_total = 0
    items = []
    for item_data in data.items:
        menu_item = db.query(MenuItem).filter(MenuItem.id == item_data.menu_item_id).first()
        if not menu_item:
            raise HTTPException(status_code=404, detail=f"Item {item_data.menu_item_id} not found")
        mods = json.loads(item_data.modifiers) if hasattr(item_data, 'modifiers') and item_data.modifiers else []
        mod_impact = sum(m.get("price_impact", 0) for m in mods)
        base_price = get_effective_price(menu_item.id, menu_item.price, db, data.order_type)
        unit_price = base_price + mod_impact
        line_total = unit_price * item_data.quantity
        tr = menu_item.tax_rate or 0
        ta = round(line_total * tr / (100 + tr), 2) if tr else 0
        total += line_total
        tax_total += ta
        notes = getattr(item_data, 'notes', None) or ""
        items.append(OrderItem(
            menu_item_id=menu_item.id,
            item_name=menu_item.name,
            quantity=item_data.quantity,
            unit_price=unit_price,
            total_price=line_total,
            notes=notes,
            tax_rate=tr,
            tax_amount=ta,
            modifiers=json.dumps(mods)
        ))

    if data.order_type == "delivery":
        dfee_setting = db.query(Setting).filter(Setting.key == "delivery_fee").first()
        dfee = float(dfee_setting.value) if dfee_setting and dfee_setting.value else 0
        if dfee > 0:
            tr = float(db.query(Setting).filter(Setting.key == "tax_rate_delivery").first().value or 0) if db.query(Setting).filter(Setting.key == "tax_rate_delivery").first() else 0
            ta = round(dfee * tr / (100 + tr), 2) if tr else 0
            items.append(OrderItem(
                menu_item_id=0,
                item_name="Dostava",
                quantity=1,
                unit_price=dfee,
                total_price=dfee,
                notes="",
                tax_rate=tr,
                tax_amount=ta
            ))
            total += dfee
            tax_total += ta

    scheduled = None
    if hasattr(data, 'scheduled_at') and data.scheduled_at:
        scheduled = datetime.fromisoformat(data.scheduled_at)

    order = Order(
        table_id=data.table_id,
        order_type=data.order_type,
        cashier_id=1,
        customer_name=data.customer_name,
        customer_id=data.customer_id if hasattr(data, 'customer_id') else None,
        status="open" if not scheduled else "scheduled",
        total=total,
        tax_total=tax_total,
        branch_id=data.branch_id if hasattr(data, 'branch_id') and data.branch_id else None,
        scheduled_at=scheduled,
        notes=getattr(data, 'notes', '') or '',
        items=items
    )
    db.add(order)
    if not scheduled:
        table.status = "occupied"
    db.flush()
    log_action(db, "order_created", "order", order.id, details=f"Table {table.name}, {len(items)} items, total {total}" + (f", scheduled: {scheduled}" if scheduled else ""))
    db.commit()
    invalidate("dashboard")
    broadcast("order_created", {"order_id": order.id})

    return OrderOut(
        id=order.id,
        invoice_number=order.invoice_number,
        table_id=order.table_id,
        cashier_id=order.cashier_id,
        customer_name=order.customer_name,
        customer_id=order.customer_id,
        status=order.status,
        total=order.total,
        created_at=order.created_at,
        closed_at=order.closed_at,
        items=[OrderItemOut.model_validate(i) for i in order.items]
    )


@router.get("")
def list_orders(status: str = None, branch_id: int = 0, skip: int = 0, limit: int = 50, db: Session = Depends(get_db)):
    q = db.query(Order)
    if status:
        q = q.filter(Order.status == status)
    if branch_id:
        q = q.filter(Order.branch_id == branch_id)
    total = q.count()
    orders = q.order_by(Order.created_at.desc()).offset(skip).limit(limit).all()
    result = []
    for o in orders:
        result.append(OrderOut(
            id=o.id, invoice_number=o.invoice_number,
            order_type=o.order_type, scheduled_at=o.scheduled_at,
            table_id=o.table_id, cashier_id=o.cashier_id,
            customer_name=o.customer_name, customer_id=o.customer_id, status=o.status,
            total=o.total,
            discount_type=o.discount_type, discount_value=o.discount_value, discount_amount=o.discount_amount,
            cancel_reason=o.cancel_reason,
            created_at=o.created_at, closed_at=o.closed_at,
            items=[OrderItemOut.model_validate(i) for i in o.items]
        ))

    return {"items": result, "total": total}


@router.get("/{order_id}")
def get_order(order_id: int, db: Session = Depends(get_db)):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return OrderOut(
        id=order.id,         invoice_number=order.invoice_number,
        order_type=order.order_type, scheduled_at=order.scheduled_at,
        table_id=order.table_id, cashier_id=order.cashier_id,
        customer_name=order.customer_name, status=order.status,
        total=order.total,
        discount_type=order.discount_type, discount_value=order.discount_value, discount_amount=order.discount_amount,
        cancel_reason=order.cancel_reason,
        created_at=order.created_at, closed_at=order.closed_at,
        items=[OrderItemOut.model_validate(i) for i in order.items]
    )


@router.put("/{order_id}/items/{item_id}")
def update_order_item(order_id: int, item_id: int, data: UpdateOrderItem, db: Session = Depends(get_db)):
    order = db.query(Order).filter(Order.id == order_id, Order.status == "open").first()
    if not order:
        raise HTTPException(400, "Order not open")
    item = db.query(OrderItem).filter(OrderItem.id == item_id, OrderItem.order_id == order_id).first()
    if not item:
        raise HTTPException(404, "Item not found")
    old_total = item.total_price
    if data.quantity is not None:
        item.quantity = data.quantity
        item.total_price = item.unit_price * item.quantity
    if data.notes is not None:
        item.notes = data.notes
    order.total = order.total - old_total + item.total_price
    log_action(db, "item_updated", "order_item", item.id, details=f"Order #{order_id}: {item.item_name} qty→{item.quantity}")
    db.commit()
    invalidate("dashboard")
    return OrderItemOut.model_validate(item)


@router.patch("/{order_id}/notes")
@router.patch("/{order_id}/meta")
def update_order_notes(order_id: int, data: UpdateOrderNotes, db: Session = Depends(get_db)):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(404, "Order not found")
    if data.notes is not None:
        order.notes = data.notes
    if data.tags is not None:
        order.tags = data.tags
    db.commit()
    invalidate("dashboard")
    return {"id": order.id, "notes": order.notes, "tags": order.tags}


@router.delete("/{order_id}/items/{item_id}")
def remove_order_item(order_id: int, item_id: int, db: Session = Depends(get_db)):
    order = db.query(Order).filter(Order.id == order_id, Order.status == "open").first()
    if not order:
        raise HTTPException(400, "Order not open")
    item = db.query(OrderItem).filter(OrderItem.id == item_id, OrderItem.order_id == order_id).first()
    if not item:
        raise HTTPException(404, "Item not found")
    order.total -= item.total_price
    log_action(db, "item_removed", "order_item", item.id, details=f"Order #{order_id}: {item.item_name}")
    db.delete(item)
    db.commit()
    invalidate("dashboard")
    return {"ok": True}


@router.post("/{order_id}/hold")
def hold_order(order_id: int, db: Session = Depends(get_db)):
    order = db.query(Order).filter(Order.id == order_id, Order.status == "open").first()
    if not order:
        raise HTTPException(400, "Order not open")
    order.status = "held"
    table = db.query(TableModel).filter(TableModel.id == order.table_id).first()
    if table:
        table.status = "free"
    log_action(db, "order_held", "order", order.id, details=f"Table {table.name if table else ''}")
    db.commit()
    invalidate("dashboard")
    return {"status": "held"}


@router.post("/{order_id}/unhold")
def unhold_order(order_id: int, db: Session = Depends(get_db)):
    order = db.query(Order).filter(Order.id == order_id, Order.status == "held").first()
    if not order:
        raise HTTPException(400, "Order not held")
    order.status = "open"
    table = db.query(TableModel).filter(TableModel.id == order.table_id).first()
    if table and table.status == "free":
        table.status = "occupied"
    log_action(db, "order_unheld", "order", order.id, details=f"Table {table.name if table else ''}")
    db.commit()
    invalidate("dashboard")
    return {"status": "open"}


@router.post("/{order_id}/cancel")
def cancel_order(order_id: int, data: CancelOrder, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    order = db.query(Order).filter(Order.id == order_id, Order.status == "open").first()
    if not order:
        raise HTTPException(400, "Order not open")
    order.status = "cancelled"
    order.cancel_reason = data.reason
    order.closed_at = datetime.now()
    order.total = 0
    table = db.query(TableModel).filter(TableModel.id == order.table_id).first()
    if table:
        table.status = "free"

    # Restore ingredients to stock on cancel
    for oi in db.query(OrderItem).filter(OrderItem.order_id == order.id).all():
        recipes = db.query(RecipeItem).filter(RecipeItem.menu_item_id == oi.menu_item_id).all()
        for r in recipes:
            ing = db.query(Ingredient).filter(Ingredient.id == r.ingredient_id).first()
            if ing:
                used = r.quantity * oi.quantity
                ing.stock = max(0, ing.stock + used)
                st = StockTransaction(
                    ingredient_id=ing.id, quantity=used,
                    type="cancel", note=f"Order #{order.id} cancelled"
                )
                db.add(st)

    log_action(db, "order_cancelled", "order", order.id, details=data.reason)
    db.commit()
    invalidate("dashboard")
    return {"status": "cancelled", "reason": data.reason}


class TransferOrder(BaseModel):
    target_table_id: int


@router.post("/{order_id}/transfer")
def transfer_order(order_id: int, data: TransferOrder, db: Session = Depends(get_db)):
    order = db.query(Order).filter(Order.id == order_id, Order.status == "open").first()
    if not order:
        raise HTTPException(400, "Order not open or not found")
    target = db.query(TableModel).filter(TableModel.id == data.target_table_id).first()
    if not target:
        raise HTTPException(404, "Target table not found")
    if target.status != "free" and target.id != order.table_id:
        raise HTTPException(400, "Target table is not free")
    old_table = db.query(TableModel).filter(TableModel.id == order.table_id).first()
    if old_table:
        old_table.status = "free"
    order.table_id = target.id
    target.status = "occupied"
    log_action(db, "order_transferred", "order", order.id, details=f"Table {old_table.name if old_table else '?'} -> {target.name}")
    broadcast("order_created", {"order_id": order.id})
    db.commit()
    invalidate("dashboard")
    return {"ok": True, "old_table": old_table.name if old_table else None, "new_table": target.name}


@router.post("/{order_id}/close")
def close_order(order_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    order = db.query(Order).filter(Order.id == order_id, Order.status == "open").first()
    if not order:
        raise HTTPException(400, "Order not open or not found")
    order.status = "closed"
    order.closed_at = datetime.now()
    broadcast("order_closed", {"order_id": order.id})
    if not order.invoice_number:
        max_inv = db.query(func.max(Order.invoice_number)).scalar() or 0
        order.invoice_number = max_inv + 1
    table = db.query(TableModel).filter(TableModel.id == order.table_id).first()
    if table:
        table.status = "free"

    # Deduct ingredients from stock + low-stock alerts
    low_stock_items = []
    for oi in db.query(OrderItem).filter(OrderItem.order_id == order.id).all():
        recipes = db.query(RecipeItem).filter(RecipeItem.menu_item_id == oi.menu_item_id).all()
        for r in recipes:
            ing = db.query(Ingredient).filter(Ingredient.id == r.ingredient_id).first()
            if ing:
                used = r.quantity * oi.quantity
                ing.stock = max(0, ing.stock - used)
                st = StockTransaction(
                    ingredient_id=ing.id, quantity=-used,
                    type="sale", note=f"Order #{order.id}"
                )
                db.add(st)
                if ing.min_stock > 0 and ing.stock <= ing.min_stock:
                    low_stock_items.append({"id": ing.id, "name": ing.name, "stock": ing.stock, "min_stock": ing.min_stock})

    if low_stock_items:
        broadcast("low_stock_alert", {"items": low_stock_items, "order_id": order.id})

    # WhatsApp notification
    notify_order_status(db, order.id, "closed")

    log_action(db, "order_closed", "order", order.id, details=f"Order #{order_id} closed")
    db.commit()
    invalidate("dashboard")
    return {"status": "closed", "order_id": order.id}


@router.post("/{order_id}/discount")
def apply_discount(order_id: int, data: ApplyDiscount, db: Session = Depends(get_db)):
    order = db.query(Order).filter(Order.id == order_id, Order.status == "open").first()
    if not order:
        raise HTTPException(400, "Order not open")
    dtype = data.type
    dvalue = data.value
    if dtype == "percentage":
        if dvalue < 0 or dvalue > 100:
            raise HTTPException(400, "Percentage must be 0-100")
        damount = round(order.total * dvalue / 100, 2)
    else:
        if dvalue < 0 or dvalue > order.total:
            raise HTTPException(400, "Invalid discount amount")
        damount = dvalue
    order.discount_type = dtype
    order.discount_value = dvalue
    order.discount_amount = damount
    order.total = round(order.total - damount, 2)
    log_action(db, "discount_applied", "order", order.id, details=f"{dtype}: {dvalue} = -{damount}")
    db.commit()
    invalidate("dashboard")
    return {"discount_type": dtype, "discount_value": dvalue, "discount_amount": damount, "new_total": order.total}


@router.post("/{order_id}/service-charge")
def add_service_charge(order_id: int, data: AddServiceCharge, db: Session = Depends(get_db)):
    order = db.query(Order).filter(Order.id == order_id, Order.status == "open").first()
    if not order:
        raise HTTPException(400, "Order not open")
    pct = data.percentage
    charge = round(order.total * pct / 100, 2)
    item = OrderItem(
        order_id=order_id,
        menu_item_id=0,
        item_name=f"Storitev ({pct}%)",
        quantity=1,
        unit_price=charge,
        total_price=charge,
        notes=""
    )
    db.add(item)
    order.total += charge
    log_action(db, "service_charge", "order", order_id, details=f"{pct}% = {charge}")
    db.commit()
    invalidate("dashboard")
    db.refresh(item)
    return OrderItemOut.model_validate(item)


@router.post("/move-items")
def move_items(data: MoveItems, db: Session = Depends(get_db)):
    item_ids = data.item_ids
    target_order_id = data.target_order_id
    if not item_ids or not target_order_id:
        raise HTTPException(400, "Missing item_ids or target_order_id")
    items = db.query(OrderItem).filter(OrderItem.id.in_(item_ids)).all()
    if not items:
        raise HTTPException(400, "No valid items")
    target_order = db.query(Order).filter(Order.id == target_order_id, Order.status == "open").first()
    if not target_order:
        raise HTTPException(400, "Target order not found or not open")
    source_order = db.query(Order).filter(Order.id == items[0].order_id, Order.status == "open").first()
    if not source_order:
        raise HTTPException(400, "Source order not open")
    moved_total = sum(i.total_price for i in items)
    for item in items:
        item.order_id = target_order_id
        source_order.total -= item.total_price
    target_order.total += moved_total
    log_action(db, "items_moved", "order", source_order.id, details=f"Moved {len(items)} items ({moved_total}€) to order #{target_order_id}")
    log_action(db, "items_moved_to", "order", target_order_id, details=f"Received {len(items)} items ({moved_total}€) from order #{source_order.id}")
    db.commit()
    invalidate("dashboard")
    return {"moved": len(items), "moved_total": moved_total, "source_total": source_order.total, "target_total": target_order.total}


@router.post("/{order_id}/items")
def add_item(order_id: int, item_data: AddOrderItem, db: Session = Depends(get_db)):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order or order.status != "open":
        raise HTTPException(status_code=400, detail="Order is not open")

    menu_item = db.query(MenuItem).filter(MenuItem.id == item_data.menu_item_id).first()
    if not menu_item:
        raise HTTPException(status_code=404, detail="Item not found")

    mods = json.loads(item_data.modifiers) if item_data.modifiers else []
    mod_impact = sum(m.get("price_impact", 0) for m in mods)
    unit_price = menu_item.price + mod_impact
    line_total = unit_price * item_data.quantity
    notes = item_data.notes
    item = OrderItem(
        order_id=order_id,
        menu_item_id=menu_item.id,
        item_name=menu_item.name,
        quantity=item_data.quantity,
        unit_price=unit_price,
        total_price=line_total,
        notes=notes,
        modifiers=json.dumps(mods)
    )
    db.add(item)
    order.total += line_total
    db.flush()
    log_action(db, "item_added", "order_item", item.id, details=f"Order #{order_id}: {menu_item.name} x{item_data.quantity}")
    db.commit()
    invalidate("dashboard")
    db.refresh(item)
    return OrderItemOut.model_validate(item)


@router.get("/held/{table_id}")
def get_held_order(table_id: int, db: Session = Depends(get_db)):
    order = db.query(Order).filter(
        Order.table_id == table_id,
        Order.status == "held"
    ).first()
    if not order:
        raise HTTPException(404, "No held order for this table")
    return OrderOut(
        id=order.id, invoice_number=order.invoice_number,
        order_type=order.order_type, scheduled_at=order.scheduled_at,
        table_id=order.table_id, cashier_id=order.cashier_id,
        customer_name=order.customer_name, status=order.status,
        total=order.total,
        discount_type=order.discount_type, discount_value=order.discount_value, discount_amount=order.discount_amount,
        cancel_reason=order.cancel_reason,
        created_at=order.created_at, closed_at=order.closed_at,
        items=[OrderItemOut.model_validate(i) for i in order.items]
    )


@router.get("/scheduled")
def get_scheduled_orders(db: Session = Depends(get_db)):
    now = datetime.now()
    orders = db.query(Order).filter(
        Order.status == "scheduled",
        Order.scheduled_at <= now
    ).all()
    if orders:
        for o in orders:
            o.status = "open"
            tbl = db.query(TableModel).filter(TableModel.id == o.table_id).first()
            if tbl:
                tbl.status = "occupied"
        db.commit()
        invalidate("dashboard")
    result = []
    for o in orders:
        result.append(OrderOut(
            id=o.id, invoice_number=o.invoice_number,
            order_type=o.order_type, scheduled_at=o.scheduled_at,
            table_id=o.table_id, cashier_id=o.cashier_id,
            customer_name=o.customer_name, status="open",
            total=o.total,
            discount_type=o.discount_type, discount_value=o.discount_value, discount_amount=o.discount_amount,
            created_at=o.created_at, closed_at=o.closed_at,
            items=[OrderItemOut.model_validate(i) for i in o.items]
        ))
    return result


@router.get("/by-table/{table_id}")
def get_order_by_table(table_id: int, db: Session = Depends(get_db)):
    order = db.query(Order).filter(
        Order.table_id == table_id,
        Order.status == "open"
    ).first()
    if not order:
        raise HTTPException(status_code=404, detail="No open order for this table")
    return OrderOut(
        id=order.id,         invoice_number=order.invoice_number,
        order_type=order.order_type, scheduled_at=order.scheduled_at,
        table_id=order.table_id, cashier_id=order.cashier_id,
        customer_name=order.customer_name, status=order.status,
        total=order.total,
        discount_type=order.discount_type, discount_value=order.discount_value, discount_amount=order.discount_amount,
        cancel_reason=order.cancel_reason,
        created_at=order.created_at, closed_at=order.closed_at,
        items=[OrderItemOut.model_validate(i) for i in order.items]
    )


@router.get("/history/recent")
def get_recent_orders(limit: int = 20, branch_id: int = 0, db: Session = Depends(get_db)):
    q = db.query(Order).filter(Order.status == "closed")
    if branch_id:
        q = q.filter(Order.branch_id == branch_id)
    orders = q.order_by(Order.closed_at.desc()).limit(limit).all()
    result = []
    for o in orders:
        t = db.query(TableModel).filter(TableModel.id == o.table_id).first()
        c = db.query(Customer).filter(Customer.id == o.customer_id).first() if o.customer_id else None
        items_out = []
        for i in o.items:
            items_out.append(OrderItemOut(
                id=i.id, menu_item_id=i.menu_item_id, item_name=i.item_name,
                quantity=i.quantity, unit_price=i.unit_price,
                total_price=i.total_price, notes=i.notes, modifiers=i.modifiers
            ))
        result.append({
            "id": o.id, "invoice_number": o.invoice_number,
            "order_type": o.order_type, "scheduled_at": o.scheduled_at.isoformat() if o.scheduled_at else None,
            "table_id": o.table_id, "table_name": t.name if t else f"Miza {o.table_id}",
            "cashier_id": o.cashier_id,
            "customer_name": o.customer_name or (c.name if c else None),
            "customer_id": o.customer_id, "status": o.status,
            "total": o.total,
            "discount_type": o.discount_type, "discount_value": o.discount_value,
            "discount_amount": o.discount_amount,
            "cancel_reason": o.cancel_reason,
            "created_at": str(o.created_at) if o.created_at else None,
            "closed_at": str(o.closed_at) if o.closed_at else None,
            "items": items_out
        })

    return result


@router.post("/{order_id}/reopen")
def reopen_order(order_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    order = db.query(Order).filter(Order.id == order_id, Order.status == "closed").first()
    if not order:
        raise HTTPException(400, "Order not closed")
    order.status = "open"
    order.closed_at = None
    table = db.query(TableModel).filter(TableModel.id == order.table_id).first()
    if table:
        table.status = "occupied"

    # Restore ingredients to stock
    for oi in db.query(OrderItem).filter(OrderItem.order_id == order.id).all():
        recipes = db.query(RecipeItem).filter(RecipeItem.menu_item_id == oi.menu_item_id).all()
        for r in recipes:
            ing = db.query(Ingredient).filter(Ingredient.id == r.ingredient_id).first()
            if ing:
                used = r.quantity * oi.quantity
                ing.stock = max(0, ing.stock + used)
                st = StockTransaction(
                    ingredient_id=ing.id, quantity=used,
                    type="return", note=f"Order #{order.id} reopened"
                )
                db.add(st)

    log_action(db, "order_reopened", "order", order.id, details=f"Order #{order_id} reopened")
    db.commit()
    invalidate("dashboard")
    return {"status": "open"}


@router.post("/{order_id}/refund")
def refund_order(order_id: int, data: RefundOrder, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    order = db.query(Order).filter(Order.id == order_id, Order.status == "closed").first()
    if not order:
        raise HTTPException(400, "Order not closed")
    if data.amount <= 0 or data.amount > order.total:
        raise HTTPException(400, "Invalid refund amount")
    payment = Payment(
        order_id=order_id,
        amount=-data.amount,
        method=data.method,
        created_at=datetime.now()
    )
    db.add(payment)

    # Restore ingredients to stock on refund
    for oi in db.query(OrderItem).filter(OrderItem.order_id == order.id).all():
        recipes = db.query(RecipeItem).filter(RecipeItem.menu_item_id == oi.menu_item_id).all()
        for r in recipes:
            ing = db.query(Ingredient).filter(Ingredient.id == r.ingredient_id).first()
            if ing:
                used = r.quantity * oi.quantity
                ing.stock = max(0, ing.stock + used)
                st = StockTransaction(
                    ingredient_id=ing.id, quantity=used,
                    type="refund", note=f"Order #{order.id} refund"
                )
                db.add(st)

    log_action(db, "refund_created", "payment", payment.id, details=f"Order #{order_id}: {data.amount}€ {data.method}")
    db.commit()
    invalidate("dashboard")
    return {"ok": True, "refund_amount": data.amount}


def _get_setting(db: Session, key: str, default: str = "") -> str:
    s = db.query(Setting).filter(Setting.key == key).first()
    return s.value if s and s.value else default


def _receipt_html(order: Order, db: Session) -> str:
    name = _get_setting(db, "restaurant_name", "POS")
    addr = _get_setting(db, "restaurant_address", "")
    phone = _get_setting(db, "restaurant_phone", "")
    footer = _get_setting(db, "receipt_footer", "")
    tax_rate = float(_get_setting(db, "tax_rate", "0"))
    show_qr = _get_setting(db, "receipt_show_qr", "true") != "false"
    show_tax = _get_setting(db, "receipt_show_tax", "true") != "false"
    show_notes = _get_setting(db, "receipt_show_notes", "true") != "false"
    show_cashier = _get_setting(db, "receipt_show_cashier", "true") != "false"
    show_order_type = _get_setting(db, "receipt_show_order_type", "true") != "false"
    show_customer = _get_setting(db, "receipt_show_customer", "true") != "false"

    payments = db.query(Payment).filter(Payment.order_id == order.id).all()
    subtotal = order.total
    tax = round(subtotal * tax_rate / 100, 2) if tax_rate else 0

    invoice = db.query(Invoice).filter(Invoice.order_id == order.id).first() if order.invoice_number else None

    items_html = "".join(
        f"<tr><td>{i.item_name}</td><td>x{i.quantity}</td><td style='text-align:right'>{i.unit_price:.2f} €</td><td style='text-align:right'>{i.total_price:.2f} €</td></tr>"
        for i in order.items
    )
    pay_html = "".join(
        f"<tr><td>{p.method}</td><td style='text-align:right'>{p.amount:.2f} €</td></tr>"
        for p in payments
    ) if payments else ""

    qr_html = ""
    if show_qr:
        import qrcode as _qr
        from io import BytesIO
        import base64
        restaurant_name = name or "POS"
        base_url = _get_setting(db, "receipt_feedback_url", "")
        if base_url:
            feedback_url = f"{base_url.rstrip('/')}/feedback?order={order.id}&branch={order.branch_id or ''}"
        else:
            feedback_url = f"RACUN#{order.id}|{restaurant_name}|{order.total:.2f}EUR"
        qr = _qr.QRCode(version=1, box_size=6, border=2)
        qr.add_data(feedback_url)
        qr.make(fit=True)
        img = qr.make_image(fill_color="black", back_color="white")
        buf = BytesIO()
        img.save(buf, format='SVG')
        svg_data = buf.getvalue().decode('utf-8')
        # Extract just the inner content from the SVG to embed inline
        if '<svg' in svg_data:
            qr_html = f'<div style="text-align:center;margin:12px 0">{svg_data.replace("width=", "width=").replace("height=", "height=")}<br><span style="font-size:9px;color:#999">Skeniraj za oceno</span></div>'
        else:
            qr_html = f'<div style="text-align:center;margin:12px 0"><span style="font-size:10px;color:#999">QR: {order.id}</span></div>'

    customer_html = ""
    if show_customer and order.customer_name:
        customer_html = f"<p>Gost: {order.customer_name}</p>"

    order_type_label = {'delivery': 'Dostava', 'takeaway': 'Za sabo'}.get(order.order_type, 'Tukaj')
    type_html = f"<p>Tip: {order_type_label}</p>" if show_order_type else ""

    notes_html = ""
    if show_notes and order.notes:
        notes_html = f"<p style='font-size:12px;color:#666'>Opombe: {order.notes}</p>"

    cashier_html = ""
    if show_cashier and order.cashier_id:
        cashier = db.query(User).filter(User.id == order.cashier_id).first()
        if cashier:
            cashier_html = f"<p style='font-size:12px;color:#666'>Blagajnik: {cashier.full_name or cashier.username}</p>"

    return f"""<!DOCTYPE html><html><head><meta charset='utf-8'><style>
body {{ font-family: Arial, sans-serif; max-width: 400px; margin: auto; padding: 20px; }}
h1 {{ font-size: 20px; text-align: center; }}
table {{ width: 100%; border-collapse: collapse; margin: 12px 0; }}
th, td {{ padding: 6px 4px; text-align: left; border-bottom: 1px solid #ddd; }}
th {{ font-size: 12px; text-transform: uppercase; color: #666; }}
.footer {{ text-align: center; margin-top: 16px; font-size: 13px; color: #888; }}
.total {{ font-size: 18px; font-weight: bold; text-align: right; }}
</style></head><body>
<h1>{name}</h1>
<p style='text-align:center;font-size:13px;color:#666'>{addr}{' | '+phone if phone else ''}</p>
<hr>
<p><strong>Račun #{order.invoice_number or order.id}</strong> | {order.created_at.strftime('%d.%m.%Y %H:%M') if order.created_at else ''}</p>
<p>Miza: {order.table_id if order.table_id else '—'} {type_html}</p>
{customer_html}
<table><thead><tr><th>Artikel</th><th>Kol</th><th>Cena</th><th>Skupaj</th></tr></thead><tbody>{items_html}</tbody></table>
<p class='total'>Skupaj: {subtotal:.2f} €</p>
{f"<p style='text-align:right;font-size:13px;color:#666'>DDV ({tax_rate}%): {tax:.2f} €</p>" if show_tax else ''}
{f'<table><thead><tr><th>Plačilo</th><th>Znesek</th></tr></thead><tbody>{pay_html}</tbody></table>' if pay_html else ''}
{notes_html}
{cashier_html}
{qr_html}
<div class='footer'>{footer}</div>
<hr><p style='text-align:center;font-size:11px;color:#aaa'>Hvala za obisk!</p>
</body></html>"""


@router.post("/{order_id}/send-receipt")
def send_receipt(order_id: int, data: SendReceipt, db: Session = Depends(get_db)):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(404, "Order not found")
    to_email = data.email
    if not to_email:
        if order.customer_id:
            cust = db.query(Customer).filter(Customer.id == order.customer_id).first()
            to_email = cust.email if cust else ""
        if not to_email:
            raise HTTPException(400, "No email provided and customer has no email")
    smtp_host = _get_setting(db, "smtp_host")
    if not smtp_host:
        raise HTTPException(400, "SMTP not configured. Set SMTP host in settings.")
    smtp_port = int(_get_setting(db, "smtp_port", "587"))
    smtp_user = _get_setting(db, "smtp_user")
    smtp_pass = _get_setting(db, "smtp_pass")
    smtp_from = _get_setting(db, "smtp_from", smtp_user)
    from_name = _get_setting(db, "smtp_from_name", "")
    bcc = _get_setting(db, "customer_email_bcc", "")
    html = _receipt_html(order, db)
    
    # Save receipt as PDF-like HTML file
    import os
    import uuid
    recv_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), '..', 'receipt_files')
    os.makedirs(recv_dir, exist_ok=True)
    fname = f"receipt-{order.id}-{uuid.uuid4().hex[:8]}.html"
    fpath = os.path.join(recv_dir, fname)
    with open(fpath, 'w', encoding='utf-8') as f:
        f.write(html)
    
    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"Račun #{order.invoice_number or order.id} — {_get_setting(db, 'restaurant_name', 'POS')}"
    msg["From"] = f"{from_name} <{smtp_from}>" if from_name else smtp_from
    msg["To"] = to_email
    if bcc:
        msg["Bcc"] = bcc
    msg.attach(MIMEText(html, "html"))
    try:
        with smtplib.SMTP(smtp_host, smtp_port) as server:
            server.starttls()
            if smtp_user and smtp_pass:
                server.login(smtp_user, smtp_pass)
            server.send_message(msg)
    except Exception as e:
        log_action(db, "email_failed", "order", order.id, details=str(e))
        raise HTTPException(500, f"Failed to send email: {e}")
    log_action(db, "email_sent", "order", order.id, details=f"Receipt sent to {to_email}")
    return {"ok": True, "to": to_email, "file": fname}


@router.get("/receipt-files")
def list_receipt_files(db: Session = Depends(get_db)):
    import os
    recv_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), '..', 'receipt_files')
    if not os.path.exists(recv_dir):
        return []
    files = os.listdir(recv_dir)
    return [{"name": f, "url": f"/receipt_files/{f}"} for f in files if f.endswith('.html')]


@router.post("/{order_id}/merge")
def merge_orders(order_id: int, data: MergeOrders, db: Session = Depends(get_db)):
    target = db.query(Order).filter(Order.id == order_id).first()
    if not target:
        raise HTTPException(404, "Target order not found")
    if target.status != "open":
        raise HTTPException(400, "Target order is not open")

    source_id = data.source_order_id
    if not source_id:
        raise HTTPException(400, "source_order_id is required")
    source = db.query(Order).filter(Order.id == source_id).first()
    if not source:
        raise HTTPException(404, "Source order not found")
    if source.status != "open":
        raise HTTPException(400, "Source order is not open")
    if source.id == target.id:
        raise HTTPException(400, "Cannot merge order with itself")

    # Move items
    for item in list(source.items):
        item.order_id = target.id
    target.total += source.total
    target.tax_total += source.tax_total

    # Free source table
    src_table = db.query(TableModel).filter(TableModel.id == source.table_id).first()
    if src_table:
        src_table.status = "free"

    source.status = "merged"
    log_action(db, "orders_merged", "order", target.id, details=f"Merged order #{source.id} into #{target.id}")
    db.commit()
    invalidate("dashboard")

    try:
        from app.core.websocket_manager import broadcast
        broadcast("order_merged", {"order_id": target.id, "source_id": source.id})
    except Exception:
        pass

    return {"ok": True, "order_id": target.id, "total": target.total, "item_count": len(target.items)}


@router.post("/{order_id}/split")
def split_order(order_id: int, data: SplitOrder, db: Session = Depends(get_db)):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(404, "Order not found")
    if order.status != "open":
        raise HTTPException(400, "Order is not open")

    item_ids = data.item_ids
    if not item_ids:
        raise HTTPException(400, "item_ids is required")

    items_to_move = db.query(OrderItem).filter(
        OrderItem.id.in_(item_ids), OrderItem.order_id == order_id
    ).all()
    if not items_to_move:
        raise HTTPException(400, "No valid items to split")

    move_total = sum(it.total_price for it in items_to_move)
    move_tax = sum(it.tax_amount for it in items_to_move)

    # Find a free table for the new order
    new_table = db.query(TableModel).filter(TableModel.status == "free").first()
    if not new_table:
        raise HTTPException(400, "No free table available for split order")

    new_order = Order(
        table_id=new_table.id,
        order_type=order.order_type,
        cashier_id=order.cashier_id,
        customer_name=order.customer_name,
        customer_id=order.customer_id,
        status="open",
        total=move_total,
        tax_total=move_tax,
        branch_id=order.branch_id,
    )
    db.add(new_order)
    db.flush()

    for item in items_to_move:
        item.order_id = new_order.id
    new_table.status = "occupied"

    # Update original totals
    order.total -= move_total
    order.tax_total -= move_tax

    log_action(db, "order_split", "order", order.id, details=f"Split {len(items_to_move)} items into order #{new_order.id}")
    db.commit()
    invalidate("dashboard")
    db.refresh(new_order)

    try:
        from app.core.websocket_manager import broadcast
        broadcast("order_split", {"order_id": order.id, "new_order_id": new_order.id})
    except Exception:
        pass

    return {"ok": True, "original_order_id": order.id, "new_order_id": new_order.id, "moved_items": len(items_to_move), "new_total": move_total}
