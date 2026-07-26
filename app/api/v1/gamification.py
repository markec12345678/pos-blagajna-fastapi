from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.database import get_db
from app.models.customer import Customer
from app.models.gamification import Challenge, CustomerChallengeProgress, CustomerBadge, CustomerStreak
from app.models.order import Order, OrderItem
from app.models.loyalty import LoyaltyTransaction
from app.schemas.gamification import ChallengeCreate, ChallengeUpdate, BadgeAward
from datetime import datetime, date, timedelta

router = APIRouter(prefix="/gamification", tags=["gamification"])


@router.get("/challenges")
def list_challenges(db: Session = Depends(get_db)):
    challenges = db.query(Challenge).filter(Challenge.is_active == True).all()
    return [_challenge_dict(c, db) for c in challenges]


@router.post("/challenges")
def create_challenge(data: ChallengeCreate, db: Session = Depends(get_db)):
    c = Challenge(**data.model_dump())
    db.add(c)
    db.commit()
    db.refresh(c)
    return _challenge_dict(c, db)


@router.put("/challenges/{challenge_id}")
def update_challenge(challenge_id: int, data: ChallengeUpdate, db: Session = Depends(get_db)):
    c = db.query(Challenge).filter(Challenge.id == challenge_id).first()
    if not c:
        raise HTTPException(404, "Challenge not found")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(c, k, v)
    db.commit()
    db.refresh(c)
    return _challenge_dict(c, db)


@router.delete("/challenges/{challenge_id}")
def delete_challenge(challenge_id: int, db: Session = Depends(get_db)):
    c = db.query(Challenge).filter(Challenge.id == challenge_id).first()
    if not c:
        raise HTTPException(404, "Challenge not found")
    db.delete(c)
    db.commit()
    return {"ok": True}


@router.get("/challenges/{customer_id}/progress")
def get_customer_progress(customer_id: int, db: Session = Depends(get_db)):
    challenges = db.query(Challenge).filter(Challenge.is_active == True).all()
    result = []
    for c in challenges:
        progress = db.query(CustomerChallengeProgress).filter(
            CustomerChallengeProgress.customer_id == customer_id,
            CustomerChallengeProgress.challenge_id == c.id
        ).first()
        if not progress:
            current = _calculate_progress(customer_id, c, db)
            result.append({
                "challenge": _challenge_dict(c, db),
                "progress": {"current": current, "target": c.target, "completed": current >= c.target, "rewarded": False}
            })
        else:
            if not progress.completed:
                current = _calculate_progress(customer_id, c, db)
                progress.current = current
                if current >= c.target:
                    progress.completed = True
                    progress.completed_at = datetime.now()
            result.append({
                "challenge": _challenge_dict(c, db),
                "progress": {
                    "current": progress.current, "target": c.target,
                    "completed": progress.completed, "rewarded": progress.rewarded,
                    "completed_at": progress.completed_at.isoformat() if progress.completed_at else None
                }
            })
    db.commit()
    return result


@router.post("/challenges/{challenge_id}/check/{customer_id}")
def check_challenge_completion(challenge_id: int, customer_id: int, db: Session = Depends(get_db)):
    c = db.query(Challenge).filter(Challenge.id == challenge_id).first()
    if not c:
        raise HTTPException(404, "Challenge not found")

    progress = db.query(CustomerChallengeProgress).filter(
        CustomerChallengeProgress.customer_id == customer_id,
        CustomerChallengeProgress.challenge_id == c.id
    ).first()

    current = _calculate_progress(customer_id, c, db)

    if not progress:
        progress = CustomerChallengeProgress(customer_id=customer_id, challenge_id=c.id, current=current)
        db.add(progress)

    progress.current = current
    newly_completed = False

    if current >= c.target and not progress.completed:
        progress.completed = True
        progress.completed_at = datetime.now()
        newly_completed = True

    if progress.completed and not progress.rewarded:
        cust = db.query(Customer).filter(Customer.id == customer_id).first()
        if cust and c.reward_points > 0:
            cust.loyalty_points = (cust.loyalty_points or 0) + c.reward_points
            lt = LoyaltyTransaction(
                customer_id=customer_id, points=c.reward_points, type="earn",
                note=f"Challenge: {c.name}"
            )
            db.add(lt)
        if cust and c.reward_badge:
            existing = db.query(CustomerBadge).filter(
                CustomerBadge.customer_id == customer_id,
                CustomerBadge.badge_name == c.reward_badge
            ).first()
            if not existing:
                badge = CustomerBadge(
                    customer_id=customer_id, badge_name=c.reward_badge,
                    badge_icon=c.icon, badge_description=f"Odklenjeno z izzivom: {c.name}"
                )
                db.add(badge)
        progress.rewarded = True

    db.commit()
    return {
        "current": current, "target": c.target,
        "completed": progress.completed, "newly_completed": newly_completed,
        "rewarded": progress.rewarded
    }


