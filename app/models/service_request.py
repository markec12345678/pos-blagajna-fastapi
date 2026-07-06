from sqlalchemy import Column, Integer, String, DateTime, Boolean
from datetime import datetime
from app.core.database import Base


class ServiceRequest(Base):
    __tablename__ = "service_requests"
    id = Column(Integer, primary_key=True, index=True)
    table_id = Column(Integer, nullable=False)
    table_name = Column(String, default="")
    request_type = Column(String, nullable=False)  # waiter, bill, help, order, other
    message = Column(String, default="")
    status = Column(String, default="pending")  # pending, acknowledged, completed
    created_at = Column(DateTime, default=datetime.now)
    acknowledged_at = Column(DateTime, nullable=True)
    acknowledged_by = Column(Integer, nullable=True)
