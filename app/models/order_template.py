from sqlalchemy import Column, Integer, String, DateTime, Text
from datetime import datetime
from app.core.database import Base


class OrderTemplate(Base):
    __tablename__ = "order_templates"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    items_json = Column(Text, nullable=False)  # JSON array of {menu_item_id, quantity, modifiers, notes}
    category = Column(String, default="")  # e.g. "zajtrk", "kosilo", "vecerja"
    created_at = Column(DateTime, default=datetime.now)
