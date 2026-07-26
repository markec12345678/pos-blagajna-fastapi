from pydantic import BaseModel, Field
from typing import List, Optional


class PublicOrderItem(BaseModel):
    menu_item_id: int
    quantity: int = Field(gt=0, le=999)
    notes: str = ""


class CreatePublicOrder(BaseModel):
    table_id: int
    customer_name: str = "Guest"
    items: List[PublicOrderItem] = Field(min_length=1)


class CreateKioskOrder(BaseModel):
    branch_id: int
    customer_name: str = ""
    items: List[PublicOrderItem]


class OnlineOrderItem(BaseModel):
    menu_item_id: int
    quantity: int = Field(gt=0, le=999)
    modifier_option_ids: List[int] = []
    notes: str = ""


class CreateOnlineOrder(BaseModel):
    branch_id: int
    customer_name: str = "Guest"
    customer_phone: str = ""
    customer_email: str = ""
    order_type: str = "takeaway"
    delivery_address: str = ""
    delivery_notes: str = ""
    token: str = ""
    items: List[OnlineOrderItem]


class CustomerRegister(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    phone: str = ""
    email: str = ""
    password: str = Field(min_length=4, max_length=128)


class CustomerLogin(BaseModel):
    phone: str = Field(min_length=3)
    password: str = Field(min_length=1)


class CustomerUpdateProfile(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None


class TablePay(BaseModel):
    tip: float = Field(ge=0, le=1000)
    method: str = "card"


class PublicReservation(BaseModel):
    customer_name: str = Field(min_length=1, max_length=200)
    customer_phone: str = ""
    customer_email: str = ""
    guests: int = Field(gt=0, le=100, default=2)
    reservation_time: str
    notes: str = ""
    branch_id: int = 0


class TableServiceRequest(BaseModel):
    type: str = "waiter"
    message: str = ""
