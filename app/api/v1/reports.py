"""Reports API — dnevna, tedenska, mesečna poročila z PDF."""
from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime, timedelta
import json

from app.core.database import get_db
from app.api.v1.auth import get_current_user

router = APIRouter(prefix="/reports", tags=["Poročila"])


@router.get("/daily")
def get_daily_report(
    date: Optional[str] = None,
    branch_id: Optional[int] = None,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Dnevno poročilo."""
    from app.core.pdf_generator import generate_daily_report
    report_date = datetime.strptime(date, '%Y-%m-%d') if date else datetime.now()
    return generate_daily_report(db, report_date, branch_id)


@router.get("/weekly")
def get_weekly_report(
    start_date: Optional[str] = None,
    branch_id: Optional[int] = None,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Tedensko poročilo."""
    from app.core.pdf_generator import generate_weekly_report
    start = datetime.strptime(start_date, '%Y-%m-%d') if start_date else datetime.now() - timedelta(days=datetime.now().weekday())
    return generate_weekly_report(db, start, branch_id)


@router.get("/monthly")
def get_monthly_report(
    year: Optional[int] = None,
    month: Optional[int] = None,
    branch_id: Optional[int] = None,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Mesečno poročilo."""
    from app.core.pdf_generator import generate_monthly_report
    now = datetime.now()
    return generate_monthly_report(db, year or now.year, month or now.month, branch_id)


@router.get("/summary")
def get_summary(
    days: int = Query(7, ge=1, le=365),
    branch_id: Optional[int] = None,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Povzetek za zadnjih N dni."""
    from app.models.order import Order

    start = datetime.now() - timedelta(days=days)
    q = db.query(Order).filter(
        Order.created_at >= start,
        Order.status.in_(['closed', 'paid'])
    )
    if branch_id:
        q = q.filter(Order.branch_id == branch_id)

    orders = q.all()
    total = sum(float(o.total or 0) for o in orders)

    daily = {}
    for o in orders:
        day = o.created_at.strftime('%Y-%m-%d')
        daily[day] = daily.get(day, 0) + float(o.total or 0)

    return {
        'period_days': days,
        'total_revenue': round(total, 2),
        'total_orders': len(orders),
        'avg_daily': round(total / days, 2),
        'daily': {k: round(v, 2) for k, v in daily.items()},
    }


@router.get("/export/{report_type}")
def export_report(
    report_type: str,
    date: Optional[str] = None,
    start_date: Optional[str] = None,
    year: Optional[int] = None,
    month: Optional[int] = None,
    branch_id: Optional[int] = None,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Export poročilo kot JSON za tiskanje/CSV."""
    from app.core.pdf_generator import generate_daily_report, generate_weekly_report, generate_monthly_report

    now = datetime.now()

    if report_type == 'daily':
        report_date = datetime.strptime(date, '%Y-%m-%d') if date else now
        return generate_daily_report(db, report_date, branch_id)
    elif report_type == 'weekly':
        start = datetime.strptime(start_date, '%Y-%m-%d') if start_date else now - timedelta(days=now.weekday())
        return generate_weekly_report(db, start, branch_id)
    elif report_type == 'monthly':
        return generate_monthly_report(db, year or now.year, month or now.month, branch_id)
    else:
        return {'error': 'Neznan tip poročila'}
