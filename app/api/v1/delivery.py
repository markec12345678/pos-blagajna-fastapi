from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.delivery import DeliveryOrder
from app.models.order import Order, OrderItem
from app.models.menu_item import MenuItem
from app.models.settings import Setting
from app.api.v1.audit_log import log_action
from datetime import datetime
import json
import hmac
import hashlib
from app.core.sms_service import send_whatsapp
from app.models.settings import Setting

router = APIRouter(prefix="/delivery", tags=["delivery"])


def get_setting(key: str, default: str = "") -> str:
    try:
        db = next(iter([]))
        return default
    except:
        return default


def verify_signature(payload: bytes, signature: str, secret: str) -> bool:
    if not secret:
        return True
    expected = hmac.new(secret.encode(), payload, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature)


def parse_wolt(data: dict) -> dict:
    items = []
    for i in data.get("items", []):
        items.append({
            "name": i.get("name", ""),
            "quantity": i.get("count", 1),
            "price": float(i.get("price", {}).get("amount", 0)) / 100,
        })
    return {
        "external_id": data.get("id", ""),
        "aggregator": "wolt",
        "customer_name": data.get("user", {}).get("name", ""),
        "customer_phone": data.get("user", {}).get("phone", ""),
        "delivery_address": data.get("delivery", {}).get("street_address", ""),
        "items": items,
        "total": float(data.get("order_total", {}).get("amount", 0)) / 100,
        "delivery_fee": float(data.get("delivery_fee", {}).get("amount", 0)) / 100,
        "service_fee": float(data.get("service_fee", {}).get("amount", 0)) / 100,
        "notes": data.get("user", {}).get("note", ""),
        "pickup_time": data.get("pickup_time", ""),
    }


def parse_ubereats(data: dict) -> dict:
    items = []
    for i in data.get("items", []):
        items.append({
            "name": i.get("title", ""),
            "quantity": i.get("quantity", 1),
            "price": float(i.get("price", {}).get("amount", 0)) / 100,
        })
    return {
        "external_id": data.get("delivery_id", data.get("order_id", "")),
        "aggregator": "ubereats",
        "customer_name": data.get("customer", {}).get("first_name", ""),
        "customer_phone": data.get("customer", {}).get("phone", ""),
        "delivery_address": data.get("delivery_address", {}).get("street_address", ""),
        "items": items,
        "total": float(data.get("total", {}).get("amount", 0)) / 100,
        "delivery_fee": float(data.get("delivery_fee", {}).get("amount", 0)) / 100,
        "service_fee": float(data.get("service_fee", {}).get("amount", 0)) / 100,
        "notes": data.get("customer", {}).get("note", ""),
    }


def parse_glovo(data: dict) -> dict:
    items = []
    for i in data.get("products", []):
        items.append({
            "name": i.get("name", ""),
            "quantity": i.get("quantity", 1),
            "price": float(i.get("price", 0)),
        })
    return {
        "external_id": data.get("order_id", ""),
        "aggregator": "glovo",
        "customer_name": data.get("customer", {}).get("name", ""),
        "customer_phone": data.get("customer", {}).get("phone", ""),
        "delivery_address": data.get("address", {}).get("street", ""),
        "items": items,
        "total": float(data.get("total", 0)),
        "delivery_fee": float(data.get("shipping", {}).get("fee", 0)),
        "service_fee": float(data.get("service_fee", 0)),
        "notes": data.get("customer", {}).get("notes", ""),
    }


def parse_aggregator_payload(aggregator: str, data: dict) -> dict:
    parsers = {
        "wolt": parse_wolt,
        "ubereats": parse_ubereats,
        "glovo": parse_glovo,
    }
    parser = parsers.get(aggregator)
    if parser:
        return parser(data)
    return {}


def get_auto_accept(db: Session, aggregator: str) -> bool:
    key = f"{aggregator}_auto_accept"
    s = db.query(Setting).filter(Setting.key == key).first()
    if s and s.value == "1":
        return True
    return False


