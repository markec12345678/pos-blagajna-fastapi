from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, ForeignKey
from datetime import datetime
from app.core.database import Base


class Customer(Base):
    __tablename__ = "customers"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    phone = Column(String, default="")
    address = Column(String, default="")
    email = Column(String, default="")
    notes = Column(String, default="")
    tags = Column(String, default="")
    created_at = Column(DateTime, default=datetime.now)
    loyalty_points = Column(Integer, default=0)
    total_spent = Column(Float, default=0)
    is_member = Column(Boolean, default=False)
    branch_id = Column(Integer, ForeignKey("branches.id"), nullable=True)
    password_hash = Column(String, default="")
    auth_token = Column(String, default="")
