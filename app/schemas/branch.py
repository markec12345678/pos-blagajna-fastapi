from pydantic import BaseModel
from typing import Optional


class BranchCreate(BaseModel):
    name: str
    address: str = ""
    phone: str = ""
    email: str = ""
    is_active: bool = True


class BranchUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    is_active: Optional[bool] = None
