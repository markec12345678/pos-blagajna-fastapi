from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.database import get_db
from app.models.waste import WasteRecord
from app.models.inventory import Ingredient
from app.api.v1.audit_log import log_action
from datetime import datetime, timedelta

router = APIRouter(prefix="/waste", tags=["waste"])


@router.post("")
def create_waste(data: dict, db: Session = Depends(get_db)):
    ing = db.query(Ingredient).filter(Ingredient.id == data["ingredient_id"]).first()
    if not ing:
        raise HTTPException(404, "Ingredient not found")
    qty = float(data["quantity"])
    if qty <= 0:
        raise HTTPException(400, "Quantity must be positive")
    cost = data.get("cost", 0) or qty * (ing.cost_per_unit or 0)
    wr = WasteRecord(
        ingredient_id=ing.id, quantity=qty, cost=round(cost, 2),
        reason=data.get("reason", "spoilage"), notes=data.get("notes", ""),
        user_id=data.get("user_id")
    )
    db.add(wr)
    ing.stock -= qty
    log_action(db, "waste_created", "waste_record", wr.id,
               details=f"{qty} {ing.unit} {ing.name} ({wr.reason})")
    db.commit()
    db.refresh(wr)
    return {"id": wr.id, "ingredient": ing.name, "quantity": qty, "cost": wr.cost}


@router.get("")
def list_waste(days: int = 30, ingredient_id: int = 0, reason: str = "", db: Session = Depends(get_db)):
    q = db.query(WasteRecord)
    if days:
        since = datetime.now() - timedelta(days=days)
        q = q.filter(WasteRecord.created_at >= since)
    if ingredient_id:
        q = q.filter(WasteRecord.ingredient_id == ingredient_id)
    if reason:
        q = q.filter(WasteRecord.reason == reason)
    records = q.order_by(WasteRecord.created_at.desc()).all()
    result = []
    for r in records:
        ing = db.query(Ingredient).filter(Ingredient.id == r.ingredient_id).first()
        result.append({
            "id": r.id, "ingredient_id": r.ingredient_id,
            "ingredient_name": ing.name if ing else "?",
            "ingredient_unit": ing.unit if ing else "",
            "quantity": r.quantity, "cost": r.cost, "reason": r.reason,
            "notes": r.notes, "user_id": r.user_id,
            "created_at": str(r.created_at)
        })
    return result


@router.delete("/{waste_id}")
def delete_waste(waste_id: int, db: Session = Depends(get_db)):
    wr = db.query(WasteRecord).filter(WasteRecord.id == waste_id).first()
    if not wr:
        raise HTTPException(404, "Waste record not found")
    db.delete(wr)
    log_action(db, "waste_deleted", "waste_record", waste_id)
    db.commit()
    return {"ok": True}


@router.get("/analytics")
def waste_analytics(days: int = 30, db: Session = Depends(get_db)):
    since = datetime.now() - timedelta(days=days)
    records = db.query(WasteRecord).filter(WasteRecord.created_at >= since).all()
    total_cost = sum(r.cost for r in records)
    total_qty = sum(r.quantity for r in records)
    count = len(records)

    by_reason = {}
    for r in records:
        by_reason.setdefault(r.reason, {"count": 0, "cost": 0, "qty": 0})
        by_reason[r.reason]["count"] += 1
        by_reason[r.reason]["cost"] += r.cost
        by_reason[r.reason]["qty"] += r.quantity

    by_ingredient = {}
    for r in records:
        ing = db.query(Ingredient).filter(Ingredient.id == r.ingredient_id).first()
        name = ing.name if ing else "?"
        by_ingredient.setdefault(name, {"count": 0, "cost": 0, "qty": 0, "unit": ing.unit if ing else ""})
        by_ingredient[name]["count"] += 1
        by_ingredient[name]["cost"] += r.cost
        by_ingredient[name]["qty"] += r.quantity

    return {
        "total_cost": round(total_cost, 2),
        "total_quantity": round(total_qty, 2),
        "record_count": count,
        "days": days,
        "by_reason": {k: {**v, "cost": round(v["cost"], 2)} for k, v in sorted(by_reason.items(), key=lambda x: x[1]["cost"], reverse=True)},
        "by_ingredient": {k: {**v, "cost": round(v["cost"], 2)} for k, v in sorted(by_ingredient.items(), key=lambda x: x[1]["cost"], reverse=True)[:20]}
    }
