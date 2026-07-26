from pydantic import BaseModel
from typing import Optional


class CreateShift(BaseModel):
    user_id: int
    date: str
    start_time: str
    end_time: str
    role: str = ""
    notes: str = ""
    branch_id: Optional[int] = None
    created_by: Optional[int] = None


class UpdateShift(BaseModel):
    user_id: Optional[int] = None
    date: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    role: Optional[str] = None
    notes: Optional[str] = None
    branch_id: Optional[int] = None
    status: Optional[str] = None
