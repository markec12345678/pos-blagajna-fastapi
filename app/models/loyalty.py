from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from datetime import datetime
from app.core.database import Base


class LoyaltyTransaction(Base):
    __tablename__ = "loyalty_transactions"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    points = Column(Integer, nullable=False)  # positive = earn, negative = redeem
    type = Column(String, nullable=False)  # earn, redeem, adjust, expire, birthday
    order_id = Column(Integer, nullable=True)
    note = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.now)
