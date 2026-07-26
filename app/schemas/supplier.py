from pydantic import BaseModel
from typing import Optional


class CreateSupplier(BaseModel):
    name: str
    contact: str = ""
    phone: str = ""
    email: str = ""
    address: str = ""
    notes: str = ""
    branch_id: Optional[int] = None


class UpdateSupplier(BaseModel):
    name: Optional[str] = None
    contact: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None


class CreateOrder(BaseModel):
    supplier_id: Optional[int] = None
    notes: str = ""
    created_by: Optional[int] = None
    items: list[dict] = []


class ApproveOrder(BaseModel):
    pass


class ReceiveOrder(BaseModel):
    items: Optional[list[dict]] = None
