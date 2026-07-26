"""
Messaging Service — SMS/WhatsApp integration for receipts, loyalty, and marketing.

Uses a pluggable provider interface. Currently supports:
- Twilio (SMS)
- WhatsApp Business API
- Fallback: logging only (for development)
"""
import logging
import json
from typing import Optional
from datetime import datetime

logger = logging.getLogger(__name__)


class MessagingProvider:
    """Base class for messaging providers."""
    def send_sms(self, to: str, body: str) -> dict:
        raise NotImplementedError

    def send_whatsapp(self, to: str, body: str, media_url: Optional[str] = None) -> dict:
        raise NotImplementedError


class LogProvider(MessagingProvider):
    """Development provider — logs messages instead of sending."""
    def send_sms(self, to: str, body: str) -> dict:
        logger.info(f"SMS to {to}: {body[:100]}...")
        return {"ok": True, "provider": "log", "message_id": f"log_{datetime.now().timestamp()}"}

    def send_whatsapp(self, to: str, body: str, media_url: Optional[str] = None) -> dict:
        logger.info(f"WhatsApp to {to}: {body[:100]}...")
        return {"ok": True, "provider": "log", "message_id": f"log_{datetime.now().timestamp()}"}


class TwilioProvider(MessagingProvider):
    """Twilio SMS/WhatsApp provider."""
    def __init__(self, account_sid: str, auth_token: str, from_number: str, from_whatsapp: str = ""):
        self.account_sid = account_sid
        self.auth_token = auth_token
        self.from_number = from_number
        self.from_whatsapp = from_whatsapp

    def send_sms(self, to: str, body: str) -> dict:
        try:
            from twilio.rest import Client
            client = Client(self.account_sid, self.auth_token)
            msg = client.messages.create(body=body, from_=self.from_number, to=to)
            return {"ok": True, "provider": "twilio", "message_id": msg.sid}
        except Exception as e:
            logger.error(f"Twilio SMS failed: {e}")
            return {"ok": False, "error": str(e)}

    def send_whatsapp(self, to: str, body: str, media_url: Optional[str] = None) -> dict:
        try:
            from twilio.rest import Client
            client = Client(self.account_sid, self.auth_token)
            kwargs = {"body": body, "from_": f"whatsapp:{self.from_whatsapp}", "to": f"whatsapp:{to}"}
            if media_url:
                kwargs["media_url"] = [media_url]
            msg = client.messages.create(**kwargs)
            return {"ok": True, "provider": "twilio_whatsapp", "message_id": msg.sid}
        except Exception as e:
            logger.error(f"Twilio WhatsApp failed: {e}")
            return {"ok": False, "error": str(e)}


def _get_provider():
    from app.core.config import get_settings
    s = get_settings()
    twilio_sid = getattr(s, "TWILIO_ACCOUNT_SID", "")
    twilio_token = getattr(s, "TWILIO_AUTH_TOKEN", "")
    twilio_from = getattr(s, "TWILIO_FROM_NUMBER", "")
    twilio_wa = getattr(s, "TWILIO_WHATSAPP_NUMBER", "")

    if twilio_sid and twilio_token:
        return TwilioProvider(twilio_sid, twilio_token, twilio_from, twilio_wa)
    return LogProvider()


def send_receipt_sms(phone: str, order_id: int, total: float, items_text: str, restaurant_name: str = "Restavracija") -> dict:
    body = (
        f"🧾 {restaurant_name}\n"
        f"Naročilo #{order_id}\n"
        f"{items_text}\n"
        f"Skupaj: {total:.2f}€\n\n"
        f"Hvala za obisk! 🙏"
    )
    return _get_provider().send_sms(phone, body)


def send_receipt_whatsapp(phone: str, order_id: int, total: float, items_text: str, receipt_url: Optional[str] = None, restaurant_name: str = "Restavracija") -> dict:
    body = (
        f"🧾 *{restaurant_name}*\n"
        f"Naročilo #{order_id}\n"
        f"{items_text}\n"
        f"Skupaj: *{total:.2f}€*\n\n"
        f"Hvala za obisk! 🙏"
    )
    return _get_provider().send_whatsapp(phone, body, receipt_url)


def send_loyalty_update(phone: str, customer_name: str, points_earned: int, new_balance: int, restaurant_name: str = "Restavracija") -> dict:
    body = (
        f"⭐ {restaurant_name} — Zvestoba\n\n"
        f"Pozdravljeni, {customer_name}!\n"
        f"Zaslužili ste +{points_earned} točk.\n"
        f"Stanje: {new_balance} točk\n\n"
        f"Unovčite točke pri naslednjem obisku! 🎁"
    )
    return _get_provider().send_sms(phone, body)


def send_order_status(phone: str, order_id: int, status: str, restaurant_name: str = "Restavracija") -> dict:
    status_labels = {
        "preparing": "🔨 Vaše naročilo se pripravlja",
        "ready": "✅ Vaše naročilo je pripravljeno!",
        "served": "🍽️ Postreženo. Dober tek!",
        "cancelled": "❌ Naročilo je bilo preklicano",
    }
    body = (
        f"{restaurant_name} — Naročilo #{order_id}\n\n"
        f"{status_labels.get(status, status)}\n\n"
    )
    return _get_provider().send_sms(phone, body)


def send_marketing(phone: str, message: str, restaurant_name: str = "Restavracija") -> dict:
    body = f"📢 {restaurant_name}\n\n{message}\n\nPošiljatelj: {restaurant_name}"
    return _get_provider().send_sms(phone, body)


def send_marketing_whatsapp(phone: str, message: str, restaurant_name: str = "Restavracija") -> dict:
    body = f"📢 *{restaurant_name}*\n\n{message}"
    return _get_provider().send_whatsapp(phone, body)


def send_birthday_wish(phone: str, customer_name: str, bonus_points: int, restaurant_name: str = "Restavracija") -> dict:
    body = (
        f"🎂 {restaurant_name}\n\n"
        f"Vse najlepše za rojstni dan, {customer_name}! 🎉\n\n"
        f"Podarjamo vam {bonus_points} točk zvestobe kot rojstnodnevno darilo! 🎁"
    )
    return _get_provider().send_sms(phone, body)
