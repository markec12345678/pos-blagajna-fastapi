from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.database import get_db
from app.models.order import Order, OrderItem
from app.models.payment import Payment
from app.models.table_model import TableModel
from app.models.reservation import Reservation
from app.models.invoice import Invoice
from app.models.customer import Customer
from datetime import datetime, timedelta
from app.core.cache import cached

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@cached(ttl=30, key_prefix="dashboard")
@router.get("")
def dashboard(branch_id: int = 0, db: Session = Depends(get_db)):
    today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    pq = db.query(Payment).filter(Payment.created_at >= today)
    if branch_id:
        pq = pq.join(Order, Payment.order_id == Order.id).filter(Order.branch_id == branch_id)
    payments = pq.all()
    total_sales = sum(p.amount for p in payments)
    total_tips = sum(p.tip for p in payments if p.tip)

    oq = db.query(Order).filter(Order.status == "open")
    if branch_id:
        oq = oq.filter(Order.branch_id == branch_id)
    open_orders = oq.count()

    tq = db.query(TableModel).filter(TableModel.status == "free")
    if branch_id:
        tq = tq.filter(TableModel.branch_id == branch_id)
    free_tables = tq.count()

    tt = db.query(TableModel)
    if branch_id:
        tt = tt.filter(TableModel.branch_id == branch_id)
    total_tables = tt.count()

    cq = db.query(Order).filter(Order.closed_at >= today, Order.status == "closed")
    if branch_id:
        cq = cq.filter(Order.branch_id == branch_id)
    today_orders = cq.count()

    closed_today_ids = db.query(Order.id).filter(Order.closed_at >= today, Order.status == "closed")
    if branch_id:
        closed_today_ids = closed_today_ids.filter(Order.branch_id == branch_id)
    closed_today = closed_today_ids.subquery()
    top_items = db.query(
        OrderItem.item_name, func.sum(OrderItem.quantity).label("qty"), func.sum(OrderItem.total_price).label("total")
    ).filter(OrderItem.order_id.in_(closed_today)).group_by(OrderItem.item_name).order_by(func.sum(OrderItem.quantity).desc()).limit(5).all()

    rq = db.query(Reservation).filter(
        Reservation.reservation_time >= today,
        Reservation.reservation_time < today.replace(hour=23, minute=59, second=59),
        Reservation.status.in_(["confirmed", "seated"])
    )
    if branch_id:
        rq = rq.filter(Reservation.branch_id == branch_id)
    today_reservations = rq.count()

    inv_q = db.query(Invoice)
    if branch_id:
        inv_q = inv_q.filter(Invoice.branch_id == branch_id)
    inv_all = inv_q.all()
    total_invoices = len(inv_all)
    sent_eracuni = sum(1 for i in inv_all if i.eracun_status == "sent")
    pending_eracuni = sum(1 for i in inv_all if i.eracun_status == "pending")
    compliance_rate = round(sent_eracuni / total_invoices * 100, 1) if total_invoices > 0 else 0

    return {
        "today_sales": round(total_sales, 2),
        "today_tips": round(total_tips, 2),
        "today_orders": today_orders,
        "today_reservations": today_reservations,
        "open_orders": open_orders,
        "free_tables": free_tables,
        "total_tables": total_tables,
        "top_items": [{"name": i[0], "quantity": int(i[1]), "total": round(i[2], 2)} for i in top_items],
        "total_invoices": total_invoices,
        "sent_eracuni": sent_eracuni,
        "pending_eracuni": pending_eracuni,
        "eracun_compliance_rate": compliance_rate,
    }


