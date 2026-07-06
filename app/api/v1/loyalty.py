from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.customer import Customer
from app.models.loyalty import LoyaltyTransaction
from app.models.order import Order
from app.models.settings import Setting
from app.api.v1.audit_log import log_action
from datetime import datetime, timedelta
import json

router = APIRouter(prefix="/loyalty", tags=["loyalty"])


def get_setting(key: str, default: str = "") -> str:
    try:
        db = next(iter([]))
        return default
    except:
        return default


@router.get("/settings")
def get_loyalty_settings(db: Session = Depends(get_db)):
    s = {}
    for k in ("loyalty_rate", "loyalty_min_redeem", "loyalty_redeem_rate", "loyalty_birthday_bonus", "loyalty_welcome_bonus"):
        row = db.query(Setting).filter(Setting.key == k).first()
        s[k] = row.value if row else ""
    return s


@router.put("/settings")
def set_loyalty_settings(data: dict, db: Session = Depends(get_db)):
    for k, v in data.items():
        row = db.query(Setting).filter(Setting.key == k).first()
        if row:
            row.value = str(v)
        else:
            db.add(Setting(key=k, value=str(v)))
    db.commit()
    return {"ok": True}


@router.get("/{customer_id}")
def get_loyalty_status(customer_id: int, db: Session = Depends(get_db)):
    cust = db.query(Customer).filter(Customer.id == customer_id).first()
    if not cust:
        raise HTTPException(404, "Customer not found")
    recent = db.query(LoyaltyTransaction).filter(
        LoyaltyTransaction.customer_id == customer_id
    ).order_by(LoyaltyTransaction.created_at.desc()).limit(50).all()
    total_earned = db.query(LoyaltyTransaction).filter(
        LoyaltyTransaction.customer_id == customer_id,
        LoyaltyTransaction.type == "earn"
    ).with_entities(LoyaltyTransaction.points).all()
    total_redeemed = db.query(LoyaltyTransaction).filter(
        LoyaltyTransaction.customer_id == customer_id,
        LoyaltyTransaction.type == "redeem"
    ).with_entities(LoyaltyTransaction.points).all()
    return {
        "customer_id": cust.id,
        "customer_name": cust.name,
        "is_member": cust.is_member,
        "balance": cust.loyalty_points or 0,
        "total_spent": cust.total_spent or 0,
        "total_earned": sum(p[0] for p in total_earned),
        "total_redeemed": abs(sum(p[0] for p in total_redeemed)),
        "history": [{
            "id": t.id, "points": t.points, "type": t.type,
            "order_id": t.order_id, "note": t.note,
            "created_at": t.created_at.isoformat() if t.created_at else None
        } for t in recent]
    }


@router.post("/redeem")
def redeem_points(data: dict, db: Session = Depends(get_db)):
    customer_id = data.get("customer_id")
    points = data.get("points", 0)
    order_id = data.get("order_id")

    cust = db.query(Customer).filter(Customer.id == customer_id).first()
    if not cust:
        raise HTTPException(404, "Customer not found")
    if not cust.is_member:
        raise HTTPException(400, "Customer is not a loyalty member")
    if points <= 0:
        raise HTTPException(400, "Points must be positive")
    if (cust.loyalty_points or 0) < points:
        raise HTTPException(400, f"Insufficient points. Balance: {cust.loyalty_points}")

    redeem_rate = db.query(Setting).filter(Setting.key == "loyalty_redeem_rate").first()
    rate = int(redeem_rate.value) if redeem_rate and redeem_rate.value else 100
    discount = points / rate

    cust.loyalty_points = (cust.loyalty_points or 0) - points
    lt = LoyaltyTransaction(customer_id=cust.id, points=-points, type="redeem",
                            order_id=order_id, note=f"Redeemed {points} pts = {discount:.2f} EUR discount")
    db.add(lt)
    db.commit()

    return {
        "ok": True,
        "points_used": points,
        "discount": round(discount, 2),
        "new_balance": cust.loyalty_points,
        "transaction_id": lt.id
    }


@router.post("/enroll/{customer_id}")
def enroll_customer(customer_id: int, db: Session = Depends(get_db)):
    cust = db.query(Customer).filter(Customer.id == customer_id).first()
    if not cust:
        raise HTTPException(404, "Customer not found")
    if cust.is_member:
        return {"ok": True, "message": "Already a member"}
    cust.is_member = True
    welcome = db.query(Setting).filter(Setting.key == "loyalty_welcome_bonus").first()
    bonus = int(welcome.value) if welcome and welcome.value else 50
    cust.loyalty_points = (cust.loyalty_points or 0) + bonus
    lt = LoyaltyTransaction(customer_id=cust.id, points=bonus, type="earn", note="Welcome bonus")
    db.add(lt)
    db.commit()
    return {"ok": True, "points": cust.loyalty_points, "message": f"Enrolled with {bonus} welcome points"}


