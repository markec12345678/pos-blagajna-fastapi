from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Boolean
from datetime import datetime
from app.core.database import Base


class LoyaltyReward(Base):
    __tablename__ = "loyalty_rewards"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    points_cost = Column(Integer, nullable=False)
    reward_type = Column(String, nullable=False, default="discount")  # discount, free_item, free_delivery, special_offer
    value = Column(Float, nullable=True)  # EUR value for discount
    min_tier = Column(String, nullable=True)  # bronze, silver, gold, platinum
    max_redemptions = Column(Integer, nullable=True)
    current_redemptions = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.now)


class LoyaltyTransaction(Base):
    __tablename__ = "loyalty_transactions"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False, index=True)
    points = Column(Integer, nullable=False)  # positive = earn, negative = redeem
    type = Column(String, nullable=False)  # earn, redeem, adjust, expire, birthday
    order_id = Column(Integer, nullable=True)
    note = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.now)
