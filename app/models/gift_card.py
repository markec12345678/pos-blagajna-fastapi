from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, ForeignKey, Text
from datetime import datetime
from app.core.database import Base


class GiftCard(Base):
    __tablename__ = "gift_cards"
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String, unique=True, nullable=False, index=True)
    balance = Column(Float, default=0, nullable=False)
    active = Column(Boolean, default=True)
    expires_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.now)
    notes = Column(String, default="")


class GiftCardTransaction(Base):
    __tablename__ = "gift_card_transactions"
    id = Column(Integer, primary_key=True, index=True)
    gift_card_id = Column(Integer, ForeignKey("gift_cards.id"), nullable=False)
    amount = Column(Float, nullable=False)
    type = Column(String, nullable=False)
    reference = Column(String)
    payment_id = Column(Integer, ForeignKey("payments.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.now)
