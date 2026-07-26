from pydantic import BaseModel
from typing import Optional


class RatingSubmit(BaseModel):
    score: int
    order_id: Optional[int] = None
    branch_id: Optional[int] = None
    customer_name: str = ""
    food_quality: Optional[int] = None
    service_quality: Optional[int] = None
    ambiance: Optional[int] = None
    comment: Optional[str] = None
