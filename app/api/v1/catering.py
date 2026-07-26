from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func as sa_func
from app.core.database import get_db
from app.models.catering import CateringOrder
from app.api.v1.audit_log import log_action
from app.schemas.catering import CreateCatering, UpdateCatering
from datetime import datetime

router = APIRouter(prefix="/catering", tags=["catering"])


@router.get("")
def list_catering(status: str = "", branch_id: int = 0, db: Session = Depends(get_db)):
    q = db.query(CateringOrder)
    if status:
        q = q.filter(CateringOrder.status == status)
    if branch_id:
        q = q.filter(CateringOrder.branch_id == branch_id)
    q = q.order_by(CateringOrder.event_date.desc())
    return [
        {
            "id": r.id, "customer_name": r.customer_name,
            "customer_phone": r.customer_phone, "customer_email": r.customer_email,
            "event_type": r.event_type, "event_date": r.event_date.isoformat(),
            "event_time": r.event_time, "guests": r.guests,
            "location": r.location, "menu_details": r.menu_details,
            "total": r.total, "deposit": r.deposit,
            "deposit_paid": r.deposit_paid, "status": r.status,
            "notes": r.notes,
            "created_at": r.created_at.isoformat() if r.created_at else None,
            "updated_at": r.updated_at.isoformat() if r.updated_at else None,
            "branch_id": r.branch_id, "created_by": r.created_by,
        }
        for r in q.all()
    ]


@router.post("")
def create_catering(data: CreateCatering, db: Session = Depends(get_db)):
    r = CateringOrder(
        customer_name=data.customer_name,
        customer_phone=data.customer_phone,
        customer_email=data.customer_email,
        event_type=data.event_type,
        event_date=datetime.fromisoformat(data.event_date),
        event_time=data.event_time,
        guests=data.guests,
        location=data.location,
        menu_details=data.menu_details,
        total=data.total,
        deposit=data.deposit,
        deposit_paid=data.deposit_paid,
        status=data.status,
        notes=data.notes,
        branch_id=data.branch_id,
        created_by=data.created_by,
    )
    db.add(r)
    db.commit()
    db.refresh(r)
    log_action(db, "create", "catering", r.id, details=f"Ustvarjeno catering naročilo za {r.customer_name}")
    return {"id": r.id, "status": r.status}


@router.put("/{catering_id}")
def update_catering(catering_id: int, data: UpdateCatering, db: Session = Depends(get_db)):
    r = db.query(CateringOrder).filter(CateringOrder.id == catering_id).first()
    if not r:
        raise HTTPException(404, "Catering order not found")
    update_data = data.model_dump(exclude_unset=True)
    for field in ["customer_name", "customer_phone", "customer_email", "event_type",
                  "event_time", "guests", "location", "menu_details",
                  "total", "deposit", "deposit_paid", "status", "notes", "branch_id"]:
        if field in update_data:
            setattr(r, field, update_data[field])
    if "event_date" in update_data:
        r.event_date = datetime.fromisoformat(update_data["event_date"])
    db.commit()
    log_action(db, "update", "catering", r.id, details=f"Posodobljeno catering naročilo {r.customer_name}")
    return {"id": r.id, "status": r.status}


@router.delete("/{catering_id}")
def delete_catering(catering_id: int, db: Session = Depends(get_db)):
    r = db.query(CateringOrder).filter(CateringOrder.id == catering_id).first()
    if not r:
        raise HTTPException(404, "Catering order not found")
    db.delete(r)
    db.commit()
    log_action(db, "delete", "catering", catering_id, details="Izbrisano catering naročilo")
    return {"ok": True}


@router.get("/stats")
def catering_stats(branch_id: int = 0, db: Session = Depends(get_db)):
    q = db.query(CateringOrder)
    if branch_id:
        q = q.filter(CateringOrder.branch_id == branch_id)
    rows = q.all()
    total = len(rows)
    by_status = {}
    upcoming = 0
    now = datetime.now()
    for r in rows:
        by_status[r.status] = by_status.get(r.status, 0) + 1
        if r.event_date > now and r.status not in ("completed", "cancelled"):
            upcoming += 1
    return {
        "total": total,
        "upcoming": upcoming,
        "by_status": by_status,
        "total_deposits": sum(r.deposit for r in rows if r.deposit_paid),
        "total_value": sum(r.total for r in rows),
    }
