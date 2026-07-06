from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.reservation import Reservation
from app.models.table_model import TableModel
from app.models.settings import Setting
from app.api.v1.audit_log import log_action
from datetime import datetime, date, timedelta
import smtplib
from email.mime.text import MIMEText

router = APIRouter(prefix="/reservations", tags=["reservations"])


@router.get("")
def list_reservations(date_from: str = None, date_to: str = None, branch_id: int = 0, db: Session = Depends(get_db)):
    q = db.query(Reservation)
    if date_from:
        q = q.filter(Reservation.reservation_time >= datetime.fromisoformat(date_from))
    if date_to:
        q = q.filter(Reservation.reservation_time <= datetime.fromisoformat(date_to))
    if branch_id:
        q = q.filter(Reservation.branch_id == branch_id)
    reservations = q.order_by(Reservation.reservation_time).all()
    result = []
    for r in reservations:
        t = db.query(TableModel).filter(TableModel.id == r.table_id).first() if r.table_id else None
        result.append({
            "id": r.id, "table_id": r.table_id,
            "table_name": t.name if t else None,
            "customer_name": r.customer_name, "customer_phone": r.customer_phone,
            "customer_email": r.customer_email, "guests": r.guests,
            "reservation_time": r.reservation_time.isoformat(),
            "status": r.status, "notes": r.notes, "created_at": r.created_at.isoformat() if r.created_at else None,
            "reminder_sent": r.reminder_sent or 0,
            "customer_email": r.customer_email
        })
    return result


@router.get("/today")
def today_reservations(date: str = None, branch_id: int = 0, db: Session = Depends(get_db)):
    if date:
        d = datetime.fromisoformat(date)
    else:
        d = datetime.now()
    today_start = d.replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start.replace(hour=23, minute=59, second=59)
    q = db.query(Reservation).filter(
        Reservation.reservation_time >= today_start,
        Reservation.reservation_time <= today_end
    )
    if branch_id:
        q = q.filter(Reservation.branch_id == branch_id)
    reservations = q.order_by(Reservation.reservation_time).all()
    result = []
    for r in reservations:
        t = db.query(TableModel).filter(TableModel.id == r.table_id).first() if r.table_id else None
        result.append({
            "id": r.id, "table_id": r.table_id,
            "table_name": t.name if t else None,
            "customer_name": r.customer_name, "customer_phone": r.customer_phone,
            "customer_email": r.customer_email, "guests": r.guests,
            "reservation_time": r.reservation_time.isoformat(),
            "status": r.status, "notes": r.notes,
            "reminder_sent": r.reminder_sent or 0
        })
    return result


@router.post("")
def create_reservation(data: dict, db: Session = Depends(get_db)):
    r = Reservation(
        table_id=data.get("table_id"),
        customer_name=data["customer_name"],
        customer_phone=data.get("customer_phone", ""),
        customer_email=data.get("customer_email", ""),
        guests=data.get("guests", 2),
        reservation_time=datetime.fromisoformat(data["reservation_time"]),
        status="confirmed",
        notes=data.get("notes", ""),
        branch_id=data.get("branch_id")
    )
    db.add(r)
    db.flush()
    log_action(db, "reservation_created", "reservation", r.id, details=f"{r.customer_name} ({r.guests} oseb)")
    db.commit()
    db.refresh(r)
    return {"id": r.id, "status": r.status}


@router.put("/{reservation_id}")
def update_reservation(reservation_id: int, data: dict, db: Session = Depends(get_db)):
    r = db.query(Reservation).filter(Reservation.id == reservation_id).first()
    if not r:
        raise HTTPException(404, "Reservation not found")
    for k in ("table_id", "customer_name", "customer_phone", "customer_email", "guests", "notes"):
        if k in data:
            setattr(r, k, data[k])
    if "reservation_time" in data:
        r.reservation_time = datetime.fromisoformat(data["reservation_time"])
    if "status" in data:
        r.status = data["status"]
    log_action(db, "reservation_updated", "reservation", r.id, details=f"{r.customer_name} -> {r.status}")
    db.commit()
    return {"ok": True}


@router.delete("/{reservation_id}")
def delete_reservation(reservation_id: int, db: Session = Depends(get_db)):
    r = db.query(Reservation).filter(Reservation.id == reservation_id).first()
    if not r:
        raise HTTPException(404, "Reservation not found")
    log_action(db, "reservation_deleted", "reservation", r.id, details=r.customer_name)
    db.delete(r)
    db.commit()
    return {"ok": True}


@router.post("/{reservation_id}/seat")
def seat_reservation(reservation_id: int, db: Session = Depends(get_db)):
    r = db.query(Reservation).filter(Reservation.id == reservation_id, Reservation.status == "confirmed").first()
    if not r:
        raise HTTPException(400, "Reservation not found or not confirmed")
    r.status = "seated"
    log_action(db, "reservation_seated", "reservation", r.id, details=r.customer_name)
    db.commit()
    return {"status": "seated"}


