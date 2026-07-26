from pydantic import BaseModel
from typing import Optional


class BudgetCreate(BaseModel):
    month: int
    year: int
    category: str
    amount: float
    notes: str = ""
    created_by: Optional[int] = None


class BudgetUpdate(BaseModel):
    month: Optional[int] = None
    year: Optional[int] = None
    category: Optional[str] = None
    amount: Optional[float] = None
    notes: Optional[str] = None