@router.post("/webhook")
def receive_delivery_order(data: dict, db: Session = Depends(get_db)):
    api_key = data.get("api_key") or ""
    stored_key = db.query(Setting).filter(Setting.key == "delivery_api_key").first()
    if stored_key and stored_key.value and api_key != stored_key.value:
        raise HTTPException(403, "Invalid API key")

    dobj = DeliveryOrder(
        external_id=data.get("external_id", ""),
        aggregator=data.get("aggregator", "unknown"),
        customer_name=data.get("customer_name", ""),
        customer_phone=data.get("customer_phone", ""),
        delivery_address=data.get("delivery_address", ""),
        items=json.dumps(data.get("items", [])),
        total=float(data.get("total", 0)),
        delivery_fee=float(data.get("delivery_fee", 0)),
        service_fee=float(data.get("service_fee", 0)),
        notes=data.get("notes", ""),
    )
    db.add(dobj)
    db.commit()
    db.refresh(dobj)
    log_action(db, "delivery_order_received", "delivery_order", dobj.id,
               details=f"{dobj.aggregator} order #{dobj.external_id}: {dobj.total} EUR")

    if get_auto_accept(db, dobj.aggregator):
        _accept_delivery_internal(dobj.id, db)

    return {"ok": True, "delivery_order_id": dobj.id, "status": "pending"}


@router.post("/webhook/{aggregator}")
async def receive_aggregator_webhook(aggregator: str, request: Request, db: Session = Depends(get_db)):
    body = await request.body()
    data = await request.json()

    secret_key = f"{aggregator}_webhook_secret"
    stored = db.query(Setting).filter(Setting.key == secret_key).first()
    secret = stored.value if stored else ""

    signature = request.headers.get("X-Signature") or request.headers.get("X-Hub-Signature-256") or ""
    if not verify_signature(body, signature, secret):
        raise HTTPException(403, "Invalid signature")

    parsed = parse_aggregator_payload(aggregator, data)
    if not parsed.get("external_id"):
        raise HTTPException(400, "Could not parse aggregator payload")

    existing = db.query(DeliveryOrder).filter(
        DeliveryOrder.external_id == parsed["external_id"],
        DeliveryOrder.aggregator == aggregator,
    ).first()
    if existing:
        return {"ok": True, "delivery_order_id": existing.id, "status": existing.status, "duplicate": True}

    dobj = DeliveryOrder(
        external_id=parsed["external_id"],
        aggregator=aggregator,
        customer_name=parsed.get("customer_name", ""),
        customer_phone=parsed.get("customer_phone", ""),
        delivery_address=parsed.get("delivery_address", ""),
        items=json.dumps(parsed.get("items", [])),
        total=float(parsed.get("total", 0)),
        delivery_fee=float(parsed.get("delivery_fee", 0)),
        service_fee=float(parsed.get("service_fee", 0)),
        notes=parsed.get("notes", ""),
    )
    db.add(dobj)
    db.commit()
    db.refresh(dobj)
    log_action(db, "delivery_order_received", "delivery_order", dobj.id,
               details=f"{aggregator} order #{dobj.external_id}: {dobj.total} EUR")

    if get_auto_accept(db, aggregator):
        _accept_delivery_internal(dobj.id, db)

    return {"ok": True, "delivery_order_id": dobj.id, "status": "pending"}


@router.get("")
def list_delivery_orders(status: str = "", db: Session = Depends(get_db)):
    q = db.query(DeliveryOrder)
    if status:
        q = q.filter(DeliveryOrder.status == status)
    orders = q.order_by(DeliveryOrder.created_at.desc()).limit(100).all()
    return [{
        "id": o.id,
        "external_id": o.external_id,
        "aggregator": o.aggregator,
        "customer_name": o.customer_name,
        "customer_phone": o.customer_phone,
        "delivery_address": o.delivery_address,
        "items": json.loads(o.items) if o.items else [],
        "total": o.total,
        "delivery_fee": o.delivery_fee,
        "service_fee": o.service_fee,
        "status": o.status,
        "internal_order_id": o.internal_order_id,
        "notes": o.notes,
        "created_at": o.created_at.isoformat() if o.created_at else None,
    } for o in orders]


@router.get("/stats")
def delivery_stats(db: Session = Depends(get_db)):
    counts = db.query(DeliveryOrder.status).all()
    total = len(counts)
    by_status = {}
    by_aggregator = {}
    for o in db.query(DeliveryOrder).all():
        by_status[o.status] = by_status.get(o.status, 0) + 1
        by_aggregator[o.aggregator] = by_aggregator.get(o.aggregator, 0) + 1
    return {"total": total, "by_status": by_status, "by_aggregator": by_aggregator}


