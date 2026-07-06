from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.order import Order, OrderItem
from app.models.menu_item import MenuItem
from app.models.menu_course import MenuCourse
from app.models.table_model import TableModel
from datetime import datetime
from app.core.websocket_manager import broadcast
from app.core.notifications import notify_order_status

router = APIRouter(prefix="/kds", tags=["kds"])


@router.get("/orders")
def get_kds_orders(branch_id: int = 0, db: Session = Depends(get_db)):
    q = db.query(Order).filter(Order.status == "open")
    if branch_id:
        q = q.filter(Order.branch_id == branch_id)
    orders = q.all()
    result = []
    courses = {c.id: c.name for c in db.query(MenuCourse).all()}
    for o in orders:
        table = db.query(TableModel).filter(TableModel.id == o.table_id).first()
        items = []
        for i in o.items:
            elapsed = (datetime.now() - o.created_at).total_seconds() / 60
            mi = db.query(MenuItem).filter(MenuItem.id == i.menu_item_id).first()
            cid = mi.course_id if mi and mi.course_id else 0
            cname = courses.get(cid, "Ostalo")
            prep_time = None
            if i.started_at and i.completed_at:
                prep_time = round((i.completed_at - i.started_at).total_seconds() / 60, 1)
            elif i.started_at:
                prep_time = round((datetime.now() - i.started_at).total_seconds() / 60, 1)
            items.append({
                "id": i.id, "item_name": i.item_name, "quantity": i.quantity,
                "status": i.status, "notes": i.notes or "", "modifiers": i.modifiers or "[]",
                "elapsed_minutes": round(elapsed, 1),
                "prep_time": prep_time,
                "started_at": i.started_at.isoformat() if i.started_at else None,
                "completed_at": i.completed_at.isoformat() if i.completed_at else None,
                "course_id": cid, "course_name": cname,
            })
        items.sort(key=lambda x: (x["course_id"] if x["course_id"] else 99, x["item_name"]))
        result.append({
            "order_id": o.id, "order_type": o.order_type or "dine-in",
            "table_name": table.name if table else f"Miza {o.table_id}",
            "customer_name": o.customer_name or "",
            "items": items, "created_at": o.created_at.isoformat(),
            "elapsed_minutes": round((datetime.now() - o.created_at).total_seconds() / 60, 1),
            "item_count": sum(it.quantity for it in o.items),
            "notes": o.notes or "", "tags": o.tags or "[]",
        })
    return result


@router.post("/items/{item_id}/status")
def update_item_status(item_id: int, data: dict, db: Session = Depends(get_db)):
    item = db.query(OrderItem).filter(OrderItem.id == item_id).first()
    if not item:
        return {"error": "Item not found"}
    new_status = data.get("status", "preparing")
    now = datetime.now()
    item.status = new_status
    if new_status == "preparing" and not item.started_at:
        item.started_at = now
    if new_status in ("ready", "served") and not item.completed_at:
        item.completed_at = now
    db.commit()
    broadcast("item_status", {"item_id": item.id, "status": item.status, "order_id": item.order_id})
    # Notify customer on key status changes
    if new_status in ("preparing", "ready"):
        notify_order_status(db, item.order_id, new_status)
    return {"id": item.id, "status": item.status}


@router.get("/analytics")
def kds_analytics(days: int = 7, branch_id: int = 0, db: Session = Depends(get_db)):
    from datetime import timedelta
    since = datetime.now() - timedelta(days=days)
    q = db.query(OrderItem).join(Order).filter(Order.created_at >= since, OrderItem.completed_at != None, OrderItem.started_at != None)
    if branch_id:
        q = q.filter(Order.branch_id == branch_id)

    items = q.all()
    total_items = len(items)
    if total_items == 0:
        return {"total_items": 0, "avg_prep_time": 0, "by_item": [], "by_course": [], "by_hour": []}

    by_item: dict = {}
    by_course: dict = {}
    by_hour: dict = {}
    total_prep = 0

    for i in items:
        prep = (i.completed_at - i.started_at).total_seconds() / 60
        total_prep += prep
        o = db.query(Order).filter(Order.id == i.order_id).first() if i.order_id else None

        mi = db.query(MenuItem).filter(MenuItem.id == i.menu_item_id).first()
        iname = mi.name if mi else i.item_name

        if iname not in by_item:
            by_item[iname] = {"name": iname, "count": 0, "total_prep": 0}
        by_item[iname]["count"] += 1
        by_item[iname]["total_prep"] += prep

        cid = "Ostalo"
        if mi and mi.course_id:
            c = db.query(MenuCourse).filter(MenuCourse.id == mi.course_id).first()
            cid = c.name if c else "Ostalo"
        if cid not in by_course:
            by_course[cid] = {"name": cid, "count": 0, "total_prep": 0}
        by_course[cid]["count"] += 1
        by_course[cid]["total_prep"] += prep

        hour = i.started_at.hour if i.started_at else 0
        hk = f"{hour:02d}:00"
        if hk not in by_hour:
            by_hour[hk] = {"hour": hk, "count": 0, "total_prep": 0}
        by_hour[hk]["count"] += 1
        by_hour[hk]["total_prep"] += prep

    def avg(d):
        for v in d.values():
            v["avg_min"] = round(v["total_prep"] / v["count"], 1)
        return sorted(d.values(), key=lambda x: x["avg_min"], reverse=True)

    return {
        "total_items": total_items,
        "avg_prep_time": round(total_prep / total_items, 1),
        "by_item": avg(by_item)[:20],
        "by_course": avg(by_course),
        "by_hour": sorted(by_hour.values(), key=lambda x: x["hour"]),
    }
