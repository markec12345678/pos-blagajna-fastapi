from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    invoice_number = Column(Integer, unique=True, nullable=True)
    table_id = Column(Integer, ForeignKey("tables.id"))
    cashier_id = Column(Integer, ForeignKey("users.id"))
    order_type = Column(String, default="dine-in")
    customer_name = Column(String)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=True)
    status = Column(String, default="open")
    total = Column(Float, default=0)
    tax_total = Column(Float, default=0)
    created_at = Column(DateTime, default=datetime.now)
    scheduled_at = Column(DateTime, nullable=True)
    discount_type = Column(String)
    discount_value = Column(Float, default=0)
    discount_amount = Column(Float, default=0)
    cancel_reason = Column(String)
    closed_at = Column(DateTime)
    branch_id = Column(Integer, ForeignKey("branches.id"), nullable=True)
    notes = Column(String, default="")
    tags = Column(String, default="[]")
    customer_phone = Column(String, default="")
    customer_email = Column(String, default="")
    delivery_address = Column(String, default="")

    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")


class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    menu_item_id = Column(Integer, ForeignKey("menu_items.id"), nullable=False)
    item_name = Column(String, nullable=False)
    quantity = Column(Integer, nullable=False)
    unit_price = Column(Float, nullable=False)
    total_price = Column(Float, nullable=False)
    tax_rate = Column(Float, default=0)
    tax_amount = Column(Float, default=0)
    status = Column(String, default="ordered")
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    notes = Column(String, default="")
    modifiers = Column(String, default="[]")

    order = relationship("Order", back_populates="items")
