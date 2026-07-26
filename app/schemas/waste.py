from pydantic import BaseModel
from typing import Optional


class WasteCreate(BaseModel):
    ingredient_id: int
    quantity: float
    cost: Optional[float] = None
    reason: str = "spoilage"
    notes: str = ""
    user_id: Optional[int] = None
