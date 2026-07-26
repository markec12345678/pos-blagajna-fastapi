from pydantic import BaseModel
from typing import Optional


class UpdateSalesTargets(BaseModel):
    daily_sales_target: Optional[float] = None
    monthly_sales_target: Optional[float] = None
