from pydantic import BaseModel, ConfigDict


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
