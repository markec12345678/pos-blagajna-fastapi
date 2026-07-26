"""Advanced employee performance tracking."""
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional, List
from datetime import datetime, timedelta

from app.core.database import get_db
from app.api.v1.auth import get_current_user

router = APIRouter(prefix="/employee-performance", tags=["Employee performance"])


@router.get("/summary")
def get_employee_summary(
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Povzetek performanse vseh zaposlenih."""
    from app.models.user import User
    from app.models.order import Order, OrderItem
    from app.models.payment import Payment

    start = datetime.now() - timedelta(days=days)
    employees = db.query(User).filter(User.is_active == True).all()

    summary = []
    for emp in employees:
        # Orders handled
        orders = db.query(Order).filter(
            Order.user_id == emp.id,
            Order.created_at >= start
        ).all()

        # Payments processed
        payments = db.query(Payment).filter(
            Payment.user_id == emp.id,
            Payment.created_at >= start
        ).all()

        total_sales = sum(p.amount for p in payments)
        total_tips = sum(p.tip for p in payments if p.tip)
        order_count = len(orders)
        avg_order = total_sales / order_count if order_count > 0 else 0

        # Items sold
        order_ids = [o.id for o in orders]
        if order_ids:
            items_sold = db.query(func.sum(OrderItem.quantity)).filter(
                OrderItem.order_id.in_(order_ids)
            ).scalar() or 0
        else:
            items_sold = 0

        # Shifts worked
        from app.models.shift import EmployeeShift
        shifts = db.query(EmployeeShift).filter(
            EmployeeShift.user_id == emp.id,
            EmployeeShift.date >= start.strftime('%Y-%m-%d')
        ).all()

        total_hours = 0
        for s in shifts:
            try:
                start_parts = str(getattr(s, 'start_time', '0:0')).split(':')
                end_parts = str(getattr(s, 'end_time', '0:0')).split(':')
                hours = (int(end_parts[0]) + int(end_parts[1])/60) - (int(start_parts[0]) + int(start_parts[1])/60)
                if hours > 0:
                    total_hours += hours
            except:
                pass

        # Performance score
        sales_score = min(100, (total_sales / 1000) * 100) if total_sales > 0 else 0
        efficiency_score = min(100, (avg_order / 20) * 100) if avg_order > 0 else 0
        productivity_score = min(100, (items_sold / total_hours)) if total_hours > 0 else 0

        overall_score = round((sales_score * 0.4 + efficiency_score * 0.3 + productivity_score * 0.3), 1)

        summary.append({
            "user_id": emp.id,
            "name": getattr(emp, 'full_name', emp.username),
            "role": getattr(emp, 'role', ''),
            "total_sales": round(total_sales, 2),
            "total_tips": round(total_tips, 2),
            "order_count": order_count,
            "avg_order_value": round(avg_order, 2),
            "items_sold": items_sold,
            "shifts_worked": len(shifts),
            "total_hours": round(total_hours, 1),
            "sales_per_hour": round(total_sales / total_hours, 2) if total_hours > 0 else 0,
            "performance_score": overall_score,
        })

    summary.sort(key=lambda x: x["performance_score"], reverse=True)

    return {
        "period_days": days,
        "employees": summary,
        "top_performer": summary[0] if summary else None,
    }


@router.get("/detail/{user_id}")
def get_employee_detail(
    user_id: int,
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Podrobna performance za posameznega zaposlenega."""
    from app.models.user import User
    from app.models.order import Order, OrderItem
    from app.models.payment import Payment

    emp = db.query(User).filter(User.id == user_id).first()
    if not emp:
        return {"error": "Zaposleni ni najden"}

    start = datetime.now() - timedelta(days=days)

    # Daily sales trend
    daily_sales = []
    for i in range(days):
        day = start + timedelta(days=i)
        day_start = day.replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(hours=23, minutes=59, seconds=59)
        
        day_payments = db.query(Payment).filter(
            Payment.user_id == user_id,
            Payment.created_at >= day_start,
            Payment.created_at <= day_end
        ).all()
        
        day_total = sum(p.amount for p in day_payments)
        daily_sales.append({"date": day.strftime('%Y-%m-%d'), "sales": round(day_total, 2)})

    # Top items sold
    orders = db.query(Order).filter(
        Order.user_id == user_id,
        Order.created_at >= start
    ).all()
    order_ids = [o.id for o in orders]

    top_items = []
    if order_ids:
        top_items = db.query(
            OrderItem.item_name,
            func.sum(OrderItem.quantity).label("qty"),
            func.sum(OrderItem.total_price).label("total")
        ).filter(
            OrderItem.order_id.in_(order_ids)
        ).group_by(OrderItem.item_name).order_by(
            func.sum(OrderItem.quantity).desc()
        ).limit(10).all()

    return {
        "user_id": user_id,
        "name": getattr(emp, 'full_name', emp.username),
        "period_days": days,
        "daily_sales": daily_sales,
        "top_items": [{"name": i[0], "quantity": int(i[1]), "total": round(i[2], 2)} for i in top_items],
    }


@router.get("/leaderboard")
def get_leaderboard(
    metric: str = Query("sales", pattern="^(sales|orders|tips|efficiency)$"),
    limit: int = Query(10, ge=1, le=50),
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Lestvica zaposlenih po različnih metrikah."""
    from app.models.user import User
    from app.models.order import Order
    from app.models.payment import Payment

    start = datetime.now() - timedelta(days=days)
    employees = db.query(User).filter(User.is_active == True).all()

    leaderboard = []
    for emp in employees:
        payments = db.query(Payment).filter(
            Payment.user_id == emp.id,
            Payment.created_at >= start
        ).all()

        orders = db.query(Order).filter(
            Order.user_id == emp.id,
            Order.created_at >= start
        ).all()

        total_sales = sum(p.amount for p in payments)
        total_tips = sum(p.tip for p in payments if p.tip)
        order_count = len(orders)
        avg_order = total_sales / order_count if order_count > 0 else 0

        if metric == "sales":
            value = total_sales
        elif metric == "orders":
            value = order_count
        elif metric == "tips":
            value = total_tips
        else:  # efficiency
            value = avg_order

        leaderboard.append({
            "user_id": emp.id,
            "name": getattr(emp, 'full_name', emp.username),
            "role": getattr(emp, 'role', ''),
            "value": round(value, 2),
            "metric": metric,
        })

    leaderboard.sort(key=lambda x: x["value"], reverse=True)

    return {
        "metric": metric,
        "period_days": days,
        "leaderboard": leaderboard[:limit],
    }


@router.get("/goals")
def get_employee_goals(
    user_id: Optional[int] = None,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Vrni cilje zaposlenih."""
    # In production: store goals in DB
    # For now: return default goals
    return {
        "goals": [
            {"id": 1, "user_id": user_id or user.id, "type": "sales", "target": 5000, "current": 3200, "period": "monthly"},
            {"id": 2, "user_id": user_id or user.id, "type": "orders", "target": 100, "current": 67, "period": "monthly"},
            {"id": 3, "user_id": user_id or user.id, "type": "avg_order", "target": 25, "current": 22.5, "period": "monthly"},
        ]
    }