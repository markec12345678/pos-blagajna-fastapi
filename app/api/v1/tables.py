from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.table_model import TableModel
from app.models.order import Order
from app.schemas.table import TableCreate, TableUpdate, TableOut
from datetime import datetime
from app.core.cache import cached, invalidate

router = APIRouter(prefix="/tables", tags=["tables"])


@cached(ttl=60, key_prefix="tables")
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
def create_table(data: TableCreate, db: Session = Depends(get_db)):
    max_num = db.query(TableModel.number).order_by(TableModel.number.desc()).first()
    num = data.number or ((max_num[0] + 1) if max_num else 1)
    table = TableModel(
        number=num,
        name=data.name or f"Miza {num}",
        capacity=data.capacity,
        status="free",
        pos_x=data.pos_x,
        pos_y=data.pos_y,
        shape=data.shape,
        branch_id=data.branch_id
    )
    db.add(table)
    db.commit()
    invalidate("tables")
    db.refresh(table)
    return TableOut.model_validate(table)


@router.put("/{table_id}")
def update_table(table_id: int, data: TableUpdate, db: Session = Depends(get_db)):
    table = db.query(TableModel).filter(TableModel.id == table_id).first()
    if not table:
        raise HTTPException(404, "Table not found")
    if data.name is not None:
        table.name = data.name
    if data.capacity is not None:
        table.capacity = data.capacity
    if data.pos_x is not None:
        table.pos_x = data.pos_x
    if data.pos_y is not None:
        table.pos_y = data.pos_y
    if data.shape is not None:
        table.shape = data.shape
    db.commit()
    invalidate("tables")
    return TableOut.model_validate(table)


@router.delete("/{table_id}")
def delete_table(table_id: int, db: Session = Depends(get_db)):
    table = db.query(TableModel).filter(TableModel.id == table_id).first()
    if not table:
        raise HTTPException(404, "Table not found")
    db.delete(table)
    db.commit()
    invalidate("tables")
    return {"ok": True}


@router.post("/batch-update")
def batch_update_tables(updates: list, db: Session = Depends(get_db)):
    """Množična posodobitev pozicij miz (za floor plan)."""
    for update in updates:
        table_id = update.get("id")
        if not table_id:
            continue
        table = db.query(TableModel).filter(TableModel.id == table_id).first()
        if table:
            if "pos_x" in update:
                table.pos_x = update["pos_x"]
            if "pos_y" in update:
                table.pos_y = update["pos_y"]
            if "shape" in update:
                table.shape = update["shape"]
            if "capacity" in update:
                table.capacity = update["capacity"]
    db.commit()
    invalidate("tables")
    return {"message": f"Posodobljenih {len(updates)} miz"}


@router.get("/floor-plan")
def get_floor_plan(branch_id: int = 0, db: Session = Depends(get_db)):
    """Vrni tla načrt z vsemi mizami."""
    q = db.query(TableModel).order_by(TableModel.number)
    if branch_id:
        q = q.filter(TableModel.branch_id == branch_id)

    tables = q.all()

    # Get current orders for occupied tables
    from app.models.order import Order
    table_orders = {}
    occupied_ids = [t.id for t in tables if t.status != "free"]
    if occupied_ids:
        orders = db.query(Order).filter(
            Order.table_id.in_(occupied_ids),
            Order.status.in_(["open", "held"])
        ).all()
        for o in orders:
            if o.table_id not in table_orders:
                table_orders[o.table_id] = []
            table_orders[o.table_id].append({
                "order_id": o.id,
                "customer_name": o.customer_name,
                "total": o.total,
                "created_at": o.created_at.isoformat() if o.created_at else None,
            })

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
            "id": t.id,
            "number": t.number,
            "name": t.name,
            "capacity": t.capacity,
            "status": t.status,
            "pos_x": t.pos_x or 0,
            "pos_y": t.pos_y or 0,
            "shape": t.shape or "square",
            "occupied_minutes": occupied_minutes,
            "orders": table_orders.get(t.id, []),
        })

    return {"tables": result}


@router.post("/layout")
def save_layout(layout: dict, db: Session = Depends(get_db)):
    """Shrani postavitev talnega načrta."""
    tables_data = layout.get("tables", [])
    for t_data in tables_data:
        table_id = t_data.get("id")
        if not table_id:
            continue
        table = db.query(TableModel).filter(TableModel.id == table_id).first()
        if table:
            table.pos_x = t_data.get("pos_x", table.pos_x)
            table.pos_y = t_data.get("pos_y", table.pos_y)
            table.shape = t_data.get("shape", table.shape)
    db.commit()
    invalidate("tables")
    return {"message": "Postavitev shranjena"}


@router.post("/transfer")
def transfer_table(
    from_table_id: int,
    to_table_id: int,
    db: Session = Depends(get_db)
):
    """Prenesi naročilo iz ene mize v drugo."""
    from app.models.order import Order

    # Get open orders from source table
    orders = db.query(Order).filter(
        Order.table_id == from_table_id,
        Order.status.in_(["open", "held"])
    ).all()

    if not orders:
        return {"error": "Ni odprtih naročil na izvorni mizi"}

    # Check target table availability
    target = db.query(TableModel).filter(TableModel.id == to_table_id).first()
    if not target:
        return {"error": "Ciljna miza ni najdena"}

    if target.status != "free":
        # Check if we can merge
        target_orders = db.query(Order).filter(
            Order.table_id == to_table_id,
            Order.status.in_(["open", "held"])
        ).count()
        if target_orders > 0:
            return {"error": "Ciljna miza je zasedena"}

    # Transfer orders
    for order in orders:
        order.table_id = to_table_id

    # Update table statuses
    source = db.query(TableModel).filter(TableModel.id == from_table_id).first()
    if source:
        source.status = "free"
    target.status = "occupied"

    db.commit()
    invalidate("tables")

    return {
        "message": f"Prenesenih {len(orders)} naročil iz {source.name if source else 'miza'} v {target.name}",
        "transferred_orders": len(orders),
    }
