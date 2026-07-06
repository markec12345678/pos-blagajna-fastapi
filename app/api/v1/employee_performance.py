from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func as sa_func
from app.core.database import get_db
from app.models.user import User
from app.models.order import Order, OrderItem
from app.models.shift import EmployeeShift
from datetime import datetime, timedelta

router = APIRouter(prefix="/employees", tags=["employees"])


@router.get("/performance")
def employee_performance(days: int = 30, branch_id: int = 0, db: Session = Depends(get_db)):
    since = datetime.now() - timedelta(days=days)
    users_q = db.query(User)
    if branch_id:
        users_q = users_q.filter(User.branch_id == branch_id)
    users = users_q.all()

    result = []
    for u in users:
        orders_q = db.query(Order).filter(
            Order.cashier_id == u.id,
            Order.created_at >= since,
            Order.status.in_(["closed", "paid"])
        )
        total_orders = orders_q.count()
        if total_orders == 0:
            result.append({
                "user_id": u.id, "name": u.full_name, "role": u.role,
                "orders": 0, "revenue": 0, "avg_order": 0,
                "total_items": 0, "hours_worked": 0,
            })
            continue

        revenue = db.query(sa_func.sum(Order.total)).filter(
            Order.cashier_id == u.id,
            Order.created_at >= since,
            Order.status.in_(["closed", "paid"])
        ).scalar() or 0

        items_count = db.query(sa_func.sum(OrderItem.quantity)).join(Order).filter(
            Order.cashier_id == u.id,
            Order.created_at >= since,
            Order.status.in_(["closed", "paid"])
        ).scalar() or 0

        shifts = db.query(EmployeeShift).filter(
            EmployeeShift.user_id == u.id,
            EmployeeShift.clock_in >= since,
            EmployeeShift.clock_out != None
        ).all()
        hours = sum((s.clock_out - s.clock_in).total_seconds() / 3600 for s in shifts if s.clock_out)

        result.append({
            "user_id": u.id, "name": u.full_name, "role": u.role,
            "orders": total_orders,
            "revenue": round(revenue, 2),
            "avg_order": round(revenue / total_orders, 2) if total_orders else 0,
            "total_items": items_count,
            "items_per_order": round(items_count / total_orders, 1) if total_orders else 0,
            "hours_worked": round(hours, 1),
            "revenue_per_hour": round(revenue / hours, 2) if hours else 0,
            "orders_per_hour": round(total_orders / hours, 1) if hours else 0,
        })

    result.sort(key=lambda x: x["revenue"], reverse=True)

    totals = {
        "total_orders": sum(r["orders"] for r in result),
        "total_revenue": sum(r["revenue"] for r in result),
        "total_items": sum(r["total_items"] for r in result),
        "total_hours": sum(r["hours_worked"] for r in result),
    } if result else {}

    return {"employees": result, "totals": totals}
