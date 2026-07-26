from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.price_rule import PriceRule
from app.schemas.price_rule import PriceRuleCreate, PriceRuleUpdate
from app.models.menu_item import MenuItem
from app.core.pricing import get_effective_price

router = APIRouter(prefix="/price-rules", tags=["price-rules"])

@router.get("")
def list_rules(branch_id: int = 0, db: Session = Depends(get_db)):
    q = db.query(PriceRule)
    if branch_id:
        q = q.filter(PriceRule.branch_id == branch_id)
    rules = q.order_by(PriceRule.created_at.desc()).all()
    items = {i.id: i for i in db.query(MenuItem).all()}
    return [{
        "id": r.id, "menu_item_id": r.menu_item_id,
        "item_name": items[r.menu_item_id].name if r.menu_item_id and r.menu_item_id in items else "Vsi artikli",
        "day_of_week": r.day_of_week, "time_from": r.time_from, "time_to": r.time_to,
        "price": r.price, "order_type": r.order_type, "label": r.label,
        "is_active": r.is_active, "branch_id": r.branch_id, "created_at": str(r.created_at or "")
    } for r in rules]

@router.post("")
def create_rule(data: PriceRuleCreate, db: Session = Depends(get_db)):
    r = PriceRule(
        menu_item_id=data.menu_item_id,
        day_of_week=data.day_of_week,
        time_from=data.time_from, time_to=data.time_to,
        price=float(data.price), order_type=data.order_type,
        label=data.label, is_active=data.is_active,
        branch_id=data.branch_id
    )
    db.add(r); db.commit(); db.refresh(r)
    return {"id": r.id, "label": r.label, "price": r.price}

@router.put("/{rule_id}")
def update_rule(rule_id: int, data: PriceRuleUpdate, db: Session = Depends(get_db)):
    r = db.query(PriceRule).filter(PriceRule.id == rule_id).first()
    if not r: raise HTTPException(404, "Rule not found")
    for k in ("menu_item_id", "day_of_week", "time_from", "time_to", "price", "order_type", "label", "is_active", "branch_id"):
        v = getattr(data, k)
        if v is not None: setattr(r, k, v)
    db.commit()
    return {"ok": True}

@router.delete("/{rule_id}")
def delete_rule(rule_id: int, db: Session = Depends(get_db)):
    r = db.query(PriceRule).filter(PriceRule.id == rule_id).first()
    if not r: raise HTTPException(404, "Rule not found")
    db.delete(r); db.commit()
    return {"ok": True}

@router.get("/effective/{menu_item_id}")
def get_effective(menu_item_id: int, order_type: str = "", db: Session = Depends(get_db)):
    mi = db.query(MenuItem).filter(MenuItem.id == menu_item_id).first()
    if not mi: raise HTTPException(404, "Item not found")
    effective = get_effective_price(menu_item_id, mi.price, db, order_type or None)
    return {"menu_item_id": menu_item_id, "base_price": mi.price, "effective_price": effective, "order_type": order_type or "default"}

DOW_LABELS = {0: "Pon", 1: "Tor", 2: "Sre", 3: "Čet", 4: "Pet", 5: "Sob", 6: "Ned"}

@router.get("/dow-labels")
def dow_labels():
    return DOW_LABELS
