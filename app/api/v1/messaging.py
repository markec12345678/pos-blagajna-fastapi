from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.customer import Customer
from app.models.order import Order
from app.models.loyalty import LoyaltyTransaction
from app.models.settings import Setting
from app.services.messaging_service import (
    send_receipt_sms, send_receipt_whatsapp, send_loyalty_update,
    send_order_status, send_marketing, send_marketing_whatsapp, send_birthday_wish
)
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

router = APIRouter(prefix="/messaging", tags=["messaging"])


class SendMessage(BaseModel):
    phone: str
    message: str
    channel: str = "sms"  # sms, whatsapp


class SendBulkMessage(BaseModel):
    customer_ids: list[int]
    message: str
    channel: str = "sms"
    segment_filter: Optional[str] = None


class SendReceiptRequest(BaseModel):
    order_id: int
    phone: str
    channel: str = "sms"


class MessagingSettings(BaseModel):
    enabled: Optional[str] = None
    auto_receipt: Optional[str] = None
    auto_loyalty: Optional[str] = None
    twilio_account_sid: Optional[str] = None
    twilio_auth_token: Optional[str] = None
    twilio_from_number: Optional[str] = None
    twilio_whatsapp_number: Optional[str] = None


@router.post("/send")
def send_message(data: SendMessage, db: Session = Depends(get_db)):
    if not data.phone:
        raise HTTPException(400, "Phone number required")
    if data.channel == "whatsapp":
        result = send_marketing_whatsapp(data.phone, data.message)
    else:
        result = send_marketing(data.phone, data.message)
    _log_message(db, "manual", data.phone, data.channel, data.message, result.get("ok", False))
    return result


@router.post("/send-bulk")
def send_bulk_message(data: SendBulkMessage, db: Session = Depends(get_db)):
    customers = db.query(Customer).filter(Customer.id.in_(data.customer_ids)).all()
    sent = 0
    failed = 0
    for c in customers:
        phone = c.phone
        if not phone:
            failed += 1
            continue
        if data.channel == "whatsapp":
            result = send_marketing_whatsapp(phone, data.message)
        else:
            result = send_marketing(phone, data.message)
        if result.get("ok"):
            sent += 1
        else:
            failed += 1
        _log_message(db, "bulk", phone, data.channel, data.message, result.get("ok", False), customer_id=c.id)
    return {"sent": sent, "failed": failed, "total": len(data.customer_ids)}


@router.post("/send-receipt")
def send_receipt(data: SendReceiptRequest, db: Session = Depends(get_db)):
    order = db.query(Order).filter(Order.id == data.order_id).first()
    if not order:
        raise HTTPException(404, "Order not found")
    if not data.phone:
        raise HTTPException(400, "Phone number required")

    items_text = "\n".join([
        f"  {item.quantity}× {item.item_name} — {item.total_price:.2f}€"
        for item in order.items
    ])

    restaurant = db.query(Setting).filter(Setting.key == "restaurant_name").first()
    rname = restaurant.value if restaurant else "Restavracija"

    if data.channel == "whatsapp":
        result = send_receipt_whatsapp(data.phone, order.id, order.total, items_text, restaurant_name=rname)
    else:
        result = send_receipt_sms(data.phone, order.id, order.total, items_text, restaurant_name=rname)

    _log_message(db, "receipt", data.phone, data.channel, f"Račun #{order.id}", result.get("ok", False))
    return result


@router.post("/send-order-status")
def send_order_status_update(order_id: int, status: str, db: Session = Depends(get_db)):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(404, "Order not found")
    phone = order.customer_phone
    if not phone:
        return {"ok": False, "message": "No phone number on order"}

    restaurant = db.query(Setting).filter(Setting.key == "restaurant_name").first()
    rname = restaurant.value if restaurant else "Restavracija"

    result = send_order_status(phone, order.id, status, restaurant_name=rname)
    _log_message(db, "order_status", phone, "sms", f"#{order.id} → {status}", result.get("ok", False))
    return result


