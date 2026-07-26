from pydantic import BaseModel, ConfigDict, Field
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
    name: str = Field(min_length=1)
    description: Optional[str] = None
    price: float = Field(gt=0)
    category_id: int


class CategoryWithItems(BaseModel):
    id: int
    name: str
    sort_order: int
    items: list[MenuItemOut]


class CategoryCreate(BaseModel):
    name: str = Field(min_length=1)
    branch_id: Optional[int] = None


class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    sort_order: Optional[int] = None


class MenuItemUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = Field(default=None, gt=0)
    category_id: Optional[int] = None
    is_active: Optional[bool] = None
    is_favorite: Optional[bool] = None
    course_id: Optional[int] = None
    is_out_of_stock: Optional[bool] = None
    is_combo: Optional[bool] = None
    branch_id: Optional[int] = None
    image_url: Optional[str] = None
    allergens: Optional[str] = None
    tags: Optional[str] = None
    translations: Optional[str] = None
    tax_rate: Optional[float] = None
    calories: Optional[int] = None
    protein: Optional[float] = None
    fat: Optional[float] = None
    carbs: Optional[float] = None
    plu_code: Optional[str] = None
    combo_price: Optional[float] = None


class ComboItemAdd(BaseModel):
    item_id: int
    quantity: int = Field(gt=0, default=1)


class MenuVersionCreate(BaseModel):
    item_id: int
    price: float = Field(gt=0)
    valid_from: Optional[str] = None
    valid_to: Optional[str] = None
    branch_id: Optional[int] = None


class BulkAction(BaseModel):
    action: str
    category_id: Optional[int] = None
    value: Optional[str] = None
    course_id: Optional[int] = None


class CrossSellCreate(BaseModel):
    item_id: int
    suggested_id: int
    type: str = "cross-sell"
