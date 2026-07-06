from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, DateTime, Table
from app.core.database import Base

class MenuVersion(Base):
    __tablename__ = "menu_versions"
    
    id = Column(Integer, primary_key=True, index=True)
    item_id = Column(Integer, ForeignKey("menu_items.id"), nullable=False)
    price = Column(Float, nullable=False)
    valid_from = Column(DateTime, nullable=True)
    valid_to = Column(DateTime, nullable=True)
    branch_id = Column(Integer, ForeignKey("branches.id"), nullable=True)


class MenuItem(Base):
    __tablename__ = "menu_items"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(String)
    price = Column(Float, nullable=False)
    combo_price = Column(Float, nullable=True)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=False)
    course_id = Column(Integer, ForeignKey("menu_courses.id"), nullable=True)
    is_active = Column(Boolean, default=True)
    is_favorite = Column(Boolean, default=False)
    is_combo = Column(Boolean, default=False)
    is_out_of_stock = Column(Boolean, default=False)
    plu_code = Column(String, nullable=True, index=True)
    branch_id = Column(Integer, ForeignKey("branches.id"), nullable=True)
    image_url = Column(String, nullable=True, default=None)
    tax_rate = Column(Float, default=0)
    allergens = Column(String, nullable=True, default=None)
    tags = Column(String, nullable=True, default=None)
    translations = Column(String, nullable=True, default=None)
    calories = Column(Integer, nullable=True, default=None)
    protein = Column(Float, nullable=True, default=None)
    fat = Column(Float, nullable=True, default=None)
    carbs = Column(Float, nullable=True, default=None)


class ComboItem(Base):
    __tablename__ = "combo_items"
    id = Column(Integer, primary_key=True, index=True)
    combo_id = Column(Integer, ForeignKey("menu_items.id"), nullable=False)
    item_id = Column(Integer, ForeignKey("menu_items.id"), nullable=False)
    quantity = Column(Integer, default=1)


class CrossSellItem(Base):
    __tablename__ = "cross_sell_items"
    id = Column(Integer, primary_key=True, index=True)
    item_id = Column(Integer, ForeignKey("menu_items.id"), nullable=False)
    suggested_id = Column(Integer, ForeignKey("menu_items.id"), nullable=False)
    type = Column(String, default="cross-sell")  # cross-sell, upsell, substitute
