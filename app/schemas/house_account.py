from pydantic import BaseModel
from typing import Optional


class CreateHouseAccount(BaseModel):
    customer_id: int
    credit_limit: float = 0
    notes: str = ""


class UpdateHouseAccount(BaseModel):
    credit_limit: Optional[float] = None
    status: Optional[str] = None
    notes: Optional[str] = None


class ChargeHouseAccount(BaseModel):
    amount: float = 0
    order_id: Optional[int] = None
    description: str = "Charge"


class PayHouseAccount(BaseModel):
    amount: float = 0
    description: str = "Payment"
