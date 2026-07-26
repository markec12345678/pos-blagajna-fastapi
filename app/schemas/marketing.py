from pydantic import BaseModel
from typing import Optional


class PreviewSegment(BaseModel):
    segment_filter: dict = {}
    branch_id: int = 0


class CreateCampaign(BaseModel):
    name: str
    type: str = "email"
    subject: str = ""
    content: str = ""
    segment_filter: dict = {}
    scheduled_at: Optional[str] = None
    created_by: Optional[int] = None
    branch_id: Optional[int] = None


class UpdateCampaign(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    subject: Optional[str] = None
    content: Optional[str] = None
    status: Optional[str] = None
    segment_filter: Optional[dict] = None
    scheduled_at: Optional[str] = None


class SendSmsSingle(BaseModel):
    phone: str
    message: str