@router.get("/badges/{customer_id}")
def get_customer_badges(customer_id: int, db: Session = Depends(get_db)):
    badges = db.query(CustomerBadge).filter(
        CustomerBadge.customer_id == customer_id
    ).order_by(CustomerBadge.earned_at.desc()).all()
    return [{
        "id": b.id, "name": b.badge_name, "icon": b.badge_icon,
        "description": b.badge_description,
        "earned_at": b.earned_at.isoformat() if b.earned_at else None
    } for b in badges]


@router.post("/badges")
def award_badge(data: BadgeAward, db: Session = Depends(get_db)):
    existing = db.query(CustomerBadge).filter(
        CustomerBadge.customer_id == data.customer_id,
        CustomerBadge.badge_name == data.badge_name
    ).first()
    if existing:
        return {"ok": True, "message": "Badge already awarded", "badge_id": existing.id}
    badge = CustomerBadge(
        customer_id=data.customer_id, badge_name=data.badge_name,
        badge_icon=data.badge_icon, badge_description=data.badge_description
    )
    db.add(badge)
    db.commit()
    db.refresh(badge)
    return {"ok": True, "badge_id": badge.id, "message": f"Badge '{data.badge_name}' awarded"}


@router.get("/streaks/{customer_id}")
def get_customer_streak(customer_id: int, db: Session = Depends(get_db)):
    streak = db.query(CustomerStreak).filter(CustomerStreak.customer_id == customer_id).first()
    if not streak:
        streak = CustomerStreak(customer_id=customer_id)
        db.add(streak)
        db.commit()
        db.refresh(streak)

    today = date.today()
    if streak.last_visit_date:
        diff = (today - streak.last_visit_date).days
        if diff > 1:
            streak.current_streak = 0
            streak.streak_multiplier = 1.0
            db.commit()

    orders_today = db.query(Order).filter(
        Order.customer_id == customer_id,
        func.date(Order.created_at) == today,
        Order.status.in_(["closed", "paid"])
    ).count()

    if orders_today > 0 and (streak.last_visit_date is None or streak.last_visit_date != today):
        if streak.last_visit_date and (today - streak.last_visit_date).days == 1:
            streak.current_streak += 1
        elif streak.last_visit_date is None or streak.last_visit_date != today:
            streak.current_streak = 1
        streak.last_visit_date = today
        if streak.current_streak > streak.longest_streak:
            streak.longest_streak = streak.current_streak
        streak.streak_multiplier = min(1.0 + (streak.current_streak - 1) * 0.1, 2.0)
        db.commit()

    return {
        "customer_id": customer_id,
        "current_streak": streak.current_streak,
        "longest_streak": streak.longest_streak,
        "last_visit": streak.last_visit_date.isoformat() if streak.last_visit_date else None,
        "multiplier": streak.streak_multiplier
    }


@router.get("/leaderboard")
def get_leaderboard(db: Session = Depends(get_db), limit: int = 20):
    members = db.query(Customer).filter(Customer.is_member == True).order_by(Customer.loyalty_points.desc()).limit(limit).all()

    badges_count = {}
    for b in db.query(CustomerBadge).all():
        badges_count[b.customer_id] = badges_count.get(b.customer_id, 0) + 1

    streaks = {}
    for s in db.query(CustomerStreak).all():
        streaks[s.customer_id] = s.current_streak

    result = []
    for i, c in enumerate(members):
        result.append({
            "rank": i + 1,
            "customer_id": c.id,
            "name": c.name,
            "points": c.loyalty_points or 0,
            "total_spent": c.total_spent or 0,
            "badges": badges_count.get(c.id, 0),
            "streak": streaks.get(c.id, 0),
            "score": (c.loyalty_points or 0) + badges_count.get(c.id, 0) * 50 + streaks.get(c.id, 0) * 25
        })

    result.sort(key=lambda x: x["score"], reverse=True)
    for i, r in enumerate(result):
        r["rank"] = i + 1

    return result


@router.get("/stats")
def get_gamification_stats(db: Session = Depends(get_db)):
    active_challenges = db.query(Challenge).filter(Challenge.is_active == True).count()
    total_badges = db.query(CustomerBadge).count()
    customers_with_streaks = db.query(CustomerStreak).filter(CustomerStreak.current_streak > 0).count()
    completed_progress = db.query(CustomerChallengeProgress).filter(CustomerChallengeProgress.completed == True).count()
    return {
        "active_challenges": active_challenges,
        "total_badges_awarded": total_badges,
        "customers_with_streaks": customers_with_streaks,
        "challenges_completed": completed_progress
    }


