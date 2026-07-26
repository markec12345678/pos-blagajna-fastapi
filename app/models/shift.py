from sqlalchemy import Column, Integer, DateTime, ForeignKey, String, Text
from sqlalchemy.sql import func
from app.core.database import Base


class EmployeeShift(Base):
    __tablename__ = "employee_shifts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    clock_in = Column(DateTime, server_default=func.now())
    clock_out = Column(DateTime, nullable=True)
    break_start = Column(DateTime, nullable=True)
    break_end = Column(DateTime, nullable=True)
    total_break_minutes = Column(Integer, default=0)
    status = Column(String, default="active")
    notes = Column(Text, default="")


class ShiftSwapRequest(Base):
    __tablename__ = "shift_swap_requests"

    id = Column(Integer, primary_key=True, index=True)
    requester_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    shift_date = Column(String, nullable=False)
    original_start = Column(String, nullable=False)
    original_end = Column(String, nullable=False)
    target_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    type = Column(String, default="swap")  # swap, coverage, drop
    status = Column(String, default="pending")  # pending, approved, rejected
    notes = Column(Text, default="")
    response_notes = Column(Text, default="")
    created_at = Column(DateTime, server_default=func.now())
    resolved_at = Column(DateTime, nullable=True)
    resolved_by = Column(Integer, ForeignKey("users.id"), nullable=True)