@router.post("/{reservation_id}/cancel")
def cancel_reservation(reservation_id: int, db: Session = Depends(get_db)):
    r = db.query(Reservation).filter(Reservation.id == reservation_id, Reservation.status.in_(["confirmed", "seated"])).first()
    if not r:
        raise HTTPException(400, "Reservation not found or already finished")
    r.status = "cancelled"
    log_action(db, "reservation_cancelled", "reservation", r.id, details=r.customer_name)
    db.commit()
    return {"status": "cancelled"}


@router.post("/{reservation_id}/no-show")
def noshow_reservation(reservation_id: int, db: Session = Depends(get_db)):
    r = db.query(Reservation).filter(Reservation.id == reservation_id, Reservation.status == "confirmed").first()
    if not r:
        raise HTTPException(400, "Reservation not found or not confirmed")
    r.status = "no_show"
    log_action(db, "reservation_noshow", "reservation", r.id, details=r.customer_name)
    db.commit()
    return {"status": "no_show"}


def _get_setting(db: Session, key: str, default: str = "") -> str:
    s = db.query(Setting).filter(Setting.key == key).first()
    return s.value if s else default


def _send_reminder_email(db: Session, r: Reservation) -> bool:
    if not r.customer_email:
        return False
    host = _get_setting(db, "smtp_host")
    if not host:
        return False
    port = int(_get_setting(db, "smtp_port", "587"))
    user = _get_setting(db, "smtp_user")
    pwd = _get_setting(db, "smtp_pass")
    from_addr = _get_setting(db, "smtp_from", user)
    from_name = _get_setting(db, "smtp_from_name", "Restavracija")
    rname = _get_setting(db, "restaurant_name", "Restavracija")
    raddr = _get_setting(db, "restaurant_address", "")

    time_str = r.reservation_time.strftime("%d.%m.%Y ob %H:%M")
    subject = f"Opomnik - rezervacija pri {rname}"
    body = (
        f"Pozdravljeni, {r.customer_name}!\n\n"
        f"To je prijazen opomnik za vašo rezervacijo pri {rname}.\n\n"
        f"📅 Datum: {time_str}\n"
        f"👥 Število oseb: {r.guests}\n"
        f"{'📍 Naslov: ' + raddr if raddr else ''}\n\n"
        f"Veselimo se vašega obiska!\n"
        f"Lep pozdrav,\n{rname}"
    )
    msg = MIMEText(body)
    msg["Subject"] = subject
    msg["From"] = f"{from_name} <{from_addr}>" if from_name else from_addr
    msg["To"] = r.customer_email

    try:
        with smtplib.SMTP(host, port, timeout=10) as server:
            server.starttls()
            if user and pwd:
                server.login(user, pwd)
            server.send_message(msg)
        return True
    except Exception:
        return False


@router.post("/{reservation_id}/send-reminder")
def send_reminder(reservation_id: int, db: Session = Depends(get_db)):
    r = db.query(Reservation).filter(Reservation.id == reservation_id).first()
    if not r:
        raise HTTPException(404, "Reservation not found")
    if not r.customer_email:
        raise HTTPException(400, "No email address for this reservation")
    ok = _send_reminder_email(db, r)
    if not ok:
        raise HTTPException(500, "Failed to send email – check SMTP settings")
    r.reminder_sent = (r.reminder_sent or 0) + 1
    log_action(db, "reservation_reminder", "reservation", r.id, details=f"Reminder sent to {r.customer_email}")
    db.commit()
    return {"ok": True, "reminder_sent": r.reminder_sent}


@router.post("/send-pending-reminders")
def send_pending_reminders(db: Session = Depends(get_db)):
    enabled = _get_setting(db, "enable_auto_reminders", "false")
    if enabled != "true":
        return {"skipped": True, "reason": "Auto reminders disabled"}
    hours = float(_get_setting(db, "reminder_hours_before", "2"))
    now = datetime.now()
    window_start = now + timedelta(hours=hours)
    window_end = now + timedelta(hours=hours + 1)

    upcoming = db.query(Reservation).filter(
        Reservation.status == "confirmed",
        Reservation.reservation_time >= window_start,
        Reservation.reservation_time <= window_end,
        Reservation.customer_email != "",
        Reservation.reminder_sent == 0,
    ).all()

    sent = 0
    for r in upcoming:
        if _send_reminder_email(db, r):
            r.reminder_sent = (r.reminder_sent or 0) + 1
            log_action(db, "reservation_reminder_auto", "reservation", r.id, details=f"Auto reminder to {r.customer_email}")
            sent += 1
    db.commit()
    return {"sent": sent, "total": len(upcoming)}
