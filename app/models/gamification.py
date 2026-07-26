from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, ForeignKey, Date
from datetime import datetime
from app.core.database import Base


class Challenge(Base):
    __tablename__ = "loyalty_challenges"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(String, default="")
    icon = Column(String, default="🏆")
    target = Column(Integer, nullable=False)  # e.g. 5 orders, 50 EUR spent, 3 visits
    metric = Column(String, nullable=False)  # orders, spent, visits, items, categories
    reward_points = Column(Integer, default=0)
    reward_badge = Column(String, nullable=True)  # badge name to award on completion
    valid_from = Column(DateTime, nullable=True)
    valid_to = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True)
    branch_id = Column(Integer, ForeignKey("branches.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.now)


class CustomerChallengeProgress(Base):
    __tablename__ = "loyalty_challenge_progress"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False, index=True)
    challenge_id = Column(Integer, ForeignKey("loyalty_challenges.id"), nullable=False, index=True)
    current = Column(Integer, default=0)
    completed = Column(Boolean, default=False)
    completed_at = Column(DateTime, nullable=True)
    rewarded = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.now)


class CustomerBadge(Base):
    __tablename__ = "loyalty_badges"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False, index=True)
    badge_name = Column(String, nullable=False)
    badge_icon = Column(String, default="🏅")
    badge_description = Column(String, default="")
    earned_at = Column(DateTime, default=datetime.now)


class CustomerStreak(Base):
    __tablename__ = "loyalty_streaks"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False, index=True)
    current_streak = Column(Integer, default=0)
    longest_streak = Column(Integer, default=0)
    last_visit_date = Column(Date, nullable=True)
    streak_multiplier = Column(Float, default=1.0)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
