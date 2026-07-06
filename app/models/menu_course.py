from sqlalchemy import Column, Integer, String
from app.core.database import Base


class MenuCourse(Base):
    __tablename__ = "menu_courses"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    sort_order = Column(Integer, default=0)
