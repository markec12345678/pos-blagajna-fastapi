from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.settings import Setting

router = APIRouter(prefix="/settings", tags=["settings"])

DEFAULTS = {
    "restaurant_name": "Moja Restavracija",
    "restaurant_address": "",
    "restaurant_phone": "",
    "tax_rate": "9.5",
    "currency": "EUR",
    "receipt_header": "",
    "receipt_footer": "Hvala za obisk!",
    "receipt_logo_url": "",
    "receipt_show_prices": "true",
    "receipt_show_qr": "true",
    "smtp_host": "",
    "smtp_port": "587",
    "smtp_user": "",
    "smtp_pass": "",
    "smtp_from": "",
    "smtp_from_name": "",
    "customer_email_bcc": "",
    "terminal_provider": "",
    "terminal_api_key": "",
    "printer_ip": "",
    "printer_width": "48",
    "auto_print_receipt": "false",
    "auto_print_kitchen": "false",
    "hourly_wage": "10",
    "prep_stations": "Grill,Pizza,Salad,Bar",
    "order_tags": '[{"name":"VIP","color":"#f59e0b"},{"name":"Reklamacija","color":"#ef4444"},{"name":"Na poti","color":"#3b82f6"},{"name":"Darilo","color":"#8b5cf6"},{"name":"Poslovni","color":"#10b981"}]',
    "enable_auto_reminders": "false",
    "reminder_hours_before": "2",
    "enable_auto_backup": "false",
    "backup_interval_hours": "6",
    "backup_retention_days": "30",
    "loyalty_rate": "1",
    "loyalty_min_redeem": "100",
    "loyalty_redeem_rate": "100",
    "loyalty_birthday_bonus": "100",
    "loyalty_welcome_bonus": "50",
    "delivery_api_key": "",
    "delivery_auto_accept": "false",
}


@router.get("")
def get_settings(db: Session = Depends(get_db)):
    result = {}
    for key, default in DEFAULTS.items():
        setting = db.query(Setting).filter(Setting.key == key).first()
        result[key] = setting.value if setting else default
    return result


@router.put("")
def update_settings(data: dict, db: Session = Depends(get_db)):
    for key, value in data.items():
        if key in DEFAULTS:
            setting = db.query(Setting).filter(Setting.key == key).first()
            if setting:
                setting.value = str(value)
            else:
                db.add(Setting(key=key, value=str(value)))
    db.commit()
    return get_settings(db)


@router.post("/test-email")
def test_email(data: dict, db: Session = Depends(get_db)):
    import smtplib
    from email.mime.text import MIMEText
    host = _get_setting(db, "smtp_host")
    if not host:
        raise HTTPException(400, "SMTP not configured")
    port = int(_get_setting(db, "smtp_port", "587"))
    user = _get_setting(db, "smtp_user")
    pwd = _get_setting(db, "smtp_pass")
    from_addr = _get_setting(db, "smtp_from", user)
    to = data.get("email", "")
    if not to:
        raise HTTPException(400, "No email provided")
    msg = MIMEText("Test email — SMTP deluje ✅\n\nČe prejmete to sporočilo, so nastavitve pravilne.")
    msg["Subject"] = "Test — POS SMTP"
    msg["From"] = from_addr
    msg["To"] = to
    try:
        with smtplib.SMTP(host, port) as server:
            server.starttls()
            if user and pwd:
                server.login(user, pwd)
            server.send_message(msg)
        return {"ok": True}
    except Exception as e:
        raise HTTPException(500, str(e))


def _get_setting(db: Session, key: str, default: str = "") -> str:
    s = db.query(Setting).filter(Setting.key == key).first()
    return s.value if s and s.value else default
