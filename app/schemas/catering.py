from pydantic import BaseModel
from typing import Optional


class CreateCatering(BaseModel):
    customer_name: str
    customer_phone: str = ""
    customer_email: str = ""
    event_type: str = ""
    event_date: str
    event_time: str = ""
    guests: int = 10
    location: str = ""
    menu_details: str = ""
    total: float = 0
    deposit: float = 0
    deposit_paid: float = 0
    status: str = "inquiry"
    notes: str = ""
    branch_id: Optional[int] = None
    created_by: Optional[int] = None


class UpdateCatering(BaseModel):
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    customer_email: Optional[str] = None
    event_type: Optional[str] = None
    event_date: Optional[str] = None
    event_time: Optional[str] = None
    guests: Optional[int] = None
    location: Optional[str] = None
    menu_details: Optional[str] = None
    total: Optional[float] = None
    deposit: Optional[float] = None
    deposit_paid: Optional[float] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    branch_id: Optional[int] = None
