from pydantic import BaseModel, ConfigDict
from typing import Optional


class CategoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    sort_order: int


class MenuItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    description: Optional[str] = None
    price: float
    combo_price: Optional[float] = None
    category_id: int
    course_id: Optional[int] = None
    is_active: bool
    is_favorite: bool = False
    is_combo: bool = False
    is_out_of_stock: bool = False
    plu_code: Optional[str] = None
    image_url: Optional[str] = None
    allergens: Optional[str] = None
    tags: Optional[str] = None
    tax_rate: float = 0
    translations: Optional[str] = None


class MenuItemCreate(BaseModel):
    name: str
    description: Optional[str] = None
    price: float
    category_id: int


class CategoryWithItems(BaseModel):
    id: int
    name: str
    sort_order: int
    items: list[MenuItemOut]
