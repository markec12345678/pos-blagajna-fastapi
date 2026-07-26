"""Customer Loyalty real-time points tracking."""
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime, timedelta

from app.core.database import get_db
from app.api.v1.auth import get_current_user

router = APIRouter(prefix="/loyalty-realtime", tags=["Loyalty real-time"])


@router.get("/customer/{customer_id}/points")
def get_customer_points(customer_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Vrni točke stranke v realnem času."""
    from app.models.loyalty import LoyaltyTransaction
    from app.models.customer import Customer

    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        return {"error": "Stranka ni najdena"}

    # Calculate total points
    transactions = db.query(LoyaltyTransaction).filter(
        LoyaltyTransaction.customer_id == customer_id
    ).order_by(LoyaltyTransaction.created_at.desc()).all()

    total_points = sum(t.points for t in transactions if t.type == 'earn') - sum(abs(t.points) for t in transactions if t.type == 'redeem')
    
    # Recent activity (last 10)
    recent = [{
        "id": t.id,
        "points": t.points,
        "type": t.type,
        "description": t.description,
        "created_at": t.created_at.isoformat() if t.created_at else None
    } for t in transactions[:10]]

    # Tier calculation
    if total_points >= 1000:
        tier = "Gold"
        tier_color = "#f59e0b"
        next_tier = None
        points_to_next = 0
    elif total_points >= 500:
        tier = "Silver"
        tier_color = "#94a3b8"
        next_tier = "Gold"
        points_to_next = 1000 - total_points
    else:
        tier = "Bronze"
        tier_color = "#cd7f32"
        next_tier = "Silver"
        points_to_next = 500 - total_points

    return {
        "customer_id": customer_id,
        "customer_name": getattr(customer, 'full_name', getattr(customer, 'name', 'Neznan')),
        "total_points": max(0, total_points),
        "tier": tier,
        "tier_color": tier_color,
        "next_tier": next_tier,
        "points_to_next": max(0, points_to_next),
        "recent_transactions": recent,
        "lifetime_points": sum(abs(t.points) for t in transactions if t.type == 'earn'),
    }


@router.post("/customer/{customer_id}/earn")
def earn_points(customer_id: int, amount: float, description: str = "", db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Dodaj točke stranki (1 točka za 1€)."""
    from app.models.loyalty import LoyaltyTransaction
    from app.models.customer import Customer

    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        return {"error": "Stranka ni najdena"}

    points = int(amount)  # 1 point per euro

    new_tx = LoyaltyTransaction(
        customer_id=customer_id,
        points=points,
        type='earn',
        description=description or f"Zasluženo z nakupom {amount:.2f}€"
    )
    db.add(new_tx)
    db.commit()

    # Get updated total
    transactions = db.query(LoyaltyTransaction).filter(
        LoyaltyTransaction.customer_id == customer_id
    ).all()
    total = sum(t.points for t in transactions if t.type == 'earn') - sum(abs(t.points) for t in transactions if t.type == 'redeem')

    return {
        "message": f"Dodanih {points} točk",
        "points_earned": points,
        "total_points": max(0, total),
        "customer_id": customer_id
    }


@router.post("/customer/{customer_id}/redeem")
def redeem_points(customer_id: int, points: int, description: str = "", db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Unovči točke stranke."""
    from app.models.loyalty import LoyaltyTransaction
    from app.models.customer import Customer

    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        return {"error": "Stranka ni najdena"}

    # Check balance
    transactions = db.query(LoyaltyTransaction).filter(
        LoyaltyTransaction.customer_id == customer_id
    ).all()
    total = sum(t.points for t in transactions if t.type == 'earn') - sum(abs(t.points) for t in transactions if t.type == 'redeem')

    if points > total:
        return {"error": "Ni dovolj točk", "available": total}

    new_tx = LoyaltyTransaction(
        customer_id=customer_id,
        points=-points,
        type='redeem',
        description=description or f"Unovčenih {points} točk"
    )
    db.add(new_tx)
    db.commit()

    return {
        "message": f"Unovčenih {points} točk",
        "points_redeemed": points,
        "total_points": max(0, total - points),
        "customer_id": customer_id
    }


@router.get("/leaderboard")
def get_leaderboard(limit: int = Query(10, ge=1, le=50), db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Vrni lestvico strank z največ točkami."""
    from app.models.loyalty import LoyaltyTransaction
    from app.models.customer import Customer

    # Get all customers with points
    customers = db.query(Customer).filter(Customer.is_active == True).all()
    
    leaderboard = []
    for c in customers:
        transactions = db.query(LoyaltyTransaction).filter(
            LoyaltyTransaction.customer_id == c.id
        ).all()
        total = sum(t.points for t in transactions if t.type == 'earn') - sum(abs(t.points) for t in transactions if t.type == 'redeem')
        
        if total > 0:
            leaderboard.append({
                "customer_id": c.id,
                "name": getattr(c, 'full_name', getattr(c, 'name', 'Neznan')),
                "points": total,
                "tier": "Gold" if total >= 1000 else "Silver" if total >= 500 else "Bronze"
            })

    leaderboard.sort(key=lambda x: x["points"], reverse=True)
    
    return {"leaderboard": leaderboard[:limit]}


@router.get("/rewards")
def get_available_rewards(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Vrni nagrade, ki jih je mogoče unovčiti."""
    from app.models.loyalty import LoyaltyReward

    rewards = db.query(LoyaltyReward).filter(
        LoyaltyReward.is_active == True
    ).order_by(LoyaltyReward.points_cost.asc()).all()

    return {
        "rewards": [{
            "id": r.id,
            "name": r.name,
            "description": r.description,
            "points_cost": r.points_cost,
            "tier_required": getattr(r, 'tier_required', 'Bronze'),
        } for r in rewards]
    }
