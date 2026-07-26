from pydantic import BaseModel
from typing import Optional


class ExpenseCreate(BaseModel):
    name: str
    amount: float
    category: str = "other"
    expense_date: Optional[str] = None
    notes: str = ""
    branch_id: Optional[int] = None
    created_by: Optional[int] = None


class ExpenseUpdate(BaseModel):
    name: Optional[str] = None
    amount: Optional[float] = None
    category: Optional[str] = None
    expense_date: Optional[str] = None
    notes: Optional[str] = None
