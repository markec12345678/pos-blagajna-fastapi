from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.audit_log import AuditLog
from datetime import datetime
from pydantic import BaseModel
from typing import Optional
from app.models.user import User
from app.api.v1.auth import get_current_user

router = APIRouter(prefix="/audit", tags=["audit"])


class AuditEntry(BaseModel):
    id: int
    action: str
    entity_type: Optional[str] = None
    entity_id: Optional[int] = None
    user_id: Optional[int] = None
    details: Optional[str] = None
    created_at: datetime


def log_action(db: Session, action: str, entity_type: str = None, entity_id: int = None, user_id: int = None, details: str = None):
    log = AuditLog(action=action, entity_type=entity_type, entity_id=entity_id, user_id=user_id, details=details)
    db.add(log)
    db.flush()
    return log


@router.get("")
def get_audit_logs(limit: int = 100, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    logs = db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(limit).all()
    return [AuditEntry(id=l.id, action=l.action, entity_type=l.entity_type, entity_id=l.entity_id, user_id=l.user_id, details=l.details, created_at=l.created_at) for l in logs]
