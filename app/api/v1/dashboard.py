from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.database import get_db
from app.models.order import Order, OrderItem
from app.models.payment import Payment
from app.models.table_model import TableModel
from app.models.reservation import Reservation
from datetime import datetime

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


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

    return {
        "today_sales": round(total_sales, 2),
        "today_tips": round(total_tips, 2),
        "today_orders": today_orders,
        "today_reservations": today_reservations,
        "open_orders": open_orders,
        "free_tables": free_tables,
        "total_tables": total_tables,
        "top_items": [{"name": i[0], "quantity": int(i[1]), "total": round(i[2], 2)} for i in top_items]
    }
