from sqlalchemy import Column, Integer, DateTime, Date, Time, ForeignKey, String, Text
from datetime import datetime
from app.core.database import Base


class PlannedShift(Base):
    __tablename__ = "planned_shifts"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    date = Column(Date, nullable=False)
    start_time = Column(String, nullable=False)
    end_time = Column(String, nullable=False)
    role = Column(String, default="")
    notes = Column(Text, default="")
    branch_id = Column(Integer, ForeignKey("branches.id"), nullable=True)
    status = Column(String, default="scheduled")
    created_by = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.now)
