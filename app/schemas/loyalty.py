from pydantic import BaseModel
from typing import Optional


class SetLoyaltySettings(BaseModel):
    loyalty_rate: Optional[str] = None
    loyalty_min_redeem: Optional[str] = None
    loyalty_redeem_rate: Optional[str] = None
    loyalty_birthday_bonus: Optional[str] = None
    loyalty_welcome_bonus: Optional[str] = None


class RedeemPoints(BaseModel):
    customer_id: int
    points: int
    order_id: Optional[int] = None


class AdjustPoints(BaseModel):
    customer_id: int
    points: int
    note: str = ""


class SetTiers(BaseModel):
    tiers: list[dict] = []
