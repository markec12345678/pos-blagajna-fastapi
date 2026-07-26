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
    user_ids = [u.id for u in users]

    # Batch-load all closed/paid orders for all users
    all_orders = db.query(Order).filter(
        Order.cashier_id.in_(user_ids),
        Order.created_at >= since,
        Order.status.in_(["closed", "paid"])
    ).all() if user_ids else []
    orders_by_user: dict[int, list] = {}
    for o in all_orders:
        orders_by_user.setdefault(o.cashier_id, []).append(o)

    # Batch-load all order items for all orders
    order_ids = [o.id for o in all_orders]
    all_order_items = db.query(sa_func.sum(OrderItem.quantity), Order.cashier_id).join(Order).filter(
        Order.id.in_(order_ids)
    ).group_by(Order.cashier_id).all() if order_ids else []
    items_by_user = {r[1]: r[0] or 0 for r in all_order_items}

    # Batch-load all shifts for all users
    all_shifts = db.query(EmployeeShift).filter(
        EmployeeShift.user_id.in_(user_ids),
        EmployeeShift.clock_in >= since,
        EmployeeShift.clock_out != None
    ).all() if user_ids else []
    shifts_by_user: dict[int, list] = {}
    for s in all_shifts:
        shifts_by_user.setdefault(s.user_id, []).append(s)

    result = []
    for u in users:
        user_orders = orders_by_user.get(u.id, [])
        total_orders = len(user_orders)
        if total_orders == 0:
            result.append({
                "user_id": u.id, "name": u.full_name, "role": u.role,
                "orders": 0, "revenue": 0, "avg_order": 0,
                "total_items": 0, "hours_worked": 0,
            })
            continue

        revenue = sum(o.total or 0 for o in user_orders)
        items_count = items_by_user.get(u.id, 0)
        user_shifts = shifts_by_user.get(u.id, [])
        hours = sum((s.clock_out - s.clock_in).total_seconds() / 3600 for s in user_shifts if s.clock_out)

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
