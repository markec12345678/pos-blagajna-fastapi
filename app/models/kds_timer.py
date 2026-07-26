from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey
from datetime import datetime
from app.core.database import Base


class KDSTimer(Base):
    __tablename__ = "kds_timers"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False, index=True)
    station = Column(String, nullable=True)  # grill, fryer, salad, dessert
    started_at = Column(DateTime, nullable=False)
    started_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    completed = Column(Boolean, default=False)
    completed_at = Column(DateTime, nullable=True)
    priority = Column(String, default="normal")  # low, normal, high, urgent
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.now)
