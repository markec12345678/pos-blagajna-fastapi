from pydantic import BaseModel, ConfigDict, Field
from typing import Literal, Optional
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
    items: list[OrderItemCreate] = []
    scheduled_at: Optional[str] = None
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


class UpdateOrderItem(BaseModel):
    quantity: Optional[int] = Field(default=None, gt=0)
    notes: Optional[str] = None


class UpdateOrderNotes(BaseModel):
    notes: Optional[str] = None
    tags: Optional[str] = None


class CancelOrder(BaseModel):
    reason: str = "Preklicano"


class ApplyDiscount(BaseModel):
    type: Literal["percentage", "fixed"] = "percentage"
    value: float = Field(ge=0)


class AddServiceCharge(BaseModel):
    percentage: float = Field(gt=0, le=100, default=10)


class MoveItems(BaseModel):
    item_ids: list[int] = Field(min_length=1)
    target_order_id: int


class AddOrderItem(BaseModel):
    menu_item_id: int
    quantity: int = Field(gt=0)
    modifiers: str = "[]"
    notes: str = ""


class RefundOrder(BaseModel):
    amount: float = Field(gt=0)
    method: str = "cash"


class SendReceipt(BaseModel):
    email: str = ""


class MergeOrders(BaseModel):
    source_order_id: int


class SplitOrder(BaseModel):
    item_ids: list[int] = Field(min_length=1)
