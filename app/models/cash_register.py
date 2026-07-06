from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from datetime import datetime
from app.core.database import Base


class CashRegister(Base):
    __tablename__ = "cash_registers"

    id = Column(Integer, primary_key=True, index=True)
    opened_by = Column(Integer, ForeignKey("users.id"))
    opened_at = Column(DateTime, default=datetime.now)
    closed_at = Column(DateTime)
    opening_balance = Column(Float, default=0)
    closing_balance = Column(Float)
    expected_balance = Column(Float)
    difference = Column(Float)
    status = Column(String, default="open")


class CashMovement(Base):
    __tablename__ = "cash_movements"

    id = Column(Integer, primary_key=True, index=True)
    register_id = Column(Integer, ForeignKey("cash_registers.id"))
    amount = Column(Float, nullable=False)
    reason = Column(String)
    type = Column(String)  # "in" or "out"
    created_at = Column(DateTime, default=datetime.now)
