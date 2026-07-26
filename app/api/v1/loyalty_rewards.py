"""Loyalty Rewards API — katalog nagrad in unovčenje točk."""
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime

from app.core.database import get_db
from app.api.v1.auth import get_current_user

router = APIRouter(prefix="/loyalty-rewards", tags=["Loyalty nagrade"])


class RewardCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    points_cost: int
    reward_type: str = "discount"  # discount, free_item, free_delivery, special_offer
    value: Optional[float] = 0  # EUR value for discount
    min_tier: Optional[str] = None  # bronze, silver, gold, platinum
    max_redemptions: Optional[int] = None
    is_active: bool = True


class RewardRedeem(BaseModel):
    reward_id: int
    customer_id: int


@router.get("/")
def list_rewards(
    active_only: bool = True,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Seznam vseh nagrad v katalogu."""
    from app.models.loyalty import LoyaltyReward

    q = db.query(LoyaltyReward)
    if active_only:
        q = q.filter(LoyaltyReward.is_active == True)
    rewards = q.order_by(LoyaltyReward.points_cost).all()

    return {
        "rewards": [
            {
                "id": r.id,
                "name": r.name,
                "description": r.description,
                "points_cost": r.points_cost,
                "reward_type": r.reward_type,
                "value": float(r.value or 0),
                "min_tier": r.min_tier,
                "max_redemptions": r.max_redemptions,
                "current_redemptions": getattr(r, 'current_redemptions', 0),
                "is_active": r.is_active,
            }
            for r in rewards
        ]
    }


@router.post("/")
def create_reward(reward: RewardCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Ustvari novo nagrado."""
    from app.models.loyalty import LoyaltyReward

    new_reward = LoyaltyReward(
        name=reward.name,
        description=reward.description,
        points_cost=reward.points_cost,
        reward_type=reward.reward_type,
        value=reward.value,
        min_tier=reward.min_tier,
        max_redemptions=reward.max_redemptions,
        is_active=reward.is_active,
    )
    db.add(new_reward)
    db.commit()
    db.refresh(new_reward)
    return {"id": new_reward.id, "message": "Nagrada ustvarjena"}


@router.put("/{reward_id}")
def update_reward(reward_id: int, reward: RewardCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Posodobi nagrado."""
    from app.models.loyalty import LoyaltyReward

    r = db.query(LoyaltyReward).filter(LoyaltyReward.id == reward_id).first()
    if not r:
        return {"error": "Nagrada ni najdena"}

    r.name = reward.name
    r.description = reward.description
    r.points_cost = reward.points_cost
    r.reward_type = reward.reward_type
    r.value = reward.value
    r.min_tier = reward.min_tier
    r.max_redemptions = reward.max_redemptions
    r.is_active = reward.is_active
    db.commit()

    return {"message": "Nagrada posodobljena"}


@router.delete("/{reward_id}")
def delete_reward(reward_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Izbriši nagrado."""
    from app.models.loyalty import LoyaltyReward

    r = db.query(LoyaltyReward).filter(LoyaltyReward.id == reward_id).first()
    if not r:
        return {"error": "Nagrada ni najdena"}

    db.delete(r)
    db.commit()
    return {"message": "Nagrada izbrisana"}


@router.post("/redeem")
def redeem_reward(req: RewardRedeem, db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Unovči nagrado za stranko."""
    from app.models.loyalty import LoyaltyReward, LoyaltyTransaction
    from app.models.customer import Customer

    reward = db.query(LoyaltyReward).filter(LoyaltyReward.id == req.reward_id).first()
    if not reward:
        return {"error": "Nagrada ni najdena"}
    if not reward.is_active:
        return {"error": "Nagrada ni aktivna"}

    customer = db.query(Customer).filter(Customer.id == req.customer_id).first()
    if not customer:
        return {"error": "Stranka ni najdena"}

    current_points = getattr(customer, 'loyalty_points', 0) or 0
    if current_points < reward.points_cost:
        return {"error": f"Premalo točk. Potrebujete {reward.points_cost}, imate {current_points}"}

    # Check tier
    if reward.min_tier:
        customer_tier = getattr(customer, 'loyalty_tier', 'bronze') or 'bronze'
        tier_order = {'bronze': 0, 'silver': 1, 'gold': 2, 'platinum': 3}
        if tier_order.get(customer_tier, 0) < tier_order.get(reward.min_tier, 0):
            return {"error": f"Potrebujete tier {reward.min_tier} za to nagrado"}

    # Check max redemptions
    if reward.max_redemptions and (getattr(reward, 'current_redemptions', 0) or 0) >= reward.max_redemptions:
        return {"error": "Nagrada je dosegla maksimalno število unovčenj"}

    # Deduct points
    customer.loyalty_points = current_points - reward.points_cost

    # Increment redemptions
    reward.current_redemptions = (getattr(reward, 'current_redemptions', 0) or 0) + 1

    # Log transaction
    tx = LoyaltyTransaction(
        customer_id=req.customer_id,
        points=-reward.points_cost,
        type="redeem",
        note=f"Unovčeno: {reward.name}",
    )
    db.add(tx)
    db.commit()

    return {
        "message": f"Nagrada '{reward.name}' unovčena!",
        "points_spent": reward.points_cost,
        "remaining_points": customer.loyalty_points,
        "reward_value": float(reward.value or 0),
    }


@router.get("/catalog")
def get_public_catalog(db: Session = Depends(get_db)):
    """Javni katalog nagrad za stranke (brez auth)."""
    from app.models.loyalty import LoyaltyReward

    rewards = db.query(LoyaltyReward).filter(
        LoyaltyReward.is_active == True
    ).order_by(LoyaltyReward.points_cost).all()

    return {
        "rewards": [
            {
                "id": r.id,
                "name": r.name,
                "description": r.description,
                "points_cost": r.points_cost,
                "reward_type": r.reward_type,
                "value": float(r.value or 0),
                "min_tier": r.min_tier,
            }
            for r in rewards
        ]
    }


@router.get("/customer/{customer_id}")
def get_customer_rewards_status(customer_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Status točk in unovčljive nagrade za stranko."""
    from app.models.customer import Customer
    from app.models.loyalty import LoyaltyReward, LoyaltyTransaction

    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        return {"error": "Stranka ni najdena"}

    current_points = getattr(customer, 'loyalty_points', 0) or 0
    customer_tier = getattr(customer, 'loyalty_tier', 'bronze') or 'bronze'

    # Get redeemable rewards
    tier_order = {'bronze': 0, 'silver': 1, 'gold': 2, 'platinum': 3}
    all_rewards = db.query(LoyaltyReward).filter(LoyaltyReward.is_active == True).all()

    redeemable = []
    for r in all_rewards:
        if current_points >= r.points_cost:
            if not r.min_tier or tier_order.get(customer_tier, 0) >= tier_order.get(r.min_tier, 0):
                if not r.max_redemptions or (getattr(r, 'current_redemptions', 0) or 0) < r.max_redemptions:
                    redeemable.append({
                        "id": r.id,
                        "name": r.name,
                        "description": r.description,
                        "points_cost": r.points_cost,
                        "reward_type": r.reward_type,
                        "value": float(r.value or 0),
                    })

    # Recent redemptions
    recent = db.query(LoyaltyTransaction).filter(
        LoyaltyTransaction.customer_id == customer_id,
        LoyaltyTransaction.type == "redeem"
    ).order_by(LoyaltyTransaction.created_at.desc()).limit(5).all()

    return {
        "customer_id": customer_id,
        "current_points": current_points,
        "tier": customer_tier,
        "redeemable_rewards": redeemable,
        "recent_redemptions": [
            {
                "points": abs(tx.points),
                "note": tx.note,
                "date": tx.created_at.isoformat() if hasattr(tx.created_at, 'isoformat') else str(tx.created_at),
            }
            for tx in recent
        ],
    }
