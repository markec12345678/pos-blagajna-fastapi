from pydantic import BaseModel
from typing import Optional


class CreatePool(BaseModel):
    date: Optional[str] = None
    branch_id: Optional[int] = None
    method: str = "by_hours"


class PayDistributions(BaseModel):
    user_ids: Optional[list[int]] = None
