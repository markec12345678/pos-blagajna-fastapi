from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.order_template import OrderTemplate
from app.models.order import Order, OrderItem
from app.models.menu_item import MenuItem
from app.models.table_model import TableModel
from app.models.settings import Setting
from app.api.v1.audit_log import log_action
from app.core.pricing import get_effective_price
from datetime import datetime
import json

router = APIRouter(prefix="/order-templates", tags=["order-templates"])


@router.get("")
def list_templates(db: Session = Depends(get_db)):
    q = db.query(OrderTemplate).order_by(OrderTemplate.name).all()
    return [{
        "id": t.id, "name": t.name, "category": t.category or "",
        "items": json.loads(t.items_json) if t.items_json else [],
        "item_count": len(json.loads(t.items_json)) if t.items_json else 0,
        "created_at": t.created_at.isoformat() if t.created_at else None,
    } for t in q]


@router.post("")
def create_template(data: dict, db: Session = Depends(get_db)):
    if not data.get("name") or not data.get("items"):
        raise HTTPException(400, "name and items are required")
    t = OrderTemplate(
        name=data["name"],
        items_json=json.dumps(data["items"]),
        category=data.get("category", ""),
    )
    db.add(t)
    db.commit()
    db.refresh(t)
    return {"ok": True, "id": t.id}


@router.put("/{template_id}")
def update_template(template_id: int, data: dict, db: Session = Depends(get_db)):
    t = db.query(OrderTemplate).filter(OrderTemplate.id == template_id).first()
    if not t:
        raise HTTPException(404, "Template not found")
    if "name" in data:
        t.name = data["name"]
    if "items" in data:
        t.items_json = json.dumps(data["items"])
    if "category" in data:
        t.category = data.get("category", "")
    db.commit()
    return {"ok": True}


@router.delete("/{template_id}")
def delete_template(template_id: int, db: Session = Depends(get_db)):
    t = db.query(OrderTemplate).filter(OrderTemplate.id == template_id).first()
    if not t:
        raise HTTPException(404, "Template not found")
    db.delete(t)
    db.commit()
    return {"ok": True}


@router.post("/{template_id}/apply")
def apply_template(template_id: int, data: dict, db: Session = Depends(get_db)):
    t = db.query(OrderTemplate).filter(OrderTemplate.id == template_id).first()
    if not t:
        raise HTTPException(404, "Template not found")

    table_id = data.get("table_id")
    if not table_id:
        raise HTTPException(400, "table_id is required")

    table = db.query(TableModel).filter(TableModel.id == table_id).first()
    if not table:
        raise HTTPException(404, "Table not found")
    if table.status != "free":
        raise HTTPException(400, "Table is not free")

    items_data = json.loads(t.items_json) if t.items_json else []
    if not items_data:
        raise HTTPException(400, "Template has no items")

    order_type = data.get("order_type", "dine-in")
    total = 0
    tax_total = 0
    order_items = []

    for it in items_data:
        menu_item = db.query(MenuItem).filter(MenuItem.id == it["menu_item_id"]).first()
        if not menu_item:
            continue
        qty = it.get("quantity", 1)
        mods = it.get("modifiers", [])
        mod_impact = sum(m.get("price_impact", 0) for m in mods)
        base_price = get_effective_price(menu_item.id, menu_item.price, db, order_type)
        unit_price = base_price + mod_impact
        line_total = unit_price * qty
        tr = menu_item.tax_rate or 0
        ta = round(line_total * tr / (100 + tr), 2) if tr else 0
        total += line_total
        tax_total += ta
        order_items.append(OrderItem(
            menu_item_id=menu_item.id,
            item_name=menu_item.name,
            quantity=qty,
            unit_price=unit_price,
            total_price=line_total,
            notes=it.get("notes", ""),
            tax_rate=tr,
            tax_amount=ta,
            modifiers=json.dumps(mods)
        ))

    if order_type == "delivery":
        dfee_setting = db.query(Setting).filter(Setting.key == "delivery_fee").first()
        dfee = float(dfee_setting.value) if dfee_setting and dfee_setting.value else 0
        if dfee > 0:
            tr = float(db.query(Setting).filter(Setting.key == "tax_rate_delivery").first().value or 0) if db.query(Setting).filter(Setting.key == "tax_rate_delivery").first() else 0
            ta = round(dfee * tr / (100 + tr), 2) if tr else 0
            order_items.append(OrderItem(menu_item_id=0, item_name="Dostava", quantity=1, unit_price=dfee, total_price=dfee, notes="", tax_rate=tr, tax_amount=ta))
            total += dfee
            tax_total += ta

    order = Order(
        table_id=table_id,
        order_type=order_type,
        cashier_id=data.get("cashier_id", 1),
        customer_name=data.get("customer_name", ""),
        status="open",
        total=total,
        tax_total=tax_total,
        branch_id=data.get("branch_id"),
        items=order_items
    )
    db.add(order)
    table.status = "occupied"
    db.flush()
    log_action(db, "order_created_from_template", "order", order.id, details=f"Table {table.name}, template: {t.name}")
    db.commit()
    db.refresh(order)

    try:
        from app.core.websocket_manager import broadcast
        broadcast("order_created", {"order_id": order.id})
    except Exception:
        pass

    return {
        "ok": True,
        "order_id": order.id,
        "total": total,
        "item_count": len(order_items),
        "template_name": t.name
    }
