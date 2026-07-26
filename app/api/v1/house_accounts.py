from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime

from app.core.database import get_db
from app.models.house_account import HouseAccount, HouseAccountTransaction
from app.models.order import Order
from app.models.customer import Customer
from app.api.v1.audit_log import log_action
from app.schemas.house_account import CreateHouseAccount, UpdateHouseAccount, ChargeHouseAccount, PayHouseAccount
from app.models.user import User
from app.api.v1.auth import get_current_user

router = APIRouter(prefix="/house-accounts", tags=["House Accounts"])


@router.get("")
def list_house_accounts(search: Optional[str] = None, skip: int = 0, limit: int = 50, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    q = db.query(HouseAccount)
    if search:
        q = q.join(Customer).filter(
            Customer.name.ilike(f"%{search}%") | Customer.phone.ilike(f"%{search}%")
        )
    total = q.count()
    accounts = q.order_by(HouseAccount.id.desc()).offset(skip).limit(limit).all()
    results = []
    for a in accounts:
        cust = db.query(Customer).filter(Customer.id == a.customer_id).first()
        results.append({
            "id": a.id,
            "customer_id": a.customer_id,
            "customer_name": cust.name if cust else "N/A",
            "customer_phone": cust.phone if cust else "",
            "balance": a.balance,
            "credit_limit": a.credit_limit,
            "status": a.status,
            "notes": a.notes,
            "created_at": a.created_at.isoformat() if a.created_at else "",
        })
    return {"items": results, "total": total}


@router.post("")
def create_house_account(data: CreateHouseAccount, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    customer_id = data.customer_id
    if not customer_id:
        raise HTTPException(400, "customer_id is required")
    cust = db.query(Customer).filter(Customer.id == customer_id).first()
    if not cust:
        raise HTTPException(404, "Customer not found")
    existing = db.query(HouseAccount).filter(HouseAccount.customer_id == customer_id).first()
    if existing:
        raise HTTPException(400, "Customer already has a house account")
    account = HouseAccount(
        customer_id=customer_id,
        credit_limit=data.credit_limit,
        notes=data.notes,
    )
    db.add(account)
    db.commit()
    db.refresh(account)
    log_action(db, "house_account_created", "house_account", account.id,
               details=f"Created for customer #{customer_id}")
    return {"ok": True, "id": account.id}


@router.get("/{account_id}")
def get_house_account(account_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    a = db.query(HouseAccount).filter(HouseAccount.id == account_id).first()
    if not a:
        raise HTTPException(404, "House account not found")
    cust = db.query(Customer).filter(Customer.id == a.customer_id).first()
    txns = db.query(HouseAccountTransaction).filter(
        HouseAccountTransaction.account_id == account_id
    ).order_by(HouseAccountTransaction.created_at.desc()).all()
    return {
        "id": a.id,
        "customer_id": a.customer_id,
        "customer_name": cust.name if cust else "N/A",
        "customer_phone": cust.phone if cust else "",
        "balance": a.balance,
        "credit_limit": a.credit_limit,
        "status": a.status,
        "notes": a.notes,
        "created_at": a.created_at.isoformat() if a.created_at else "",
        "transactions": [
            {
                "id": t.id,
                "order_id": t.order_id,
                "type": t.type,
                "amount": t.amount,
                "description": t.description,
                "created_at": t.created_at.isoformat() if t.created_at else "",
            }
            for t in txns
        ],
    }


@router.put("/{account_id}")
def update_house_account(account_id: int, data: UpdateHouseAccount, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    a = db.query(HouseAccount).filter(HouseAccount.id == account_id).first()
    if not a:
        raise HTTPException(404, "House account not found")
    update_data = data.model_dump(exclude_unset=True)
    if "credit_limit" in update_data:
        a.credit_limit = update_data["credit_limit"]
    if "status" in update_data:
        a.status = update_data["status"]
    if "notes" in update_data:
        a.notes = update_data["notes"]
    a.updated_at = datetime.now()
    db.commit()
    log_action(db, "house_account_updated", "house_account", account_id, details="Updated")
    return {"ok": True}


@router.post("/{account_id}/charge")
def charge_house_account(account_id: int, data: ChargeHouseAccount, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    a = db.query(HouseAccount).filter(HouseAccount.id == account_id).first()
    if not a:
        raise HTTPException(404, "House account not found")
    if a.status != "active":
        raise HTTPException(400, "House account is not active")
    amount = data.amount
    if amount <= 0:
        raise HTTPException(400, "Amount must be positive")
    order_id = data.order_id
    if order_id:
        order = db.query(Order).filter(Order.id == order_id).first()
        if not order:
            raise HTTPException(404, "Order not found")
    if a.credit_limit > 0 and a.balance + amount > a.credit_limit:
        raise HTTPException(400, f"Credit limit of {a.credit_limit} would be exceeded")
    txn = HouseAccountTransaction(
        account_id=account_id,
        order_id=order_id,
        type="charge",
        amount=amount,
        description=data.description,
    )
    a.balance += amount
    a.updated_at = datetime.now()
    db.add(txn)
    db.commit()
    log_action(db, "house_account_charged", "house_account", account_id,
               details=f"Charged {amount} (order #{order_id})" if order_id else f"Charged {amount}")
    return {"ok": True, "balance": a.balance, "transaction_id": txn.id}


@router.post("/{account_id}/pay")
def pay_house_account(account_id: int, data: PayHouseAccount, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    a = db.query(HouseAccount).filter(HouseAccount.id == account_id).first()
    if not a:
        raise HTTPException(404, "House account not found")
    amount = data.amount
    if amount <= 0:
        raise HTTPException(400, "Amount must be positive")
    if amount > a.balance:
        raise HTTPException(400, f"Payment exceeds balance of {a.balance}")
    txn = HouseAccountTransaction(
        account_id=account_id,
        type="payment",
        amount=-amount,
        description=data.description,
    )
    a.balance -= amount
    a.updated_at = datetime.now()
    db.add(txn)
    db.commit()
    log_action(db, "house_account_paid", "house_account", account_id,
               details=f"Paid {amount}")
    return {"ok": True, "balance": a.balance, "transaction_id": txn.id}
