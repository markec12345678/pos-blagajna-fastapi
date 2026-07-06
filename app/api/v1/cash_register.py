from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.cash_register import CashRegister, CashMovement
from app.models.payment import Payment
from datetime import datetime

router = APIRouter(prefix="/cash-register", tags=["cash_register"])


@router.get("/status")
def get_register_status(db: Session = Depends(get_db)):
    active = db.query(CashRegister).filter(CashRegister.status == "open").first()
    if not active:
        return {"status": "closed", "register": None}
    total_card = db.query(Payment).filter(
        Payment.method == "card",
        Payment.created_at >= active.opened_at
    ).count()
    total_cash_payments = db.query(Payment).filter(
        Payment.method == "cash",
        Payment.created_at >= active.opened_at
    ).all()
    total_cash = sum(p.amount for p in total_cash_payments)
    total_cash_in = db.query(CashMovement).filter(
        CashMovement.register_id == active.id,
        CashMovement.type == "in"
    ).all()
    total_in = sum(m.amount for m in total_cash_in)
    total_cash_out = db.query(CashMovement).filter(
        CashMovement.register_id == active.id,
        CashMovement.type == "out"
    ).all()
    total_out = sum(m.amount for m in total_cash_out)
    expected = active.opening_balance + total_cash + total_in - total_out
    return {
        "status": "open",
        "id": active.id,
        "opened_at": active.opened_at.isoformat(),
        "opening_balance": active.opening_balance,
        "expected_balance": round(expected, 2),
        "total_cash_payments": round(total_cash, 2),
        "total_card_payments": total_card,
        "cash_in": round(total_in, 2),
        "cash_out": round(total_out, 2)
    }


@router.post("/open")
def open_register(data: dict, db: Session = Depends(get_db)):
    active = db.query(CashRegister).filter(CashRegister.status == "open").first()
    if active:
        raise HTTPException(400, "Register already open")
    reg = CashRegister(
        opened_by=data.get("user_id", 1),
        opening_balance=data.get("balance", 100),
        status="open"
    )
    db.add(reg)
    db.commit()
    return {"status": "open", "id": reg.id, "opening_balance": reg.opening_balance}


@router.post("/close")
def close_register(data: dict, db: Session = Depends(get_db)):
    active = db.query(CashRegister).filter(CashRegister.status == "open").first()
    if not active:
        raise HTTPException(400, "No open register")
    closing = data.get("closing_balance", 0)
    active.closing_balance = closing
    active.closed_at = datetime.now()
    active.status = "closed"

    total_cash = db.query(Payment).filter(
        Payment.method == "cash",
        Payment.created_at >= active.opened_at
    ).all()
    total_cash_sum = sum(p.amount for p in total_cash)
    total_cash_in = db.query(CashMovement).filter(
        CashMovement.register_id == active.id,
        CashMovement.type == "in"
    ).all()
    total_in = sum(m.amount for m in total_cash_in)
    total_cash_out = db.query(CashMovement).filter(
        CashMovement.register_id == active.id,
        CashMovement.type == "out"
    ).all()
    total_out = sum(m.amount for m in total_cash_out)
    active.expected_balance = round(active.opening_balance + total_cash_sum + total_in - total_out, 2)
    active.difference = round(closing - active.expected_balance, 2)
    db.commit()
    return {
        "status": "closed",
        "opening_balance": active.opening_balance,
        "closing_balance": closing,
        "expected_balance": active.expected_balance,
        "difference": active.difference
    }


@router.post("/movement")
def add_movement(data: dict, db: Session = Depends(get_db)):
    active = db.query(CashRegister).filter(CashRegister.status == "open").first()
    if not active:
        raise HTTPException(400, "No open register")
    mov = CashMovement(
        register_id=active.id,
        amount=abs(data.get("amount", 0)),
        reason=data.get("reason", ""),
        type=data.get("type", "in")
    )
    db.add(mov)
    db.commit()
    return {"id": mov.id, "amount": mov.amount, "type": mov.type, "reason": mov.reason}


@router.get("/movements")
def get_movements(db: Session = Depends(get_db)):
    active = db.query(CashRegister).filter(CashRegister.status == "open").first()
    if not active:
        return []
    movs = db.query(CashMovement).filter(
        CashMovement.register_id == active.id
    ).order_by(CashMovement.created_at.desc()).all()
    return [{"id": m.id, "amount": m.amount, "reason": m.reason, "type": m.type, "created_at": m.created_at.isoformat()} for m in movs]
