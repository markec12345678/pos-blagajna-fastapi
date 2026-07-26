from pydantic import BaseModel, Field
from typing import Optional


class IngredientCreate(BaseModel):
    name: str = Field(min_length=1)
    unit: str = "kos"
    category: str = "food"
    stock: float = 0
    min_stock: float = 0
    cost_per_unit: float = 0
    supplier_id: Optional[int] = None
    barcode: str = ""


class IngredientUpdate(BaseModel):
    name: Optional[str] = None
    unit: Optional[str] = None
    category: Optional[str] = None
    min_stock: Optional[float] = None
    cost_per_unit: Optional[float] = None
    supplier_id: Optional[int] = None
    barcode: Optional[str] = None


class AddStock(BaseModel):
    ingredient_id: int
    quantity: float = Field(gt=0)
    type: str = "purchase"
    note: str = ""


class RecordWaste(BaseModel):
    ingredient_id: int
    quantity: float
    reason: str = "Odpis"


class DeductItem(BaseModel):
    menu_item_id: int
    quantity: int = Field(gt=0, default=1)


class DeductIngredients(BaseModel):
    items: list[DeductItem]
    order_id: Optional[int] = None


class RecipeCreate(BaseModel):
    menu_item_id: int
    ingredient_id: int
    quantity: float = Field(gt=0)


class StockCountSessionCreate(BaseModel):
    branch_id: Optional[int] = None
    counted_by: Optional[str] = None
    notes: str = ""


class StockCountItemUpdate(BaseModel):
    physical_quantity: Optional[float] = None
    notes: Optional[str] = None
