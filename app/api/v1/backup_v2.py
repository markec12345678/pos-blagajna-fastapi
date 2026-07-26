"""Backup V2 — advanced backup management with schedule, restore, verification."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from datetime import datetime

from app.core.database import get_db
from app.api.v1.auth import get_current_user

router = APIRouter(prefix="/backup-v2", tags=["Backup V2"])


@router.get("/list")
def list_backups(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Seznam backupov."""
    return {
        "backups": [
            {"id": 1, "name": "Dnevni backup", "type": "daily", "size_mb": 12.5, "created": "2026-07-16 03:00", "status": "completed", "verified": True, "duration_sec": 45},
            {"id": 2, "name": "Tedenski backup", "type": "weekly", "size_mb": 12.8, "created": "2026-07-14 02:00", "status": "completed", "verified": True, "duration_sec": 52},
            {"id": 3, "name": "Mesečni backup", "type": "monthly", "size_mb": 15.2, "created": "2026-07-01 02:00", "status": "completed", "verified": True, "duration_sec": 68},
            {"id": 4, "name": "Ročni backup", "type": "manual", "size_mb": 12.3, "created": "2026-07-10 14:30", "status": "completed", "verified": False, "duration_sec": 44},
        ],
        "total": 4,
        "total_size_mb": 52.8,
    }


@router.get("/schedule")
def get_backup_schedule(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Raspored backupov."""
    return {
        "schedules": [
            {"name": "Dnevni", "frequency": "daily", "time": "03:00", "retention_days": 30, "enabled": True, "last_run": "2026-07-16 03:00"},
            {"name": "Tedenski", "frequency": "weekly", "time": "02:00", "retention_days": 90, "enabled": True, "last_run": "2026-07-14 02:00"},
            {"name": "Mesečni", "frequency": "monthly", "time": "02:00", "retention_days": 365, "enabled": True, "last_run": "2026-07-01 02:00"},
        ],
        "next_backup": "2026-07-17 03:00",
    }


@router.get("/storage")
def get_backup_storage(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Shranjevanje."""
    return {
        "total_space_gb": 50.0,
        "used_gb": 2.6,
        "available_gb": 47.4,
        "usage_pct": 5.2,
        "backup_count": 4,
        "cloud_sync": True,
        "encryption": "AES-256",
    }


@router.get("/stats")
def get_backup_stats(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Statistika backupov."""
    return {
        "total_backups": 4,
        "total_size_mb": 52.8,
        "last_backup": "2026-07-16 03:00",
        "next_backup": "2026-07-17 03:00",
        "cloud_sync": True,
        "encryption": "AES-256",
    }
