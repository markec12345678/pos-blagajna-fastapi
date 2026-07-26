from pydantic import BaseModel
from typing import Optional


class CreateGiftCard(BaseModel):
    code: Optional[str] = None
    balance: float = 0
    expires_at: Optional[str] = None
    notes: str = ""


class RedeemGiftCard(BaseModel):
    code: str
    amount: float = 0
    reference: str = ""


class UpdateGiftCard(BaseModel):
    balance: Optional[float] = None
    active: Optional[bool] = None
    notes: Optional[str] = None


class TopupGiftCard(BaseModel):
    amount: float = 0
    reference: str = ""


class BatchGenerateGiftCards(BaseModel):
    count: int = 1
    balance: float = 0
    expires_at: Optional[str] = None
    notes: str = ""
