from pydantic import BaseModel
from typing import Optional


class ModifierGroupCreate(BaseModel):
    name: str
    min_select: int = 0
    max_select: int = 1
    is_required: bool = False


class ModifierGroupUpdate(BaseModel):
    name: Optional[str] = None
    min_select: Optional[int] = None
    max_select: Optional[int] = None
    is_required: Optional[bool] = None
    sort_order: Optional[int] = None


class ModifierOptionCreate(BaseModel):
    group_id: int
    name: str
    price_impact: float = 0
    ingredient_id: Optional[int] = None
    ingredient_quantity: float = 0


class ModifierOptionUpdate(BaseModel):
    name: Optional[str] = None
    price_impact: Optional[float] = None
    ingredient_id: Optional[int] = None
    ingredient_quantity: Optional[float] = None
    sort_order: Optional[int] = None


class ModifierLink(BaseModel):
    menu_item_id: int
    group_id: int
