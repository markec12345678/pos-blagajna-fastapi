from pydantic import BaseModel


class ItemStatusUpdate(BaseModel):
    status: str = "preparing"
