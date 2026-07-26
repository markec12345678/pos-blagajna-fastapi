from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.service_request import ServiceRequest
from app.models.table_model import TableModel
from datetime import datetime

router = APIRouter(prefix="/service-requests", tags=["service-requests"])


@router.get("")
def list_requests(status: str = None, db: Session = Depends(get_db)):
    q = db.query(ServiceRequest).order_by(ServiceRequest.created_at.desc())
    if status:
        q = q.filter(ServiceRequest.status == status)
    return [{
        "id": r.id, "table_id": r.table_id, "table_name": r.table_name,
        "request_type": r.request_type, "message": r.message, "status": r.status,
        "created_at": str(r.created_at),
        "acknowledged_at": str(r.acknowledged_at) if r.acknowledged_at else None,
        "acknowledged_by": r.acknowledged_by
    } for r in q.all()]


@router.post("/{req_id}/ack")
def acknowledge(req_id: int, db: Session = Depends(get_db)):
    r = db.query(ServiceRequest).filter(ServiceRequest.id == req_id).first()
    if not r:
        raise HTTPException(404, "Not found")
    r.status = "acknowledged"
    r.acknowledged_at = datetime.now()
    db.commit()
    return {"status": "acknowledged"}


@router.post("/{req_id}/complete")
def complete(req_id: int, db: Session = Depends(get_db)):
    r = db.query(ServiceRequest).filter(ServiceRequest.id == req_id).first()
    if not r:
        raise HTTPException(404, "Not found")
    r.status = "completed"
    db.commit()
    return {"status": "completed"}
