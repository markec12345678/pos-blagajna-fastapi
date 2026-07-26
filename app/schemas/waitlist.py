from pydantic import BaseModel
from typing import Optional


class AddWaitlist(BaseModel):
    name: str
    phone: Optional[str] = None
    party_size: int = 2
    notes: Optional[str] = None
    branch_id: Optional[int] = None


class PublicAddWaitlist(BaseModel):
    name: str
    phone: Optional[str] = None
    party_size: int = 2
    notes: Optional[str] = None
