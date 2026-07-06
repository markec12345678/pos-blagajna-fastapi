from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, ForeignKey, Text
from datetime import datetime
from app.core.database import Base


class Promotion(Base):
    __tablename__ = "promotions"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    type = Column(String, nullable=False)
    value = Column(Float, nullable=False)
    min_order = Column(Float, default=0)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=True)
    buy_qty = Column(Integer, default=0)
    free_qty = Column(Integer, default=0)
    free_discount_pct = Column(Float, default=100)
    time_start = Column(String, default="")
    time_end = Column(String, default="")
    days_of_week = Column(String, default="")
    start_date = Column(DateTime, nullable=True)
    end_date = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True)
    branch_id = Column(Integer, ForeignKey("branches.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.now)
    description = Column(Text, default="")
