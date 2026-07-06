import requests
from typing import Optional


def send_sms(phone: str, message: str, provider: str = "",
             api_key: str = "", sender: str = "") -> bool:
    if not phone or not message:
        return False

    provider = provider.lower()

    try:
        if provider == "twilio":
            return _send_twilio(phone, message, api_key, sender)
        elif provider == "whatsapp":
            return _send_whatsapp(phone, message, api_key, sender)
        elif provider == "smsapi":
            return _send_smsapi(phone, message, api_key, sender)
        else:
            return _send_generic(phone, message, api_key, sender)
    except Exception:
        return False


def send_whatsapp(phone: str, message: str, api_key: str = "", sender: str = "") -> bool:
    return _send_whatsapp(phone, message, api_key, sender)


def _send_generic(phone: str, message: str, api_key: str, sender: str) -> bool:
    url = "https://api.generic-sms-provider.com/v1/send"
    r = requests.post(url, json={
        "api_key": api_key, "to": phone, "text": message, "from": sender or "Restavracija"
    }, timeout=10)
    return r.ok


def _send_twilio(phone: str, message: str, api_key: str, sender: str) -> bool:
    if not api_key or ":" not in api_key:
        return False
    parts = api_key.split(":", 1)
    from twilio.rest import Client
    client = Client(parts[0], parts[1])
    msg = client.messages.create(
        body=message,
        from_=sender or "+1234567890",
        to=phone
    )
    return msg.sid is not None


def _send_whatsapp(phone: str, message: str, api_key: str, sender: str) -> bool:
    if not api_key or ":" not in api_key:
        return False
    parts = api_key.split(":", 1)
    try:
        from twilio.rest import Client
        client = Client(parts[0], parts[1])
        from_number = sender or "+14155238886"
        if not from_number.startswith("whatsapp:"):
            from_number = "whatsapp:" + from_number
        to_number = phone
        if not to_number.startswith("whatsapp:"):
            to_number = "whatsapp:" + to_number
        msg = client.messages.create(
            body=message,
            from_=from_number,
            to=to_number
        )
        return msg.sid is not None
    except Exception:
        return False


def _send_smsapi(phone: str, message: str, api_key: str, sender: str) -> bool:
    url = "https://api.smsapi.si/sms.do"
    r = requests.post(url, data={
        "apikey": api_key, "to": phone, "message": message,
        "from": sender or "Restavracija", "format": "json"
    }, timeout=10)
    return r.ok
