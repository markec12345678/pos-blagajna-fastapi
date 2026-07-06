from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.order import Order, OrderItem
from sqlalchemy import func
from app.models.table_model import TableModel
from app.models.payment import Payment
from app.models.customer import Customer
from app.models.loyalty import LoyaltyTransaction
from app.models.inventory import RecipeItem, StockTransaction, Ingredient
from app.schemas.payment import PaymentRequest, PaymentOut
from app.api.v1.audit_log import log_action
from app.models.settings import Setting
from datetime import datetime
from app.core.websocket_manager import broadcast
from app.core.payment_terminal import terminal_pay as terminal_pay_svc, terminal_status as terminal_status_svc
from app.core.notifications import notify_order_status

router = APIRouter(prefix="/payments", tags=["payments"])


@router.post("")
def make_payment(data: PaymentRequest, db: Session = Depends(get_db)):
    order = db.query(Order).filter(Order.id == data.order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.status != "open":
        raise HTTPException(status_code=400, detail="Order already closed")

    total_paid = db.query(Payment).filter(Payment.order_id == data.order_id).with_entities(
        Payment.amount
    ).all()
    already_paid = sum(p[0] for p in total_paid)
    remaining = order.total - already_paid

    if data.amount > remaining + 0.01:
        raise HTTPException(status_code=400, detail="Amount exceeds remaining balance")

    payment = Payment(
        order_id=data.order_id,
        amount=data.amount,
        method=data.method,
        tip=data.tip if hasattr(data, 'tip') else 0,
        reference=data.reference
    )
    db.add(payment)
    db.flush()
    log_action(db, "payment_made", "payment", payment.id, details=f"Order #{data.order_id}: {data.amount} via {data.method}")

    new_paid = already_paid + data.amount
    if new_paid >= order.total - 0.01:
        order.status = "closed"
        order.closed_at = datetime.now()
        broadcast("order_closed", {"order_id": order.id})
        if not order.invoice_number:
            max_inv = db.query(func.max(Order.invoice_number)).scalar() or 0
            order.invoice_number = max_inv + 1
        table = db.query(TableModel).filter(TableModel.id == order.table_id).first()
        if table:
            table.status = "free"

        # Loyalty points: 1 point per 1 EUR (rounded down)
        if order.customer_id:
            cust = db.query(Customer).filter(Customer.id == order.customer_id).first()
            if cust:
                pts = int(order.total)
                if pts > 0:
                    cust.loyalty_points = (cust.loyalty_points or 0) + pts
                    tx = LoyaltyTransaction(
                        customer_id=cust.id, order_id=order.id, points=pts,
                        type="earn", description=f"Earned from order #{order.id}"
                    )
                    db.add(tx)

        # Deduct ingredients from stock
        for oi in db.query(OrderItem).filter(OrderItem.order_id == order.id).all():
            recipes = db.query(RecipeItem).filter(RecipeItem.menu_item_id == oi.menu_item_id).all()
            for r in recipes:
                ing = db.query(Ingredient).filter(Ingredient.id == r.ingredient_id).first()
                if ing:
                    used = r.quantity * oi.quantity
                    ing.stock = max(0, ing.stock - used)
                    st = StockTransaction(
                        ingredient_id=ing.id, quantity=-used,
                        type="sale", reference=f"Order #{order.id}"
                    )
                    db.add(st)

        # WhatsApp notification
        notify_order_status(db, order.id, "closed")

    db.commit()
    return {
        "id": payment.id, "order_id": payment.order_id,
        "amount": payment.amount, "method": payment.method,
        "status": "completed"
    }


@router.get("/history")
def get_payment_history(limit: int = 50, db: Session = Depends(get_db)):
    payments = db.query(Payment).order_by(Payment.created_at.desc()).limit(limit).all()
    return [PaymentOut.model_validate(p) for p in payments]


@router.post("/terminal")
def terminal_payment(data: dict, db: Session = Depends(get_db)):
    order_id = data.get("order_id")
    amount = float(data.get("amount", 0))
    method = data.get("method", "terminal")
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(404, "Order not found")

    # Read terminal config from settings
    terminal_type = (db.query(Setting).filter(Setting.key == "terminal_provider").first().value
                     if db.query(Setting).filter(Setting.key == "terminal_provider").first() else "")
    terminal_host = (db.query(Setting).filter(Setting.key == "terminal_host").first().value
                     if db.query(Setting).filter(Setting.key == "terminal_host").first() else "")
    terminal_port = int((db.query(Setting).filter(Setting.key == "terminal_port").first().value)
                        if db.query(Setting).filter(Setting.key == "terminal_port").first() else "0")
    terminal_api_key = (db.query(Setting).filter(Setting.key == "terminal_api_key").first().value
                        if db.query(Setting).filter(Setting.key == "terminal_api_key").first() else "")

    # Call terminal service
    ref = f"ORD-{order_id}-{datetime.now().strftime('%H%M%S')}"
    result = terminal_pay_svc(amount, ref, terminal_type, terminal_host, terminal_port, terminal_api_key)

    if not result.get("approved"):
        return {"ok": False, "error": result.get("error", "Terminal declined"), "terminal_response": result}

    payment = Payment(
        order_id=order_id, amount=amount, method="terminal",
        reference=result.get("transaction_id", ref),
        tip=data.get("tip", 0)
    )
    db.add(payment)
    db.flush()

    # Close order if fully paid
    total_paid = sum(p.amount for p in db.query(Payment).filter(Payment.order_id == order_id).all())
    if total_paid >= order.total - 0.01:
        order.status = "closed"
        order.closed_at = datetime.now()

    db.commit()
    log_action(db, "terminal_payment", "payment", payment.id, details=f"Order #{order_id}: {amount} via terminal ({result.get('card_type', '?')})")
    return {
        "ok": True, "payment_id": payment.id, "status": "completed",
        "terminal": {"transaction_id": result.get("transaction_id"), "card_type": result.get("card_type"), "card_last4": result.get("card_last4")}
    }


@router.get("/terminal/status")
def terminal_check_status(db: Session = Depends(get_db)):
    terminal_type = (db.query(Setting).filter(Setting.key == "terminal_provider").first().value
                     if db.query(Setting).filter(Setting.key == "terminal_provider").first() else "")
    terminal_host = (db.query(Setting).filter(Setting.key == "terminal_host").first().value
                     if db.query(Setting).filter(Setting.key == "terminal_host").first() else "")
    terminal_port = int((db.query(Setting).filter(Setting.key == "terminal_port").first().value)
                        if db.query(Setting).filter(Setting.key == "terminal_port").first() else "0")
    terminal_api_key = (db.query(Setting).filter(Setting.key == "terminal_api_key").first().value
                        if db.query(Setting).filter(Setting.key == "terminal_api_key").first() else "")

    configured = bool(terminal_type and terminal_host and terminal_port)

    if configured:
        status = terminal_status_svc(terminal_type, terminal_host, terminal_port, terminal_api_key)
    else:
        status = {"online": False, "mode": "not_configured"}

    return {
        "configured": configured,
        "provider": terminal_type or "none",
        "online": status.get("online", False),
        "mode": status.get("mode", "unknown"),
    }


@router.post("/terminal/test")
def test_terminal(data: dict, db: Session = Depends(get_db)):
    amount = float(data.get("amount", 1.0))
    terminal_type = (db.query(Setting).filter(Setting.key == "terminal_provider").first().value
                     if db.query(Setting).filter(Setting.key == "terminal_provider").first() else "")
    terminal_host = (db.query(Setting).filter(Setting.key == "terminal_host").first().value
                     if db.query(Setting).filter(Setting.key == "terminal_host").first() else "")
    terminal_port = int((db.query(Setting).filter(Setting.key == "terminal_port").first().value)
                        if db.query(Setting).filter(Setting.key == "terminal_port").first() else "0")
    terminal_api_key = (db.query(Setting).filter(Setting.key == "terminal_api_key").first().value
                        if db.query(Setting).filter(Setting.key == "terminal_api_key").first() else "")

    result = terminal_pay_svc(amount, f"TEST-{datetime.now().strftime('%H%M%S')}",
                              terminal_type, terminal_host, terminal_port, terminal_api_key)
    return result
