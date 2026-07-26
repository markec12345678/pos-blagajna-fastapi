from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.reservation import Reservation
from app.models.table_model import TableModel
from app.models.settings import Setting
from app.api.v1.audit_log import log_action
from app.schemas.reservation import CreateReservation, UpdateReservation
from datetime import datetime, date, timedelta
import smtplib
from email.mime.text import MIMEText

router = APIRouter(prefix="/reservations", tags=["reservations"])


@router.get("/availability")
def check_availability(reservation_time: str, branch_id: int = 0, db: Session = Depends(get_db)):
    res_time = datetime.fromisoformat(reservation_time)
    window_start = res_time - timedelta(hours=2)
    window_end = res_time + timedelta(hours=2)
    booked_table_ids = {
        r.table_id for r in db.query(Reservation).filter(
            Reservation.table_id != None,
            Reservation.status.in_(["confirmed", "seated"]),
            Reservation.reservation_time >= window_start,
            Reservation.reservation_time <= window_end,
        ).all()
    }
    tables = db.query(TableModel).filter(TableModel.is_active == True)
    if branch_id:
        tables = tables.filter(TableModel.branch_id == branch_id)
    available = []
    for t in tables.all():
        available.append({
            "id": t.id, "name": t.name, "seats": t.seats,
            "available": t.id not in booked_table_ids
        })
    return {"reservation_time": reservation_time, "tables": available}


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
def create_reservation(data: CreateReservation, db: Session = Depends(get_db)):
    res_time = datetime.fromisoformat(data.reservation_time)
    window_start = res_time - timedelta(hours=2)
    window_end = res_time + timedelta(hours=2)

    if data.table_id:
        conflict = db.query(Reservation).filter(
            Reservation.table_id == data.table_id,
            Reservation.status.in_(["confirmed", "seated"]),
            Reservation.reservation_time >= window_start,
            Reservation.reservation_time <= window_end,
        ).first()
        if conflict:
            raise HTTPException(
                409,
                f"Miza je že rezervirana ob {conflict.reservation_time.strftime('%H:%M')} "
                f"za {conflict.customer_name} ({conflict.guests} oseb)"
            )

    r = Reservation(
        table_id=data.table_id,
        customer_name=data.customer_name,
        customer_phone=data.customer_phone,
        customer_email=data.customer_email,
        guests=data.guests,
        reservation_time=datetime.fromisoformat(data.reservation_time),
        status="confirmed",
        notes=data.notes,
        branch_id=data.branch_id
    )
    db.add(r)
    db.flush()
    log_action(db, "reservation_created", "reservation", r.id, details=f"{r.customer_name} ({r.guests} oseb)")
    db.commit()
    db.refresh(r)
    return {"id": r.id, "status": r.status}


@router.put("/{reservation_id}")
def update_reservation(reservation_id: int, data: UpdateReservation, db: Session = Depends(get_db)):
    r = db.query(Reservation).filter(Reservation.id == reservation_id).first()
    if not r:
        raise HTTPException(404, "Reservation not found")
    update_data = data.model_dump(exclude_unset=True)
    for k in ("table_id", "customer_name", "customer_phone", "customer_email", "guests", "notes"):
        if k in update_data:
            setattr(r, k, update_data[k])
    if "reservation_time" in update_data:
        r.reservation_time = datetime.fromisoformat(update_data["reservation_time"])
    if "status" in update_data:
        r.status = update_data["status"]
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


@router.post("/auto-assign")
def auto_assign_table(reservation_time: str, guests: int, branch_id: int = 0, db: Session = Depends(get_db)):
    """Samodejno dodeli mizo glede na število gostov in razpoložljivost."""
    res_time = datetime.fromisoformat(reservation_time)
    window_start = res_time - timedelta(hours=2)
    window_end = res_time + timedelta(hours=2)

    # Get booked tables in the time window
    booked_table_ids = {
        r.table_id for r in db.query(Reservation).filter(
            Reservation.table_id != None,
            Reservation.status.in_(["confirmed", "seated"]),
            Reservation.reservation_time >= window_start,
            Reservation.reservation_time <= window_end,
        ).all()
    }

    # Get available tables
    tables = db.query(TableModel).filter(TableModel.is_active == True)
    if branch_id:
        tables = tables.filter(TableModel.branch_id == branch_id)

    available = []
    for t in tables.all():
        if t.id not in booked_table_ids:
            seats = getattr(t, 'seats', 4) or 4
            available.append({
                "id": t.id,
                "name": t.name,
                "seats": seats,
                "score": seats - guests if seats >= guests else -1  # Prefer tight fit
            })

    # Filter tables with enough seats and sort by best fit
    suitable = [t for t in available if t["seats"] >= guests]
    suitable.sort(key=lambda x: x["score"])  # Ascending = tightest fit first

    if suitable:
        best = suitable[0]
        return {
            "assigned_table": best["id"],
            "table_name": best["name"],
            "seats": best["seats"],
            "alternatives": [{"id": t["id"], "name": t["name"], "seats": t["seats"]} for t in suitable[1:4]]
        }
    else:
        # No table with enough seats - find largest available
        available.sort(key=lambda x: x["seats"], reverse=True)
        if available:
            return {
                "assigned_table": None,
                "message": f"Ni mize za {guests} oseb. Največja razpoložljiva: {available[0]['name']} ({available[0]['seats']} sedežev)",
                "alternatives": [{"id": t["id"], "name": t["name"], "seats": t["seats"]} for t in available[:3]]
            }
        return {"assigned_table": None, "message": "Ni razpoložljivih miz"}