@router.get("/realtime")
def dashboard_realtime(branch_id: int = 0, db: Session = Depends(get_db)):
    """Real-time dashboard za WebSocket posodobitve."""
    now = datetime.now()
    today = now.replace(hour=0, minute=0, second=0, microsecond=0)

    # Current status
    open_orders = db.query(Order).filter(Order.status == "open")
    if branch_id:
        open_orders = open_orders.filter(Order.branch_id == branch_id)

    free_tables = db.query(TableModel).filter(TableModel.status == "free")
    if branch_id:
        free_tables = free_tables.filter(TableModel.branch_id == branch_id)

    # Recent activity (last 5 minutes)
    five_min_ago = now - timedelta(minutes=5)
    recent_orders = db.query(Order).filter(
        Order.created_at >= five_min_ago
    )
    if branch_id:
        recent_orders = recent_orders.filter(Order.branch_id == branch_id)

    # Revenue trend (hourly for today)
    hourly_revenue = []
    for hour in range(24):
        hour_start = today.replace(hour=hour)
        hour_end = hour_start + timedelta(hours=1)
        hour_payments = db.query(Payment).filter(
            Payment.created_at >= hour_start,
            Payment.created_at < hour_end
        )
        if branch_id:
            hour_payments = hour_payments.join(Order, Payment.order_id == Order.id).filter(Order.branch_id == branch_id)
        hour_total = sum(p.amount for p in hour_payments.all())
        hourly_revenue.append({"hour": hour, "total": round(hour_total, 2)})

    # Active tables
    active_tables = db.query(TableModel).filter(TableModel.status == "occupied")
    if branch_id:
        active_tables = active_tables.filter(TableModel.branch_id == branch_id)

    return {
        "timestamp": now.isoformat(),
        "open_orders_count": open_orders.count(),
        "free_tables_count": free_tables.count(),
        "active_tables_count": active_tables.count(),
        "recent_orders_count": recent_orders.count(),
        "hourly_revenue": hourly_revenue,
        "current_hour": now.hour,
    }


@router.get("/performance")
def dashboard_performance(days: int = Query(7, ge=1, le=90), branch_id: int = 0, db: Session = Depends(get_db)):
    """Napredni performančni kazalniki."""
    now = datetime.now()
    start = now - timedelta(days=days)

    # Revenue trend
    daily_revenue = []
    for i in range(days):
        day = start + timedelta(days=i)
        day_start = day.replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(hours=23, minutes=59, seconds=59)
        day_payments = db.query(Payment).filter(
            Payment.created_at >= day_start,
            Payment.created_at <= day_end
        )
        if branch_id:
            day_payments = day_payments.join(Order, Payment.order_id == Order.id).filter(Order.branch_id == branch_id)
        day_total = sum(p.amount for p in day_payments.all())
        daily_revenue.append({"date": day.strftime('%Y-%m-%d'), "revenue": round(day_total, 2)})

    # Average order value
    total_revenue = sum(d["revenue"] for d in daily_revenue)
    total_orders = db.query(Order).filter(
        Order.status == "closed",
        Order.closed_at >= start
    )
    if branch_id:
        total_orders = total_orders.filter(Order.branch_id == branch_id)
    order_count = total_orders.count()
    avg_order = total_revenue / order_count if order_count > 0 else 0

    # Peak hours
    peak_hours = []
    for hour in range(24):
        hour_orders = db.query(Order).filter(
            func.extract('hour', Order.created_at) == hour,
            Order.created_at >= start
        )
        if branch_id:
            hour_orders = hour_orders.filter(Order.branch_id == branch_id)
        count = hour_orders.count()
        peak_hours.append({"hour": hour, "orders": count})

    peak_hours.sort(key=lambda x: x["orders"], reverse=True)

    # Customer retention (repeat customers)
    customer_orders = db.query(
        Order.customer_id, func.count(Order.id).label("order_count")
    ).filter(
        Order.customer_id != None,
        Order.created_at >= start
    )
    if branch_id:
        customer_orders = customer_orders.filter(Order.branch_id == branch_id)
    customer_orders = customer_orders.group_by(Order.customer_id).all()

    repeat_customers = sum(1 for _, count in customer_orders if count > 1)
    total_customers = len(customer_orders)
    retention_rate = round(repeat_customers / total_customers * 100, 1) if total_customers > 0 else 0

    return {
        "period_days": days,
        "total_revenue": round(total_revenue, 2),
        "avg_order_value": round(avg_order, 2),
        "total_orders": order_count,
        "daily_revenue": daily_revenue,
        "peak_hours": peak_hours[:5],
        "customer_retention_rate": retention_rate,
        "repeat_customers": repeat_customers,
        "total_customers": total_customers,
    }