@router.post("/auto-check")
def auto_check_all_customers(db: Session = Depends(get_db)):
    challenges = db.query(Challenge).filter(Challenge.is_active == True).all()
    members = db.query(Customer).filter(Customer.is_member == True).all()
    awarded = 0
    for c in members:
        for ch in challenges:
            current = _calculate_progress(c.id, ch, db)
            progress = db.query(CustomerChallengeProgress).filter(
                CustomerChallengeProgress.customer_id == c.id,
                CustomerChallengeProgress.challenge_id == ch.id
            ).first()
            if not progress:
                progress = CustomerChallengeProgress(customer_id=c.id, challenge_id=ch.id, current=current)
                db.add(progress)
            progress.current = current
            if current >= ch.target and not progress.completed:
                progress.completed = True
                progress.completed_at = datetime.now()
                if ch.reward_points > 0:
                    c.loyalty_points = (c.loyalty_points or 0) + ch.reward_points
                    db.add(LoyaltyTransaction(
                        customer_id=c.id, points=ch.reward_points, type="earn",
                        note=f"Challenge: {ch.name}"
                    ))
                if ch.reward_badge:
                    existing = db.query(CustomerBadge).filter(
                        CustomerBadge.customer_id == c.id,
                        CustomerBadge.badge_name == ch.reward_badge
                    ).first()
                    if not existing:
                        db.add(CustomerBadge(
                            customer_id=c.id, badge_name=ch.reward_badge,
                            badge_icon=ch.icon, badge_description=f"Odklenjeno z izzivom: {ch.name}"
                        ))
                progress.rewarded = True
                awarded += 1
    db.commit()
    return {"checked": len(members), "newly_completed": awarded}


def _calculate_progress(customer_id: int, challenge: Challenge, db: Session) -> int:
    metric = challenge.metric
    if metric == "orders":
        q = db.query(func.count(Order.id)).filter(
            Order.customer_id == customer_id,
            Order.status.in_(["closed", "paid"])
        )
        if challenge.valid_from:
            q = q.filter(Order.created_at >= challenge.valid_from)
        if challenge.valid_to:
            q = q.filter(Order.created_at <= challenge.valid_to)
        return q.scalar() or 0

    elif metric == "spent":
        q = db.query(func.sum(Order.total)).filter(
            Order.customer_id == customer_id,
            Order.status.in_(["closed", "paid"])
        )
        if challenge.valid_from:
            q = q.filter(Order.created_at >= challenge.valid_from)
        if challenge.valid_to:
            q = q.filter(Order.created_at <= challenge.valid_to)
        return int(q.scalar() or 0)

    elif metric == "visits":
        q = db.query(func.count(func.distinct(func.date(Order.created_at)))).filter(
            Order.customer_id == customer_id,
            Order.status.in_(["closed", "paid"])
        )
        if challenge.valid_from:
            q = q.filter(Order.created_at >= challenge.valid_from)
        if challenge.valid_to:
            q = q.filter(Order.created_at <= challenge.valid_to)
        return q.scalar() or 0

    elif metric == "items":
        q = db.query(func.sum(OrderItem.quantity)).join(Order).filter(
            Order.customer_id == customer_id,
            Order.status.in_(["closed", "paid"])
        )
        if challenge.valid_from:
            q = q.filter(Order.created_at >= challenge.valid_from)
        if challenge.valid_to:
            q = q.filter(Order.created_at <= challenge.valid_to)
        return q.scalar() or 0

    elif metric == "categories":
        q = db.query(func.count(func.distinct(OrderItem.menu_item_id))).join(Order).filter(
            Order.customer_id == customer_id,
            Order.status.in_(["closed", "paid"])
        )
        if challenge.valid_from:
            q = q.filter(Order.created_at >= challenge.valid_from)
        if challenge.valid_to:
            q = q.filter(Order.created_at <= challenge.valid_to)
        return q.scalar() or 0

    return 0


def _challenge_dict(c: Challenge, db: Session) -> dict:
    return {
        "id": c.id, "name": c.name, "description": c.description,
        "icon": c.icon, "target": c.target, "metric": c.metric,
        "reward_points": c.reward_points, "reward_badge": c.reward_badge,
        "valid_from": c.valid_from.isoformat() if c.valid_from else None,
        "valid_to": c.valid_to.isoformat() if c.valid_to else None,
        "is_active": c.is_active
    }
