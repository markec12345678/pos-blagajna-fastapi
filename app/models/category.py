from sqlalchemy import Column, Integer, String, ForeignKey
from app.core.database import Base


class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    sort_order = Column(Integer, default=0)
    branch_id = Column(Integer, ForeignKey("branches.id"), nullable=True)
