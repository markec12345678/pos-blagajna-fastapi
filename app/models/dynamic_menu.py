from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, ForeignKey, Date
from datetime import datetime
from app.core.database import Base


class DynamicMenuSuggestion(Base):
    __tablename__ = "dynamic_menu_suggestions"

    id = Column(Integer, primary_key=True, index=True)
    menu_item_id = Column(Integer, ForeignKey("menu_items.id"), nullable=False, index=True)
    suggestion_type = Column(String, nullable=False)  # daily_special, expiring, overstocked, trending, weather
    original_price = Column(Float, nullable=False)
    suggested_price = Column(Float, nullable=True)
    discount_pct = Column(Float, default=0)
    reason = Column(String, default="")
    valid_from = Column(DateTime, nullable=True)
    valid_to = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True)
    applied_count = Column(Integer, default=0)
    branch_id = Column(Integer, ForeignKey("branches.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.now)


class MenuItemDemand(Base):
    __tablename__ = "menu_item_demand"

    id = Column(Integer, primary_key=True, index=True)
    menu_item_id = Column(Integer, ForeignKey("menu_items.id"), nullable=False, index=True)
    day_of_week = Column(Integer, nullable=False)  # 0=Mon, 6=Sun
    hour = Column(Integer, nullable=False)  # 0-23
    order_count = Column(Integer, default=0)
    total_quantity = Column(Integer, default=0)
    avg_prep_time = Column(Float, default=0)
    last_updated = Column(DateTime, default=datetime.now, onupdate=datetime.now)


class WeatherCache(Base):
    __tablename__ = "weather_cache"

    id = Column(Integer, primary_key=True, index=True)
    temperature = Column(Float, nullable=True)
    condition = Column(String, default="")  # sunny, rainy, cloudy, hot, cold
    humidity = Column(Float, default=0)
    fetched_at = Column(DateTime, default=datetime.now)
