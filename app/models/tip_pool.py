from sqlalchemy import Column, Integer, Float, String, Date, DateTime, ForeignKey, Boolean, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base


class TipPool(Base):
    __tablename__ = "tip_pools"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, nullable=False, index=True)
    branch_id = Column(Integer, ForeignKey("branches.id"), nullable=True)
    total_tips = Column(Float, default=0)
    method = Column(String, default="by_hours")
    status = Column(String, default="open")
    notes = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.now)
    distributed_at = Column(DateTime, nullable=True)

    distributions = relationship("TipDistribution", back_populates="pool", cascade="all, delete-orphan")


class TipDistribution(Base):
    __tablename__ = "tip_distributions"

    id = Column(Integer, primary_key=True, index=True)
    pool_id = Column(Integer, ForeignKey("tip_pools.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    amount = Column(Float, default=0)
    hours_worked = Column(Float, default=0)
    role_weight = Column(Float, default=1.0)
    paid = Column(Boolean, default=False)
    paid_at = Column(DateTime, nullable=True)

    pool = relationship("TipPool", back_populates="distributions")
