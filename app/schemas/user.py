from pydantic import BaseModel, ConfigDict, Field
from typing import Literal, Optional

VALID_ROLES = Literal["admin", "manager", "cashier", "waiter", "kitchen", "staff"]


class UserCreate(BaseModel):
    username: str = Field(min_length=2)
    password: str = Field(min_length=4)
    full_name: Optional[str] = None
    role: VALID_ROLES = "cashier"
    pin_code: Optional[str] = None


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    role: Optional[VALID_ROLES] = None
    password: Optional[str] = None
    pin_code: Optional[str] = None


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    username: str
    full_name: Optional[str] = None
    role: str
