from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from datetime import datetime
from app.core.database import Base


class DeliveryOrder(Base):
    __tablename__ = "delivery_orders"

    id = Column(Integer, primary_key=True, index=True)
    external_id = Column(String, nullable=True, index=True)
    aggregator = Column(String, nullable=False)  # doordash, ubereats, wolt, glovo, etc.
    customer_name = Column(String, nullable=True)
    customer_phone = Column(String, nullable=True)
    delivery_address = Column(String, nullable=True)
    items = Column(Text, nullable=True)  # JSON array
    total = Column(Float, nullable=False)
    delivery_fee = Column(Float, default=0)
    service_fee = Column(Float, default=0)
    status = Column(String, default="pending")  # pending, accepted, preparing, ready, picked_up, delivered, cancelled
    internal_order_id = Column(Integer, ForeignKey("orders.id"), nullable=True, index=True)
    notes = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
