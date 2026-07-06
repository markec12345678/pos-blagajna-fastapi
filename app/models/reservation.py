from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.sql import func
from app.core.database import Base


class Reservation(Base):
    __tablename__ = "reservations"

    id = Column(Integer, primary_key=True, index=True)
    table_id = Column(Integer, ForeignKey("tables.id"), nullable=True)
    customer_name = Column(String, nullable=False)
    customer_phone = Column(String, default="")
    customer_email = Column(String, default="")
    guests = Column(Integer, default=2)
    reservation_time = Column(DateTime, nullable=False)
    status = Column(String, default="confirmed")
    notes = Column(Text, default="")
    created_at = Column(DateTime, server_default=func.now())
    branch_id = Column(Integer, ForeignKey("branches.id"), nullable=True)
    reminder_sent = Column(Integer, default=0)