@router.post("/adjust")
def adjust_points(data: dict, db: Session = Depends(get_db)):
    customer_id = data.get("customer_id")
    points = data.get("points", 0)
    note = data.get("note", "")
    cust = db.query(Customer).filter(Customer.id == customer_id).first()
    if not cust:
        raise HTTPException(404, "Customer not found")
    cust.loyalty_points = (cust.loyalty_points or 0) + points
    lt = LoyaltyTransaction(customer_id=cust.id, points=points, type="adjust", note=note or "Manual adjustment")
    db.add(lt)
    db.commit()
    return {"ok": True, "new_balance": cust.loyalty_points}


@router.get("")
def list_all_members(db: Session = Depends(get_db)):
    members = db.query(Customer).filter(Customer.is_member == True).order_by(Customer.loyalty_points.desc()).all()
    tiers = _get_tiers(db)
    return [{
        "id": c.id, "name": c.name, "phone": c.phone, "email": c.email,
        "points": c.loyalty_points or 0, "total_spent": c.total_spent or 0,
        "tier": _calc_tier(tiers, c.loyalty_points or 0),
        "next_tier": _next_tier_info(tiers, c.loyalty_points or 0),
    } for c in members]


def _get_tiers(db: Session) -> list:
    row = db.query(Setting).filter(Setting.key == "loyalty_tiers").first()
    if row and row.value:
        try:
            return json.loads(row.value)
        except Exception:
            pass
    return [
        {"name": "Bronza", "name_en": "Bronze", "min_points": 0, "multiplier": 1.0, "color": "#cd7f32", "benefits": "1× točke"},
        {"name": "Srebro", "name_en": "Silver", "min_points": 500, "multiplier": 1.2, "color": "#a8a8a8", "benefits": "1.2× točke"},
        {"name": "Zlato", "name_en": "Gold", "min_points": 1500, "multiplier": 1.5, "color": "#ffd700", "benefits": "1.5× točke"},
        {"name": "Platina", "name_en": "Platinum", "min_points": 3000, "multiplier": 2.0, "color": "#e5e4e2", "benefits": "2× točke"},
    ]


def _calc_tier(tiers: list, points: int) -> dict:
    current = tiers[0] if tiers else {"name": "Bronza", "multiplier": 1.0, "color": "#cd7f32"}
    for t in sorted(tiers, key=lambda x: x.get("min_points", 0), reverse=True):
        if points >= t.get("min_points", 0):
            current = t
            break
    return {"name": current.get("name"), "multiplier": current.get("multiplier", 1.0), "color": current.get("color", "#888")}


def _next_tier_info(tiers: list, points: int) -> dict | None:
    sorted_tiers = sorted(tiers, key=lambda x: x.get("min_points", 0))
    for t in sorted_tiers:
        if points < t.get("min_points", 0):
            return {"name": t.get("name"), "points_needed": t["min_points"] - points, "min_points": t["min_points"]}
    return None


@router.get("/tiers")
def get_tiers(db: Session = Depends(get_db)):
    return _get_tiers(db)


@router.put("/tiers")
def set_tiers(data: dict, db: Session = Depends(get_db)):
    tiers = data.get("tiers", [])
    row = db.query(Setting).filter(Setting.key == "loyalty_tiers").first()
    if row:
        row.value = json.dumps(tiers)
    else:
        db.add(Setting(key="loyalty_tiers", value=json.dumps(tiers)))
    db.commit()
    return {"ok": True}


@router.get("/customers-with-tiers")
def customers_with_tiers(db: Session = Depends(get_db)):
    members = db.query(Customer).filter(Customer.is_member == True).order_by(Customer.loyalty_points.desc()).all()
    tiers = _get_tiers(db)
    return [{
        "id": c.id, "name": c.name, "phone": c.phone, "email": c.email,
        "points": c.loyalty_points or 0, "total_spent": c.total_spent or 0,
        "member_since": c.created_at.isoformat() if c.created_at else None,
        "tier": _calc_tier(tiers, c.loyalty_points or 0),
        "next_tier": _next_tier_info(tiers, c.loyalty_points or 0),
    } for c in members]
