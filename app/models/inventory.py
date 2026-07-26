from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Boolean
from datetime import datetime
from app.core.database import Base


class Ingredient(Base):
    __tablename__ = "ingredients"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    unit = Column(String, nullable=False)
    category = Column(String, default="food")
    stock = Column(Float, default=0)
    min_stock = Column(Float, default=0)
    cost_per_unit = Column(Float, default=0)
    branch_id = Column(Integer, ForeignKey("branches.id"), nullable=True)
    supplier_id = Column(Integer, ForeignKey("suppliers.id"), nullable=True)
    barcode = Column(String, default="")


class RecipeItem(Base):
    __tablename__ = "recipe_items"

    id = Column(Integer, primary_key=True, index=True)
    menu_item_id = Column(Integer, ForeignKey("menu_items.id"), nullable=False, index=True)
    ingredient_id = Column(Integer, ForeignKey("ingredients.id"), nullable=False, index=True)
    quantity = Column(Float, nullable=False)


class StockTransaction(Base):
    __tablename__ = "stock_transactions"

    id = Column(Integer, primary_key=True, index=True)
    ingredient_id = Column(Integer, ForeignKey("ingredients.id"), nullable=False, index=True)
    type = Column(String, nullable=False)
    quantity = Column(Float, nullable=False)
    reference = Column(String, nullable=True)
    note = Column(String)
    created_at = Column(DateTime, default=datetime.now)


class StockCountSession(Base):
    __tablename__ = "stock_count_sessions"

    id = Column(Integer, primary_key=True, index=True)
    counted_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    branch_id = Column(Integer, ForeignKey("branches.id"), nullable=True)
    status = Column(String, default="draft")  # draft, in_progress, completed
    notes = Column(String)
    created_at = Column(DateTime, default=datetime.now)
    completed_at = Column(DateTime, nullable=True)


class StockCountItem(Base):
    __tablename__ = "stock_count_items"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("stock_count_sessions.id"), nullable=False)
    ingredient_id = Column(Integer, ForeignKey("ingredients.id"), nullable=False)
    system_quantity = Column(Float, default=0)
    physical_quantity = Column(Float, nullable=True)
    variance = Column(Float, default=0)
    notes = Column(String)
