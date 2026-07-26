"""Kitchen Display Timers API — časovniki za KDS."""
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime

from app.core.database import get_db
from app.api.v1.auth import get_current_user

router = APIRouter(prefix="/kds-timers", tags=["KDS časovniki"])


class TimerStart(BaseModel):
    order_id: int
    station: Optional[str] = None  # grill, fryer, salad, etc.


class TimerUpdate(BaseModel):
    notes: Optional[str] = None
    priority: Optional[str] = None  # low, normal, high, urgent


@router.post("/start")
def start_timer(req: TimerStart, db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Začni časovnik za naročilo."""
    from app.models.order import Order
    from app.models.kds_timer import KDSTimer

    order = db.query(Order).filter(Order.id == req.order_id).first()
    if not order:
        return {"error": "Naročilo ni najdeno"}

    # Check if timer already exists
    existing = db.query(KDSTimer).filter(
        KDSTimer.order_id == req.order_id,
        KDSTimer.completed == False
    ).first()

    if existing:
        return {"timer_id": existing.id, "message": "Časovnik že teče"}

    timer = KDSTimer(
        order_id=req.order_id,
        station=req.station,
        started_at=datetime.now(),
        started_by=getattr(user, 'id', None),
    )
    db.add(timer)
    db.commit()
    db.refresh(timer)

    return {"timer_id": timer.id, "message": "Časovnik zagnan"}


@router.put("/{timer_id}/complete")
def complete_timer(timer_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Označi časovnik kot končan."""
    from app.models.kds_timer import KDSTimer

    timer = db.query(KDSTimer).filter(KDSTimer.id == timer_id).first()
    if not timer:
        return {"error": "Časovnik ni najden"}

    timer.completed = True
    timer.completed_at = datetime.now()
    db.commit()

    elapsed = (timer.completed_at - timer.started_at).total_seconds() / 60

    return {
        "message": "Naročilo pripravljeno",
        "elapsed_minutes": round(elapsed, 1),
    }


@router.put("/{timer_id}")
def update_timer(timer_id: int, update: TimerUpdate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Posodobi časovnik (priority, notes)."""
    from app.models.kds_timer import KDSTimer

    timer = db.query(KDSTimer).filter(KDSTimer.id == timer_id).first()
    if not timer:
        return {"error": "Časovnik ni najden"}

    if update.notes is not None:
        timer.notes = update.notes
    if update.priority is not None:
        timer.priority = update.priority
    db.commit()

    return {"message": "Časovnik posodobljen"}


@router.delete("/{timer_id}")
def delete_timer(timer_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Prekliči časovnik."""
    from app.models.kds_timer import KDSTimer

    timer = db.query(KDSTimer).filter(KDSTimer.id == timer_id).first()
    if not timer:
        return {"error": "Časovnik ni najden"}

    db.delete(timer)
    db.commit()
    return {"message": "Časovnik izbrisan"}


@router.get("/active")
def get_active_timers(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Vsi aktivni časovniki."""
    from app.models.kds_timer import KDSTimer
    from app.models.order import Order

    timers = db.query(KDSTimer).filter(KDSTimer.completed == False).all()

    now = datetime.now()
    result = []
    for t in timers:
        order = db.query(Order).filter(Order.id == t.order_id).first()
        elapsed = (now - t.started_at).total_seconds() / 60

        result.append({
            "id": t.id,
            "order_id": t.order_id,
            "table_name": order.table_name if order and hasattr(order, 'table_name') else f"Miza #{order.table_id}" if order else "",
            "station": getattr(t, 'station', ''),
            "started_at": t.started_at.isoformat(),
            "elapsed_minutes": round(elapsed, 1),
            "priority": getattr(t, 'priority', 'normal'),
            "notes": getattr(t, 'notes', ''),
            "items_count": len(order.items) if order and hasattr(order, 'items') and order.items else 0,
        })

    result.sort(key=lambda x: x["elapsed_minutes"], reverse=True)

    return {"timers": result, "count": len(result)}


@router.get("/stats")
def get_timer_stats(
    days: int = Query(7, ge=1, le=30),
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Statistika časovnikov."""
    from app.models.kds_timer import KDSTimer
    from datetime import timedelta

    start = datetime.now() - timedelta(days=days)

    completed = db.query(KDSTimer).filter(
        KDSTimer.completed == True,
        KDSTimer.completed_at >= start
    ).all()

    if not completed:
        return {"avg_time": 0, "total_completed": 0, "by_station": {}}

    times = []
    by_station = {}
    for t in completed:
        elapsed = (t.completed_at - t.started_at).total_seconds() / 60
        times.append(elapsed)

        station = getattr(t, 'station', 'general') or 'general'
        if station not in by_station:
            by_station[station] = {"count": 0, "total_time": 0}
        by_station[station]["count"] += 1
        by_station[station]["total_time"] += elapsed

    # Average by station
    for station in by_station:
        s = by_station[station]
        s["avg_time"] = round(s["total_time"] / s["count"], 1) if s["count"] > 0 else 0

    return {
        "period_days": days,
        "total_completed": len(completed),
        "avg_time": round(sum(times) / len(times), 1) if times else 0,
        "min_time": round(min(times), 1) if times else 0,
        "max_time": round(max(times), 1) if times else 0,
        "by_station": by_station,
    }
