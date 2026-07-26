from pydantic import BaseModel
from typing import Optional


class CourseCreate(BaseModel):
    name: str


class CourseUpdate(BaseModel):
    name: Optional[str] = None
    sort_order: Optional[int] = None
