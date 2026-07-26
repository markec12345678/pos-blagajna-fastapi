from pydantic import BaseModel, Field
from typing import Optional


class CustomerCreate(BaseModel):
    name: str = Field(min_length=1)
    phone: str = ""
    address: str = ""
    email: str = ""
    notes: str = ""
    tags: str = ""
    is_member: bool = False


class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = Field(default=None, min_length=1)
    address: Optional[str] = None
    email: Optional[str] = None
    notes: Optional[str] = None
    tags: Optional[str] = None
    is_member: Optional[bool] = None
    loyalty_points: Optional[int] = None
    branch_id: Optional[int] = None


class RedeemLoyalty(BaseModel):
    points: int = Field(gt=0)
