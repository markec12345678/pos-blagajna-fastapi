from sqlalchemy import Column, Integer, String, Float, DateTime, Date, ForeignKey
from datetime import datetime
from app.core.database import Base


class Expense(Base):
    __tablename__ = "expenses"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    amount = Column(Float, nullable=False)
    category = Column(String, default="other")
    expense_date = Column(Date, default=datetime.now)
    notes = Column(String, default="")
    branch_id = Column(Integer, ForeignKey("branches.id"), nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.now)