@router.get("/timeline")
def get_reservation_timeline(date: str = None, branch_id: int = 0, db: Session = Depends(get_db)):
    """Vrni rezervacije za časovni trak (Gantt view)."""
    if date:
        d = datetime.fromisoformat(date)
    else:
        d = datetime.now()

    day_start = d.replace(hour=0, minute=0, second=0, microsecond=0)
    day_end = d.replace(hour=23, minute=59, second=59)

    q = db.query(Reservation).filter(
        Reservation.reservation_time >= day_start,
        Reservation.reservation_time <= day_end,
        Reservation.status.in_(["confirmed", "seated"])
    )
    if branch_id:
        q = q.filter(Reservation.branch_id == branch_id)

    reservations = q.order_by(Reservation.reservation_time).all()

    timeline = []
    for r in reservations:
        t = db.query(TableModel).filter(TableModel.id == r.table_id).first() if r.table_id else None
        timeline.append({
            "id": r.id,
            "customer_name": r.customer_name,
            "guests": r.guests,
            "time": r.reservation_time.strftime("%H:%M"),
            "hour": r.reservation_time.hour,
            "table_name": t.name if t else "Ni mize",
            "table_id": r.table_id,
            "status": r.status,
            "duration_hours": 2,  # Default 2 hour reservation
        })

    return {"date": day_start.strftime('%Y-%m-%d'), "reservations": timeline}


@router.get("/calendar")
def get_calendar_view(
    year: int = Query(None),
    month: int = Query(None),
    branch_id: int = 0,
    db: Session = Depends(get_db)
):
    """Vrni koledarski prikaz rezervacij."""
    now = datetime.now()
    y = year or now.year
    m = month or now.month

    # Get first and last day of month
    first_day = datetime(y, m, 1)
    if m == 12:
        last_day = datetime(y + 1, 1, 1) - timedelta(days=1)
    else:
        last_day = datetime(y, m + 1, 1) - timedelta(days=1)

    q = db.query(Reservation).filter(
        Reservation.reservation_time >= first_day,
        Reservation.reservation_time <= last_day.replace(hour=23, minute=59, second=59)
    )
    if branch_id:
        q = q.filter(Reservation.branch_id == branch_id)

    reservations = q.order_by(Reservation.reservation_time).all()

    # Group by date
    calendar = {}
    for r in reservations:
        date_str = r.reservation_time.strftime('%Y-%m-%d')
        if date_str not in calendar:
            calendar[date_str] = []
        
        t = db.query(TableModel).filter(TableModel.id == r.table_id).first() if r.table_id else None
        calendar[date_str].append({
            "id": r.id,
            "customer_name": r.customer_name,
            "guests": r.guests,
            "time": r.reservation_time.strftime('%H:%M'),
            "table_name": t.name if t else None,
            "status": r.status,
        })

    # Generate calendar grid
    days_in_month = (last_day - first_day).days + 1
    calendar_grid = []
    for day in range(1, days_in_month + 1):
        date = datetime(y, m, day)
        date_str = date.strftime('%Y-%m-%d')
        is_today = date.date() == now.date()
        is_weekend = date.weekday() >= 5
        
        calendar_grid.append({
            "day": day,
            "date": date_str,
            "is_today": is_today,
            "is_weekend": is_weekend,
            "reservations": calendar.get(date_str, []),
            "count": len(calendar.get(date_str, [])),
        })

    return {
        "year": y,
        "month": m,
        "month_name": first_day.strftime('%B'),
        "total_reservations": len(reservations),
        "calendar": calendar_grid,
    }


@router.get("/table-availability")
def get_table_availability(
    date: str = Query(None),
    branch_id: int = 0,
    db: Session = Depends(get_db)
):
    """Vrni razpoložljivost miz za določen dan."""
    if date:
        d = datetime.fromisoformat(date)
    else:
        d = datetime.now()

    day_start = d.replace(hour=0, minute=0, second=0, microsecond=0)
    day_end = d.replace(hour=23, minute=59, second=59)

    # Get all reservations for the day
    reservations = db.query(Reservation).filter(
        Reservation.reservation_time >= day_start,
        Reservation.reservation_time <= day_end,
        Reservation.status.in_(["confirmed", "seated"])
    ).all()

    # Get all tables
    tables = db.query(TableModel).filter(TableModel.is_active == True)
    if branch_id:
        tables = tables.filter(TableModel.branch_id == branch_id)

    table_availability = []
    for t in tables.all():
        table_reservations = [r for r in reservations if r.table_id == t.id]
        
        # Calculate booked hours
        booked_hours = []
        for r in table_reservations:
            hour = r.reservation_time.hour
            booked_hours.append(hour)
            booked_hours.append(hour + 1)  # Assume 2-hour reservation

        # Availability per hour (10:00 - 22:00)
        availability = {}
        for hour in range(10, 23):
            if hour in booked_hours:
                availability[hour] = "booked"
            else:
                availability[hour] = "available"

        table_availability.append({
            "table_id": t.id,
            "table_name": t.name,
            "seats": getattr(t, 'seats', 4),
            "total_reservations": len(table_reservations),
            "availability": availability,
        })

    return {
        "date": d.strftime('%Y-%m-%d'),
        "tables": table_availability,
    }
