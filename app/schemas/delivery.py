from pydantic import BaseModel
from typing import List, Optional, Any


class DeliveryItem(BaseModel):
    name: str = ""
    quantity: int = 1
    price: float = 0


class ReceiveDeliveryOrder(BaseModel):
    api_key: str = ""
    external_id: str = ""
    aggregator: str = "unknown"
    customer_name: str = ""
    customer_phone: str = ""
    delivery_address: str = ""
    items: List[DeliveryItem] = []
    total: float = 0
    delivery_fee: float = 0
    service_fee: float = 0
    notes: str = ""


class PushMenuToAggregator(BaseModel):
    aggregator: str = ""


class UpdateDeliveryStatus(BaseModel):
    status: str = ""
