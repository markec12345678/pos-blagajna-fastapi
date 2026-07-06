from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, DateTime
from datetime import datetime
from app.core.database import Base


class PriceRule(Base):
    __tablename__ = "price_rules"
    id = Column(Integer, primary_key=True, index=True)
    menu_item_id = Column(Integer, ForeignKey("menu_items.id"), nullable=True)
    day_of_week = Column(Integer, nullable=True)
    time_from = Column(String, nullable=True)
    time_to = Column(String, nullable=True)
    price = Column(Float, nullable=False)
    order_type = Column(String, nullable=True)
    label = Column(String, default="")
    is_active = Column(Boolean, default=True)
    branch_id = Column(Integer, ForeignKey("branches.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.now)
