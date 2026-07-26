from pydantic import BaseModel
from typing import Optional


class CreatePromotion(BaseModel):
    name: str
    type: str
    value: float = 0
    min_order: float = 0
    category_id: Optional[int] = None
    buy_qty: int = 0
    free_qty: int = 0
    free_discount_pct: int = 100
    time_start: str = ""
    time_end: str = ""
    days_of_week: str = ""
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    is_active: bool = True
    branch_id: Optional[int] = None
    description: str = ""


class UpdatePromotion(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    value: Optional[float] = None
    min_order: Optional[float] = None
    category_id: Optional[int] = None
    buy_qty: Optional[int] = None
    free_qty: Optional[int] = None
    free_discount_pct: Optional[int] = None
    time_start: Optional[str] = None
    time_end: Optional[str] = None
    days_of_week: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    is_active: Optional[bool] = None
    branch_id: Optional[int] = None
    description: Optional[str] = None


class CalculatePromotion(BaseModel):
    branch_id: Optional[int] = None
    items: list[dict] = []
    total: float = 0
