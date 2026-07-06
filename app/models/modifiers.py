from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, Table
from app.core.database import Base


class ModifierGroup(Base):
    __tablename__ = "modifier_groups"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    min_select = Column(Integer, default=0)
    max_select = Column(Integer, default=1)
    is_required = Column(Boolean, default=False)
    sort_order = Column(Integer, default=0)


class ModifierOption(Base):
    __tablename__ = "modifier_options"
    id = Column(Integer, primary_key=True, index=True)
    group_id = Column(Integer, ForeignKey("modifier_groups.id"), nullable=False)
    name = Column(String, nullable=False)
    price_impact = Column(Float, default=0)
    ingredient_id = Column(Integer, ForeignKey("ingredients.id"), nullable=True)
    ingredient_quantity = Column(Float, default=0)
    sort_order = Column(Integer, default=0)


class MenuItemModifierLink(Base):
    __tablename__ = "menu_item_modifiers"
    id = Column(Integer, primary_key=True, index=True)
    menu_item_id = Column(Integer, ForeignKey("menu_items.id"), nullable=False)
    group_id = Column(Integer, ForeignKey("modifier_groups.id"), nullable=False)
