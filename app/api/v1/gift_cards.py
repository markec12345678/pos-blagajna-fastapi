from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.gift_card import GiftCard, GiftCardTransaction
from app.models.payment import Payment
from app.api.v1.audit_log import log_action
from app.schemas.gift_card import CreateGiftCard, RedeemGiftCard, UpdateGiftCard, TopupGiftCard, BatchGenerateGiftCards
from datetime import datetime
import random, string
from app.models.user import User
from app.api.v1.auth import get_current_user

router = APIRouter(prefix="/gift-cards", tags=["gift_cards"])


def gen_code():
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=12))


@router.get("")
def list_gift_cards(skip: int = 0, limit: int = 50, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    total = db.query(GiftCard).count()
    cards = db.query(GiftCard).order_by(GiftCard.created_at.desc()).offset(skip).limit(limit).all()
    return {
        "items": [{
            "id": c.id, "code": c.code, "balance": round(c.balance, 2),
            "active": c.active, "expires_at": str(c.expires_at) if c.expires_at else None,
            "created_at": str(c.created_at), "notes": c.notes
        } for c in cards],
        "total": total
    }


@router.post("")
def create_gift_card(data: CreateGiftCard, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    code = data.code or gen_code()
    card = GiftCard(
        code=code,
        balance=data.balance,
        active=True,
        expires_at=datetime.fromisoformat(data.expires_at) if data.expires_at else None,
        notes=data.notes
    )
    db.add(card)
    db.commit()
    db.refresh(card)
    log_action(db, "gift_card_created", "gift_card", card.id, details=f"Code={code} Balance={card.balance}")
    return {"id": card.id, "code": card.code, "balance": card.balance}


@router.get("/{card_id}")
def get_gift_card(card_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    card = db.query(GiftCard).filter(GiftCard.id == card_id).first()
    if not card:
        raise HTTPException(404, "Gift card not found")
    return {"id": card.id, "code": card.code, "balance": card.balance, "active": card.active}


@router.post("/redeem")
def redeem_gift_card(data: RedeemGiftCard, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    card = db.query(GiftCard).filter(GiftCard.code == data.code).first()
    if not card or not card.active:
        raise HTTPException(400, "Invalid or inactive gift card")
    if card.expires_at and card.expires_at < datetime.utcnow():
        raise HTTPException(400, "Gift card has expired")
    if card.balance < 0.01:
        raise HTTPException(400, "Gift card has no balance")
    amount = min(data.amount, card.balance)
    if amount <= 0:
        raise HTTPException(400, "Invalid amount")
    card.balance -= amount
    txn = GiftCardTransaction(
        gift_card_id=card.id, amount=-amount, type="redemption",
        reference=data.reference
    )
    db.add(txn)
    log_action(db, "gift_card_redeemed", "gift_card", card.id, details=f"Redeemed {amount}")
    db.commit()
    return {"code": card.code, "redeemed": round(amount, 2), "remaining": round(card.balance, 2)}


@router.get("/code/{code}")
def lookup_gift_card(code: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    card = db.query(GiftCard).filter(GiftCard.code == code).first()
    if not card:
        raise HTTPException(404, "Gift card not found")
    return {"id": card.id, "code": card.code, "balance": round(card.balance, 2), "active": card.active}


@router.put("/{card_id}")
def update_gift_card(card_id: int, data: UpdateGiftCard, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    card = db.query(GiftCard).filter(GiftCard.id == card_id).first()
    if not card:
        raise HTTPException(404, "Gift card not found")
    update_data = data.model_dump(exclude_unset=True)
    if "balance" in update_data:
        card.balance = update_data["balance"]
    if "active" in update_data:
        card.active = update_data["active"]
    if "notes" in update_data:
        card.notes = update_data["notes"]
    db.commit()
    return {"ok": True}


@router.post("/{card_id}/topup")
def topup_gift_card(card_id: int, data: TopupGiftCard, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    card = db.query(GiftCard).filter(GiftCard.id == card_id).first()
    if not card:
        raise HTTPException(404, "Gift card not found")
    amount = data.amount
    if amount <= 0:
        raise HTTPException(400, "Invalid amount")
    card.balance += amount
    txn = GiftCardTransaction(
        gift_card_id=card.id, amount=amount, type="topup",
        reference=data.reference
    )
    db.add(txn)
    log_action(db, "gift_card_topup", "gift_card", card.id, details=f"Topup {amount}")
    db.commit()
    return {"code": card.code, "balance": round(card.balance, 2)}


@router.get("/{card_id}/transactions")
def gift_card_transactions(card_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    txns = db.query(GiftCardTransaction).filter(
        GiftCardTransaction.gift_card_id == card_id
    ).order_by(GiftCardTransaction.created_at.desc()).all()
    return [{
        "id": t.id, "amount": t.amount, "type": t.type,
        "reference": t.reference, "created_at": str(t.created_at)
    } for t in txns]


@router.post("/batch")
def batch_generate_gift_cards(data: BatchGenerateGiftCards, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if data.count < 1 or data.count > 500:
        raise HTTPException(400, "Count must be between 1 and 500")
    if data.balance < 0:
        raise HTTPException(400, "Balance cannot be negative")
    expires_at = None
    if data.expires_at:
        try:
            expires_at = datetime.fromisoformat(data.expires_at)
        except ValueError:
            raise HTTPException(400, "Invalid expiry date format")
    created = []
    existing_codes = set()
    for _ in range(data.count):
        while True:
            code = gen_code()
            if code not in existing_codes:
                break
        existing_codes.add(code)
        card = GiftCard(
            code=code, balance=data.balance, expires_at=expires_at,
            notes=data.notes or f"Batch by {user.username}"
        )
        db.add(card)
        db.flush()
        created.append({"id": card.id, "code": card.code, "balance": card.balance})
        if data.balance > 0:
            txn = GiftCardTransaction(
                gift_card_id=card.id, amount=data.balance, type="topup",
                reference="Batch generation"
            )
            db.add(txn)
    log_action(db, "gift_card_batch_generate", "gift_card", None,
               details=f"Generated {data.count} cards, {data.balance}€ each")
    db.commit()
    return {"count": len(created), "cards": created}
