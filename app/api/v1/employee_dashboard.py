"""Employee Performance Dashboard API — metrike zaposlenih."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime, timedelta

from app.core.database import get_db
from app.api.v1.auth import get_current_user

router = APIRouter(prefix="/employee-dashboard", tags=["Dashboard zaposlenih"])


@router.get("/summary")
def get_performance_summary(
    days: int = Query(30, ge=1, le=365),
    branch_id: Optional[int] = None,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Povzetek uspešnosti vseh zaposlenih."""
    from app.models.user import User
    from app.models.order import Order
    from app.models.payment import Payment
    from app.models.shift import EmployeeShift

    start = datetime.now() - timedelta(days=days)

    employees = db.query(User).filter(User.is_active == True).all()

    result = []
    for emp in employees:
        # Orders processed
        orders_q = db.query(Order).filter(
            Order.created_at >= start,
            Order.cashier_id == emp.id,
            Order.status.in_(['closed', 'paid'])
        )
        if branch_id:
            orders_q = orders_q.filter(Order.branch_id == branch_id)
        orders = orders_q.all()

        total_revenue = sum(float(o.total or 0) for o in orders)
        order_count = len(orders)

        # Shifts worked
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
                    total_hours += round(hours, 1)
            except:
                pass

        avg_order_value = total_revenue / order_count if order_count > 0 else 0
        revenue_per_hour = total_revenue / total_hours if total_hours > 0 else 0

        result.append({
            "id": emp.id,
            "name": getattr(emp, 'full_name', emp.username),
            "role": getattr(emp, 'role', 'Neznan'),
            "orders_processed": order_count,
            "total_revenue": round(total_revenue, 2),
            "avg_order_value": round(avg_order_value, 2),
            "shifts_worked": len(shifts),
            "total_hours": total_hours,
            "revenue_per_hour": round(revenue_per_hour, 2),
        })

    # Sort by revenue
    result.sort(key=lambda x: x["total_revenue"], reverse=True)

    # Overall stats
    total_rev = sum(r["total_revenue"] for r in result)
    total_orders = sum(r["orders_processed"] for r in result)
    total_hrs = sum(r["total_hours"] for r in result)

    return {
        "period_days": days,
        "summary": {
            "total_revenue": round(total_rev, 2),
            "total_orders": total_orders,
            "total_hours": total_hrs,
            "avg_revenue_per_employee": round(total_rev / len(result), 2) if result else 0,
            "avg_orders_per_employee": round(total_orders / len(result), 2) if result else 0,
        },
        "employees": result,
    }


@router.get("/employee/{employee_id}")
def get_employee_detail(
    employee_id: int,
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Podrobnosti o uspešnosti posameznega zaposlenega."""
    from app.models.user import User
    from app.models.order import Order
    from app.models.shift import EmployeeShift

    emp = db.query(User).filter(User.id == employee_id).first()
    if not emp:
        return {"error": "Zaposlen ni najden"}

    start = datetime.now() - timedelta(days=days)

    # Daily performance
    orders = db.query(Order).filter(
        Order.created_at >= start,
        Order.cashier_id == employee_id,
        Order.status.in_(['closed', 'paid'])
    ).all()

    daily = {}
    for o in orders:
        day = o.created_at.strftime('%Y-%m-%d')
        if day not in daily:
            daily[day] = {"orders": 0, "revenue": 0}
        daily[day]["orders"] += 1
        daily[day]["revenue"] += float(o.total or 0)

    # Shifts
    shifts = db.query(EmployeeShift).filter(
        EmployeeShift.user_id == employee_id,
        EmployeeShift.date >= start.strftime('%Y-%m-%d')
    ).all()

    # Best/worst days
    best_day = max(daily.items(), key=lambda x: x[1]["revenue"]) if daily else None
    worst_day = min(daily.items(), key=lambda x: x[1]["revenue"]) if daily else None

    return {
        "employee": {
            "id": emp.id,
            "name": getattr(emp, 'full_name', emp.username),
            "role": getattr(emp, 'role', ''),
        },
        "period_days": days,
        "total_orders": len(orders),
        "total_revenue": round(sum(float(o.total or 0) for o in orders), 2),
        "shifts_count": len(shifts),
        "daily_performance": daily,
        "best_day": {"date": best_day[0], "revenue": round(best_day[1]["revenue"], 2)} if best_day else None,
        "worst_day": {"date": worst_day[0], "revenue": round(worst_day[1]["revenue"], 2)} if worst_day else None,
    }


@router.get("/leaderboard")
def get_leaderboard(
    days: int = Query(30, ge=1, le=365),
    metric: str = Query("revenue", pattern="^(revenue|orders|efficiency)$"),
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Leaderboard zaposlenih."""
    from app.models.user import User
    from app.models.order import Order
    from app.models.shift import EmployeeShift

    start = datetime.now() - timedelta(days=days)
    employees = db.query(User).filter(User.is_active == True).all()

    leaderboard = []
    for emp in employees:
        orders = db.query(Order).filter(
            Order.created_at >= start,
            Order.cashier_id == emp.id,
            Order.status.in_(['closed', 'paid'])
        ).count()

        revenue = db.query(Order).filter(
            Order.created_at >= start,
            Order.cashier_id == emp.id,
            Order.status.in_(['closed', 'paid'])
        ).all()
        total_rev = sum(float(o.total or 0) for o in revenue)

        shifts = db.query(EmployeeShift).filter(
            EmployeeShift.user_id == emp.id,
            EmployeeShift.date >= start.strftime('%Y-%m-%d')
        ).count()

        leaderboard.append({
            "id": emp.id,
            "name": getattr(emp, 'full_name', emp.username),
            "role": getattr(emp, 'role', ''),
            "revenue": round(total_rev, 2),
            "orders": orders,
            "shifts": shifts,
            "efficiency": round(total_rev / shifts, 2) if shifts > 0 else 0,
        })

    leaderboard.sort(key=lambda x: x[metric], reverse=True)

    return {
        "period_days": days,
        "metric": metric,
        "leaderboard": [
            {**entry, "rank": i + 1}
            for i, entry in enumerate(leaderboard)
        ]
    }
