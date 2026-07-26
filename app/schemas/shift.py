from pydantic import BaseModel
from typing import Optional


class ClockIn(BaseModel):
    user_id: int
    notes: str = ""


class ClockInByPin(BaseModel):
    pin: str
