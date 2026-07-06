from sqlalchemy import Column, Integer, Float, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base


class HouseAccount(Base):
    __tablename__ = "house_accounts"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False, unique=True)
    balance = Column(Float, default=0)
    credit_limit = Column(Float, default=0)
    status = Column(String, default="active")
    notes = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

    transactions = relationship("HouseAccountTransaction", back_populates="account", cascade="all, delete-orphan")


class HouseAccountTransaction(Base):
    __tablename__ = "house_account_transactions"

    id = Column(Integer, primary_key=True, index=True)
    account_id = Column(Integer, ForeignKey("house_accounts.id"), nullable=False)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=True)
    type = Column(String, nullable=False)
    amount = Column(Float, nullable=False)
    description = Column(String, default="")
    created_at = Column(DateTime, default=datetime.now)

    account = relationship("HouseAccount", back_populates="transactions")
