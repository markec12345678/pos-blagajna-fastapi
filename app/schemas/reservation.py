from pydantic import BaseModel
from typing import Optional


class CreateReservation(BaseModel):
    table_id: Optional[int] = None
    customer_name: str
    customer_phone: str = ""
    customer_email: str = ""
    guests: int = 2
    reservation_time: str
    notes: str = ""
    branch_id: Optional[int] = None


class UpdateReservation(BaseModel):
    table_id: Optional[int] = None
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    customer_email: Optional[str] = None
    guests: Optional[int] = None
    notes: Optional[str] = None
    reservation_time: Optional[str] = None
    status: Optional[str] = None
