from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.table_model import TableModel
from app.models.order import Order
from app.schemas.table import TableOut
from datetime import datetime

router = APIRouter(prefix="/tables", tags=["tables"])


@router.get("")
def get_tables(branch_id: int = 0, db: Session = Depends(get_db)):
    q = db.query(TableModel).order_by(TableModel.number)
    if branch_id:
        q = q.filter(TableModel.branch_id == branch_id)
    tables = q.all()
    result = []
    for t in tables:
        occupied_minutes = 0
        if t.status != "free":
            order = db.query(Order).filter(
                Order.table_id == t.id, Order.status.in_(["open", "held"])
            ).order_by(Order.created_at.asc()).first()
            if order:
                occupied_minutes = round((datetime.now() - order.created_at).total_seconds() / 60)
        result.append({
            "id": t.id, "number": t.number, "name": t.name,
            "capacity": t.capacity, "status": t.status,
            "pos_x": t.pos_x, "pos_y": t.pos_y, "shape": t.shape,
            "occupied_minutes": occupied_minutes
        })
    return result


@router.post("")
def create_table(data: dict, db: Session = Depends(get_db)):
    max_num = db.query(TableModel.number).order_by(TableModel.number.desc()).first()
    num = data.get("number", (max_num[0] + 1) if max_num else 1)
    table = TableModel(
        number=num,
        name=data.get("name", f"Miza {num}"),
        capacity=data.get("capacity", 4),
        status="free",
        pos_x=data.get("pos_x", 0),
        pos_y=data.get("pos_y", 0),
        shape=data.get("shape", "circle"),
        branch_id=data.get("branch_id")
    )
    db.add(table)
    db.commit()
    db.refresh(table)
    return TableOut.model_validate(table)


@router.put("/{table_id}")
def update_table(table_id: int, data: dict, db: Session = Depends(get_db)):
    table = db.query(TableModel).filter(TableModel.id == table_id).first()
    if not table:
        raise HTTPException(404, "Table not found")
    if "name" in data:
        table.name = data["name"]
    if "capacity" in data:
        table.capacity = data["capacity"]
    if "pos_x" in data:
        table.pos_x = data["pos_x"]
    if "pos_y" in data:
        table.pos_y = data["pos_y"]
    if "shape" in data:
        table.shape = data["shape"]
    db.commit()
    return TableOut.model_validate(table)


@router.delete("/{table_id}")
def delete_table(table_id: int, db: Session = Depends(get_db)):
    table = db.query(TableModel).filter(TableModel.id == table_id).first()
    if not table:
        raise HTTPException(404, "Table not found")
    db.delete(table)
    db.commit()
    return {"ok": True}
