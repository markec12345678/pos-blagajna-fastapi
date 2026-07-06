from sqlalchemy import Column, Integer, DateTime, ForeignKey, String, Text
from sqlalchemy.sql import func
from app.core.database import Base


class EmployeeShift(Base):
    __tablename__ = "employee_shifts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    clock_in = Column(DateTime, server_default=func.now())
    clock_out = Column(DateTime, nullable=True)
    status = Column(String, default="active")
    notes = Column(Text, default="")
