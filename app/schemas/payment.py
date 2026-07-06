from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime


class PaymentRequest(BaseModel):
    order_id: int
    amount: float
    method: str
    tip: float = 0
    reference: Optional[str] = None


class PaymentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    order_id: int
    amount: float
    method: str
    tip: float = 0
    reference: Optional[str] = None
    created_at: datetime