@router.post("/send-loyalty-update")
def send_loyalty_update_message(customer_id: int, points_earned: int, db: Session = Depends(get_db)):
    cust = db.query(Customer).filter(Customer.id == customer_id).first()
    if not cust:
        raise HTTPException(404, "Customer not found")
    if not cust.phone:
        return {"ok": False, "message": "No phone number"}

    restaurant = db.query(Setting).filter(Setting.key == "restaurant_name").first()
    rname = restaurant.value if restaurant else "Restavracija"

    result = send_loyalty_update(cust.phone, cust.name, points_earned, cust.loyalty_points or 0, restaurant_name=rname)
    _log_message(db, "loyalty", cust.phone, "sms", f"+{points_earned} točk", result.get("ok", False), customer_id=cust.id)
    return result


@router.post("/send-birthday")
def send_birthday_messages(db: Session = Depends(get_db)):
    from datetime import date
    today = date.today()
    members = db.query(Customer).filter(
        Customer.is_member == True,
        Customer.birthday.isnot(None),
        Customer.phone != "",
        Customer.phone.isnot(None)
    ).all()

    restaurant = db.query(Setting).filter(Setting.key == "restaurant_name").first()
    rname = restaurant.value if restaurant else "Restavracija"
    bonus_setting = db.query(Setting).filter(Setting.key == "loyalty_birthday_bonus").first()
    bonus = int(bonus_setting.value) if bonus_setting and bonus_setting.value else 100

    sent = 0
    for c in members:
        if c.birthday.month == today.month and c.birthday.day == today.day:
            already = db.query(LoyaltyTransaction).filter(
                LoyaltyTransaction.customer_id == c.id,
                LoyaltyTransaction.type == "birthday",
                LoyaltyTransaction.created_at >= datetime(today.year, today.month, today.day)
            ).first()
            if already:
                continue
            result = send_birthday_wish(c.phone, c.name, bonus, restaurant_name=rname)
            if result.get("ok"):
                sent += 1
            _log_message(db, "birthday", c.phone, "sms", f"Rojstnodnevna voščilnica", result.get("ok", False), customer_id=c.id)
    return {"sent": sent}


@router.get("/settings")
def get_messaging_settings(db: Session = Depends(get_db)):
    s = {}
    for k in ["messaging_enabled", "messaging_auto_receipt", "messaging_auto_loyalty",
              "twilio_account_sid", "twilio_from_number", "twilio_whatsapp_number"]:
        row = db.query(Setting).filter(Setting.key == k).first()
        s[k] = row.value if row else ""
    has_twilio = bool(s.get("twilio_account_sid"))
    return {**s, "provider": "twilio" if has_twilio else "log", "configured": has_twilio}


@router.put("/settings")
def update_messaging_settings(data: MessagingSettings, db: Session = Depends(get_db)):
    update_data = data.model_dump(exclude_unset=True)
    for k, v in update_data.items():
        if v is None:
            continue
        row = db.query(Setting).filter(Setting.key == k).first()
        if row:
            row.value = str(v)
        else:
            db.add(Setting(key=k, value=str(v)))
    db.commit()
    return {"ok": True}


@router.get("/log")
def get_message_log(db: Session = Depends(get_db), limit: int = 50):
    rows = db.query(Setting).filter(Setting.key.like("msglog_%")).order_by(Setting.key.desc()).limit(limit).all()
    result = []
    for r in rows:
        try:
            data = json.loads(r.value)
            result.append(data)
        except Exception:
            pass
    return result


@router.get("/stats")
def get_messaging_stats(db: Session = Depends(get_db)):
    total = db.query(Setting).filter(Setting.key.like("msglog_%")).count()
    return {"total_messages": total}


import json


def _log_message(db: Session, msg_type: str, phone: str, channel: str, preview: str, success: bool, customer_id: int = 0):
    from datetime import datetime
    log_entry = {
        "type": msg_type, "phone": phone, "channel": channel,
        "preview": preview[:200], "success": success,
        "customer_id": customer_id,
        "timestamp": datetime.now().isoformat()
    }
    key = f"msglog_{datetime.now().strftime('%Y%m%d%H%M%S')}_{hash(phone) % 10000}"
    db.add(Setting(key=key, value=json.dumps(log_entry)))
    try:
        db.commit()
    except Exception:
        db.rollback()
