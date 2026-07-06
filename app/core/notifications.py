from sqlalchemy.orm import Session
from app.models.settings import Setting
from app.models.order import Order
from app.core.sms_service import send_whatsapp


def notify_order_status(db: Session, order_id: int, status: str):
    """Send WhatsApp notification to customer when order status changes."""
    wa_enabled = db.query(Setting).filter(Setting.key == "whatsapp_enabled").first()
    if not wa_enabled or wa_enabled.value != "1":
        return

    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        return
    phone = order.customer_phone or ""
    if not phone:
        return
    # Normalize phone
    phone = phone.strip().lstrip("+")
    if not phone.startswith("+"):
        phone = "+" + phone

    api_key_setting = db.query(Setting).filter(Setting.key == "sms_api_key").first()
    wa_number = db.query(Setting).filter(Setting.key == "whatsapp_twilio_number").first()
    api_key = api_key_setting.value if api_key_setting else ""
    sender = wa_number.value if wa_number else ""

    messages = {
        "closed": f"✅ Vaše naročilo #{order.id} je bilo potrjeno in plačano. Hvala, ker ste izbrali našo restavracijo!",
        "preparing": f"👨‍🍳 Vaše naročilo #{order.id} se pripravlja. Kmalu bo pripravljeno!",
        "ready": f"🛎️ Vaše naročilo #{order.id} je pripravljeno! Lahko ga prevzamete.",
        "out_for_delivery": f"🚚 Vaše naročilo #{order.id} je na poti k vam!",
        "delivered": f"✅ Vaše naročilo #{order.id} je bilo dostavljeno. Dober tek! 🍽️",
    }
    msg = messages.get(status)
    if not msg:
        return

    try:
        send_whatsapp(phone, msg, api_key=api_key, sender=sender)
    except Exception:
        pass
