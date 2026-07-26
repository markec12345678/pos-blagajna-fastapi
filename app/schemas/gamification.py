from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class ChallengeCreate(BaseModel):
    name: str
    description: str = ""
    icon: str = "🏆"
    target: int
    metric: str  # orders, spent, visits, items, categories
    reward_points: int = 0
    reward_badge: Optional[str] = None
    valid_from: Optional[datetime] = None
    valid_to: Optional[datetime] = None
    is_active: bool = True


class ChallengeUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    icon: Optional[str] = None
    target: Optional[int] = None
    metric: Optional[str] = None
    reward_points: Optional[int] = None
    reward_badge: Optional[str] = None
    valid_from: Optional[datetime] = None
    valid_to: Optional[datetime] = None
    is_active: Optional[bool] = None


class BadgeAward(BaseModel):
    customer_id: int
    badge_name: str
    badge_icon: str = "🏅"
    badge_description: str = ""
