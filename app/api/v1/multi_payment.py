"""Multi-Payment API — večkratno plačilo, tips, split payments."""
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime

from app.core.database import get_db
from app.api.v1.auth import get_current_user

router = APIRouter(prefix="/multi-payment", tags=["Večkratno plačilo"])


class PartialPayment(BaseModel):
    amount: float
    method: str  # gotovina, kartica, bon, vaučer, mobile_pay
    reference: Optional[str] = None
    tip: Optional[float] = 0


class SplitPaymentRequest(BaseModel):
    order_id: int
    payments: List[PartialPayment]
    customer_id: Optional[int] = None


@router.post("/pay")
def process_split_payment(req: SplitPaymentRequest, db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Obdelaj plačilo z več načini."""
    from app.models.order import Order
    from app.models.payment import Payment

    order = db.query(Order).filter(Order.id == req.order_id).first()
    if not order:
        return {"error": "Naročilo ni najdeno"}

    if order.status in ['paid', 'closed']:
        return {"error": "Naročilo je že plačano"}

    total_paid_so_far = db.query(Payment).filter(Payment.order_id == req.order_id).with_entities(Payment.amount).all()
    already_paid = sum(float(p.amount or 0) for p in total_paid_so_far)
    order_total = float(order.total or 0)
    remaining = order_total - already_paid

    # Validate payments
    total_new = sum(p.amount for p in req.payments)
    if total_new < remaining - 0.01:  # Allow 1 cent rounding
        return {"error": f"Premalo. Potrebujete še €{remaining:.2f}, ponujete €{total_new:.2f}"}

    total_tip = sum(p.tip or 0 for p in req.payments)

    # Create payment records
    created_payments = []
    for p in req.payments:
        if p.amount <= 0:
            continue
        payment = Payment(
            order_id=req.order_id,
            amount=p.amount,
            payment_method=p.method,
            reference=p.reference,
            tip=p.tip or 0,
            cashier_id=getattr(user, 'id', None),
        )
        db.add(payment)
        db.flush()
        created_payments.append({
            "id": payment.id,
            "amount": p.amount,
            "method": p.method,
            "tip": p.tip or 0,
        })

    # Close order
    order.status = 'paid'
    order.paid_at = datetime.now()
    db.commit()

    # Award loyalty points
    if req.customer_id and total_new > 0:
        try:
            from app.models.customer import Customer
            from app.models.loyalty import LoyaltyTransaction
            customer = db.query(Customer).filter(Customer.id == req.customer_id).first()
            if customer:
                points = int(total_new)
                customer.loyalty_points = (getattr(customer, 'loyalty_points', 0) or 0) + points
                tx = LoyaltyTransaction(
                    customer_id=req.customer_id,
                    points=points,
                    type="earn",
                    order_id=req.order_id,
                    note=f"Plačilo naročila #{req.order_id}",
                )
                db.add(tx)
                db.commit()
        except Exception:
            pass

    return {
        "message": "Plačilo uspešno!",
        "order_id": req.order_id,
        "total": order_total,
        "payments": created_payments,
        "total_paid": total_new,
        "total_tip": total_tip,
        "overpayment": max(0, total_new - remaining),
    }


@router.get("/order/{order_id}")
def get_order_payments(order_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Pridobi plačila za naročilo."""
    from app.models.payment import Payment
    from app.models.order import Order

    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        return {"error": "Naročilo ni najdeno"}

    payments = db.query(Payment).filter(Payment.order_id == order_id).all()

    total_paid = sum(float(p.amount or 0) for p in payments)
    total_tip = sum(float(getattr(p, 'tip', 0) or 0) for p in payments)

    return {
        "order_id": order_id,
        "order_total": float(order.total or 0),
        "total_paid": total_paid,
        "remaining": float(order.total or 0) - total_paid,
        "total_tip": total_tip,
        "status": order.status,
        "payments": [
            {
                "id": p.id,
                "amount": float(p.amount or 0),
                "method": p.payment_method,
                "tip": float(getattr(p, 'tip', 0) or 0),
                "reference": getattr(p, 'reference', ''),
                "created_at": p.created_at.isoformat() if hasattr(p.created_at, 'isoformat') else str(p.created_at),
            }
            for p in payments
        ],
    }


@router.post("/void/{payment_id}")
def void_payment(payment_id: int, reason: str = "", db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Razveljavi plačilo."""
    from app.models.payment import Payment

    payment = db.query(Payment).filter(Payment.id == payment_id).first()
    if not payment:
        return {"error": "Plačilo ni najdeno"}

    payment.voided = True
    payment.void_reason = reason
    db.commit()

    return {"message": "Plačilo razveljavljeno", "amount": float(payment.amount or 0)}


@router.post("/tip")
def add_tip(order_id: int, amount: float, method: str = "gotovina", db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Dodaj napitnino na naročilo."""
    from app.models.payment import Payment

    if amount <= 0:
        return {"error": "Napitnina mora biti pozitivna"}

    payment = Payment(
        order_id=order_id,
        amount=amount,
        payment_method=method,
        tip=amount,
        reference="Napitnina",
        cashier_id=getattr(user, 'id', None),
    )
    db.add(payment)
    db.commit()

    return {"message": "Napitnina dodana", "amount": amount}


@router.get("/methods")
def get_payment_methods(db: Session = Depends(get_db)):
    """Seznam razpoložljivih načinov plačila."""
    return {
        "methods": [
            {"id": "gotovina", "name": "💰 Gotovina", "icon": "💰", "requires_reference": False},
            {"id": "kartica", "name": "💳 Kartica", "icon": "💳", "requires_reference": True},
            {"id": "bon", "name": "🎟️ Bon", "icon": "🎟️", "requires_reference": True},
            {"id": "vaučer", "name": "🎫 Vaučer", "icon": "🎫", "requires_reference": True},
            {"id": "mobile_pay", "name": "📱 Mobile Pay", "icon": "📱", "requires_reference": True},
            {"id": "račun", "name": "📄 Na račun", "icon": "📄", "requires_reference": True},
        ]
    }
