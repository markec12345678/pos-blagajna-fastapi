from pydantic import BaseModel
from typing import Optional


class PriceRuleCreate(BaseModel):
    price: float
    menu_item_id: Optional[int] = None
    day_of_week: Optional[int] = None
    time_from: Optional[str] = None
    time_to: Optional[str] = None
    order_type: Optional[str] = None
    label: str = ""
    is_active: bool = True
    branch_id: Optional[int] = None


class PriceRuleUpdate(BaseModel):
    menu_item_id: Optional[int] = None
    day_of_week: Optional[int] = None
    time_from: Optional[str] = None
    time_to: Optional[str] = None
    price: Optional[float] = None
    order_type: Optional[str] = None
    label: Optional[str] = None
    is_active: Optional[bool] = None
    branch_id: Optional[int] = None
