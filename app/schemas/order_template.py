from pydantic import BaseModel
from typing import Optional


class CreateTemplate(BaseModel):
    name: str
    items: list[dict]
    category: str = ""


class UpdateTemplate(BaseModel):
    name: Optional[str] = None
    items: Optional[list[dict]] = None
    category: Optional[str] = None


class ApplyTemplate(BaseModel):
    table_id: int
    order_type: str = "dine-in"
    cashier_id: int = 1
    customer_name: str = ""
    branch_id: Optional[int] = None
