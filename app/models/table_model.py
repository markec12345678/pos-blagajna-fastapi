from sqlalchemy import Column, Integer, String, Boolean, ForeignKey
from app.core.database import Base


class TableModel(Base):
    __tablename__ = "tables"

    id = Column(Integer, primary_key=True, index=True)
    number = Column(Integer, nullable=False)
    name = Column(String, nullable=False)
    capacity = Column(Integer, default=4)
    status = Column(String, default="free")
    pos_x = Column(Integer, default=0)
    pos_y = Column(Integer, default=0)
    shape = Column(String, default="circle")
    branch_id = Column(Integer, ForeignKey("branches.id"), nullable=True)
