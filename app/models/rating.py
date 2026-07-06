from sqlalchemy import Column, Integer, String, Float, DateTime, Text
from app.core.database import Base
from datetime import datetime


class Rating(Base):
    __tablename__ = "ratings"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, nullable=True)
    branch_id = Column(Integer, nullable=True)
    customer_name = Column(String, nullable=True)
    score = Column(Integer, nullable=False)  # 1-5
    food_quality = Column(Integer, nullable=True)  # 1-5
    service_quality = Column(Integer, nullable=True)  # 1-5
    ambiance = Column(Integer, nullable=True)  # 1-5
    comment = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.now)
