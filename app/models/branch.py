from sqlalchemy import Column, Integer, String, Boolean
from app.core.database import Base


class Branch(Base):
    __tablename__ = "branches"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    address = Column(String, default="")
    phone = Column(String, default="")
    email = Column(String, default="")
    is_active = Column(Boolean, default=True)
