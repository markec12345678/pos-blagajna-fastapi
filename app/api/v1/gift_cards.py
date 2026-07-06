from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.gift_card import GiftCard, GiftCardTransaction
from app.models.payment import Payment
from app.api.v1.audit_log import log_action
from datetime import datetime
import random, string

router = APIRouter(prefix="/gift-cards", tags=["gift_cards"])


def gen_code():
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=12))


@router.get("")
def list_gift_cards(db: Session = Depends(get_db)):
    cards = db.query(GiftCard).order_by(GiftCard.created_at.desc()).all()
    return [{
        "id": c.id, "code": c.code, "balance": round(c.balance, 2),
        "active": c.active, "expires_at": str(c.expires_at) if c.expires_at else None,
        "created_at": str(c.created_at), "notes": c.notes
    } for c in cards]


@router.post("")
def create_gift_card(data: dict, db: Session = Depends(get_db)):
    code = data.get("code", gen_code())
    card = GiftCard(
        code=code,
        balance=data.get("balance", 0),
        active=True,
        expires_at=datetime.fromisoformat(data["expires_at"]) if data.get("expires_at") else None,
        notes=data.get("notes", "")
    )
    db.add(card)
    db.commit()
    db.refresh(card)
    log_action(db, "gift_card_created", "gift_card", card.id, details=f"Code={code} Balance={card.balance}")
    return {"id": card.id, "code": card.code, "balance": card.balance}


@router.get("/{card_id}")
def get_gift_card(card_id: int, db: Session = Depends(get_db)):
    card = db.query(GiftCard).filter(GiftCard.id == card_id).first()
    if not card:
        raise HTTPException(404, "Gift card not found")
    return {"id": card.id, "code": card.code, "balance": card.balance, "active": card.active}


@router.post("/redeem")
def redeem_gift_card(data: dict, db: Session = Depends(get_db)):
    card = db.query(GiftCard).filter(GiftCard.code == data.get("code", "")).first()
    if not card or not card.active:
        raise HTTPException(400, "Invalid or inactive gift card")
    if card.balance < 0.01:
        raise HTTPException(400, "Gift card has no balance")
    amount = min(data.get("amount", 0), card.balance)
    if amount <= 0:
        raise HTTPException(400, "Invalid amount")
    card.balance -= amount
    txn = GiftCardTransaction(
        gift_card_id=card.id, amount=-amount, type="redemption",
        reference=data.get("reference", "")
    )
    db.add(txn)
    log_action(db, "gift_card_redeemed", "gift_card", card.id, details=f"Redeemed {amount}")
    db.commit()
    return {"code": card.code, "redeemed": round(amount, 2), "remaining": round(card.balance, 2)}


@router.get("/code/{code}")
def lookup_gift_card(code: str, db: Session = Depends(get_db)):
    card = db.query(GiftCard).filter(GiftCard.code == code).first()
    if not card:
        raise HTTPException(404, "Gift card not found")
    return {"id": card.id, "code": card.code, "balance": round(card.balance, 2), "active": card.active}


@router.put("/{card_id}")
def update_gift_card(card_id: int, data: dict, db: Session = Depends(get_db)):
    card = db.query(GiftCard).filter(GiftCard.id == card_id).first()
    if not card:
        raise HTTPException(404, "Gift card not found")
    if "balance" in data:
        card.balance = data["balance"]
    if "active" in data:
        card.active = data["active"]
    if "notes" in data:
        card.notes = data["notes"]
    db.commit()
    return {"ok": True}


@router.post("/{card_id}/topup")
def topup_gift_card(card_id: int, data: dict, db: Session = Depends(get_db)):
    card = db.query(GiftCard).filter(GiftCard.id == card_id).first()
    if not card:
        raise HTTPException(404, "Gift card not found")
    amount = data.get("amount", 0)
    if amount <= 0:
        raise HTTPException(400, "Invalid amount")
    card.balance += amount
    txn = GiftCardTransaction(
        gift_card_id=card.id, amount=amount, type="topup",
        reference=data.get("reference", "")
    )
    db.add(txn)
    log_action(db, "gift_card_topup", "gift_card", card.id, details=f"Topup {amount}")
    db.commit()
    return {"code": card.code, "balance": round(card.balance, 2)}


@router.get("/{card_id}/transactions")
def gift_card_transactions(card_id: int, db: Session = Depends(get_db)):
    txns = db.query(GiftCardTransaction).filter(
        GiftCardTransaction.gift_card_id == card_id
    ).order_by(GiftCardTransaction.created_at.desc()).all()
    return [{
        "id": t.id, "amount": t.amount, "type": t.type,
        "reference": t.reference, "created_at": str(t.created_at)
    } for t in txns]
