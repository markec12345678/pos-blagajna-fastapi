from sqlalchemy import Column, Integer, String, Float, DateTime, Text, ForeignKey
from sqlalchemy.sql import func
from app.core.database import Base


class CateringOrder(Base):
    __tablename__ = "catering_orders"

    id = Column(Integer, primary_key=True, index=True)
    customer_name = Column(String, nullable=False)
    customer_phone = Column(String, default="")
    customer_email = Column(String, default="")
    event_type = Column(String, default="")
    event_date = Column(DateTime, nullable=False)
    event_time = Column(String, default="")
    guests = Column(Integer, default=10)
    location = Column(String, default="")
    menu_details = Column(Text, default="")
    total = Column(Float, default=0)
    deposit = Column(Float, default=0)
    deposit_paid = Column(Integer, default=0)
    status = Column(String, default="inquiry")
    notes = Column(Text, default="")
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now())
    branch_id = Column(Integer, ForeignKey("branches.id"), nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
