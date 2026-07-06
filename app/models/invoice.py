from sqlalchemy import Column, Integer, String, Float, DateTime, Text, ForeignKey
from sqlalchemy.sql import func
from app.core.database import Base


class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(Integer, primary_key=True, index=True)
    invoice_number = Column(String, unique=True, nullable=False)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=True)
    buyer_name = Column(String, default="")
    buyer_tax_id = Column(String, default="")
    buyer_address = Column(String, default="")
    items = Column(Text, default="[]")
    subtotal = Column(Float, default=0)
    tax_total = Column(Float, default=0)
    discount_amount = Column(Float, default=0)
    total = Column(Float, default=0)
    status = Column(String, default="issued")
    issued_at = Column(DateTime, server_default=func.now())
    due_at = Column(DateTime, nullable=True)
    paid_at = Column(DateTime, nullable=True)
    cancelled_at = Column(DateTime, nullable=True)
    branch_id = Column(Integer, ForeignKey("branches.id"), nullable=True)
    notes = Column(Text, default="")
    eracun_status = Column(String, default="pending")
    eracun_xml_id = Column(String, default="")
