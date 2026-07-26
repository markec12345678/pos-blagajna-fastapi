from pydantic import BaseModel, ConfigDict
from typing import Optional


class TableCreate(BaseModel):
    number: Optional[int] = None
    name: Optional[str] = None
    capacity: int = 4
    pos_x: int = 0
    pos_y: int = 0
    shape: str = "circle"
    branch_id: Optional[int] = None


class TableUpdate(BaseModel):
    name: Optional[str] = None
    capacity: Optional[int] = None
    pos_x: Optional[int] = None
    pos_y: Optional[int] = None
    shape: Optional[str] = None


class TableOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    number: int
    name: str
    capacity: int
    status: str
    pos_x: int = 0
    pos_y: int = 0
    shape: str = "circle"
