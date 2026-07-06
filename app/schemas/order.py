from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime


class OrderItemCreate(BaseModel):
    menu_item_id: int
    quantity: int
    notes: str = ""
    modifiers: str = "[]"


class OrderCreate(BaseModel):
    table_id: int
    order_type: str = "dine-in"
    customer_name: Optional[str] = None
    customer_id: Optional[int] = None
    branch_id: Optional[int] = None
    items: list[OrderItemCreate]
    scheduled_at: Optional[str] = None  # ISO datetime string for scheduled orders
    notes: str = ""


class OrderItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    menu_item_id: int
    item_name: str
    quantity: int
    unit_price: float
    total_price: float
    status: str
    notes: str = ""
    modifiers: str = "[]"


class OrderOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    invoice_number: Optional[int] = None
    order_type: str = "dine-in"
    table_id: int
    cashier_id: int
    customer_name: Optional[str] = None
    customer_id: Optional[int] = None
    status: str = "open"
    total: float
    discount_type: Optional[str] = None
    discount_value: float = 0
    discount_amount: float = 0
    cancel_reason: Optional[str] = None
    created_at: datetime
    closed_at: Optional[datetime] = None
    scheduled_at: Optional[datetime] = None
    notes: str = ""
    tags: str = "[]"
    items: list[OrderItemOut]
