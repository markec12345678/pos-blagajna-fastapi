from pydantic import BaseModel
from typing import Optional


class OpenRegister(BaseModel):
    user_id: int = 1
    balance: float = 100


class CloseRegister(BaseModel):
    closing_balance: float = 0


class AddMovement(BaseModel):
    amount: float = 0
    reason: str = ""
    type: str = "in"
