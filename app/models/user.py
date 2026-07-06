from sqlalchemy import Column, Integer, String, Boolean, ForeignKey
from app.core.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String)
    role = Column(String, default="staff")
    is_active = Column(Boolean, default=True)
    pin_code = Column(String, nullable=True)
    branch_id = Column(Integer, ForeignKey("branches.id"), nullable=True)
    hourly_rate = Column(Integer, default=0)