def _accept_delivery_internal(delivery_id: int, db: Session):
    dobj = db.query(DeliveryOrder).filter(DeliveryOrder.id == delivery_id).first()
    if not dobj or dobj.status != "pending":
        return None

    items_data = json.loads(dobj.items) if dobj.items else []
    oi_list = []
    for i in items_data:
        unit_price = float(i.get("price", 0))
        quantity = int(i.get("quantity", 1))
        oi = OrderItem(
            menu_item_id=0,
            item_name=i.get("name", "Unknown"),
            quantity=quantity,
            unit_price=unit_price,
            total_price=unit_price * quantity,
        )
        oi_list.append(oi)

    order_total = sum(oi.total_price for oi in oi_list)
    order = Order(
        table_id=0,
        order_type="delivery",
        cashier_id=0,
        customer_name=dobj.customer_name or "Delivery",
        status="open",
        total=order_total,
        notes=f"Delivery #{dobj.external_id} via {dobj.aggregator}\n{dobj.delivery_address}\n{dobj.notes or ''}",
        items=oi_list,
    )
    db.add(order)
    db.flush()

    dobj.status = "accepted"
    dobj.internal_order_id = order.id
    db.commit()
    log_action(db, "delivery_accepted", "delivery_order", delivery_id,
               details=f"Accepted #{dobj.external_id} → Order #{order.id}")
    return order.id


@router.post("/{delivery_id}/accept")
def accept_delivery(delivery_id: int, db: Session = Depends(get_db)):
    order_id = _accept_delivery_internal(delivery_id, db)
    if order_id is None:
        dobj = db.query(DeliveryOrder).filter(DeliveryOrder.id == delivery_id).first()
        if not dobj:
            raise HTTPException(404, "Delivery order not found")
        raise HTTPException(400, f"Order already {dobj.status}")
    return {"ok": True, "order_id": order_id, "delivery_order_id": delivery_id}


@router.post("/push-menu")
def push_menu_to_aggregator(data: dict, db: Session = Depends(get_db)):
    aggregator = data.get("aggregator", "")
    if aggregator not in ("wolt", "ubereats", "glovo"):
        raise HTTPException(400, "Unsupported aggregator")

    items = db.query(MenuItem).filter(MenuItem.is_active == True).all()
    menu = []
    for item in items:
        cat_name = ""
        if item.category_id:
            from app.models.category import Category
            cat = db.query(Category).filter(Category.id == item.category_id).first()
            if cat:
                cat_name = cat.name
        menu.append({
            "id": item.id,
            "name": item.name,
            "description": item.description or "",
            "price": item.price,
            "category": cat_name,
            "is_active": item.is_active,
            "image": item.image or "",
        })

    return {"ok": True, "aggregator": aggregator, "items_count": len(menu), "menu": menu}


@router.post("/{delivery_id}/status")
def update_delivery_status(delivery_id: int, data: dict, db: Session = Depends(get_db)):
    dobj = db.query(DeliveryOrder).filter(DeliveryOrder.id == delivery_id).first()
    if not dobj:
        raise HTTPException(404, "Delivery order not found")
    new_status = data.get("status", "")
    if new_status not in ("pending", "accepted", "preparing", "ready", "picked_up", "delivered", "cancelled"):
        raise HTTPException(400, f"Invalid status: {new_status}")
    dobj.status = new_status
    db.commit()

    # WhatsApp notification for key delivery status changes
    if new_status in ("preparing", "ready", "picked_up", "delivered") and dobj.customer_phone:
        wa_enabled = db.query(Setting).filter(Setting.key == "whatsapp_enabled").first()
        if wa_enabled and wa_enabled.value == "1":
            wa_number = db.query(Setting).filter(Setting.key == "whatsapp_twilio_number").first()
            api_key_s = db.query(Setting).filter(Setting.key == "sms_api_key").first()
            api_key = api_key_s.value if api_key_s else ""
            sender = wa_number.value if wa_number else ""
            phone = dobj.customer_phone.strip()
            if not phone.startswith("+"):
                phone = "+" + phone
            msgs = {
                "preparing": f"👨‍🍳 Vaša dostava #{dobj.external_id} se pripravlja.",
                "ready": f"🛎️ Vaša dostava #{dobj.external_id} je pripravljena za prevzem.",
                "picked_up": f"🚚 Vaša dostava #{dobj.external_id} je na poti k vam!",
                "delivered": f"✅ Vaša dostava #{dobj.external_id} je dostavljena. Dober tek! 🍽️",
            }
            if new_status in msgs:
                send_whatsapp(phone, msgs[new_status], api_key=api_key, sender=sender)

    return {"ok": True, "status": new_status}
