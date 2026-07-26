"""Real-time order status tracking."""
from fastapi import APIRouter, Depends, Query, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime, timedelta
import json

from app.core.database import get_db
from app.api.v1.auth import get_current_user

router = APIRouter(prefix="/order-tracking", tags=["Sledenje naročil"])


class OrderStatusUpdate(BaseModel):
    status: str  # pending, preparing, ready, served, completed
    note: Optional[str] = None


# WebSocket connections for order tracking
tracking_connections = {}


@router.websocket("/ws/{order_id}")
async def order_tracking_ws(websocket: WebSocket, order_id: int):
    """WebSocket za sledenje statusu naročila v realnem času."""
    await websocket.accept()
    
    if order_id not in tracking_connections:
        tracking_connections[order_id] = []
    tracking_connections[order_id].append(websocket)
    
    try:
        while True:
            # Keep connection alive and listen for updates
            data = await websocket.receive_text()
            # Client can send ping to keep connection alive
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        tracking_connections[order_id].remove(websocket)
        if not tracking_connections[order_id]:
            del tracking_connections[order_id]


@router.get("/{order_id}")
def get_order_status(order_id: int, db: Session = Depends(get_db)):
    """Vrni status naročila za sledenje."""
    from app.models.order import Order, OrderItem

    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        return {"error": "Naročilo ni najdeno"}

    items = db.query(OrderItem).filter(OrderItem.order_id == order_id).all()

    # Calculate progress
    total_items = len(items)
    ready_items = sum(1 for i in items if i.status == 'ready')
    progress = round(ready_items / total_items * 100) if total_items > 0 else 0

    # Estimated time (simple calculation)
    preparing_items = sum(1 for i in items if i.status == 'preparing')
    estimated_minutes = preparing_items * 5  # 5 minutes per item

    return {
        "order_id": order.id,
        "status": order.status,
        "table_id": order.table_id,
        "customer_name": order.customer_name,
        "created_at": order.created_at.isoformat() if order.created_at else None,
        "items": [{
            "id": i.id,
            "name": i.item_name,
            "quantity": i.quantity,
            "status": i.status,
            "notes": i.notes,
        } for i in items],
        "progress": progress,
        "total_items": total_items,
        "ready_items": ready_items,
        "estimated_minutes": estimated_minutes,
    }


@router.post("/{order_id}/status")
def update_order_status(
    order_id: int,
    data: OrderStatusUpdate,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Posodobi status naročila."""
    from app.models.order import Order

    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        return {"error": "Naročilo ni najdeno"}

    order.status = data.status
    db.commit()

    # Notify via WebSocket
    import asyncio
    asyncio.create_task(notify_order_update(order_id, data.status, data.note))

    return {
        "message": f"Status naročila #{order_id} posodobljen na {data.status}",
        "order_id": order_id,
        "status": data.status,
    }


@router.post("/{order_id}/items/{item_id}/status")
def update_item_status(
    order_id: int,
    item_id: int,
    data: OrderStatusUpdate,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Posodobi status posameznega artikla."""
    from app.models.order import OrderItem

    item = db.query(OrderItem).filter(
        OrderItem.id == item_id,
        OrderItem.order_id == order_id
    ).first()
    if not item:
        return {"error": "Artikel ni najden"}

    item.status = data.status
    db.commit()

    # Notify via WebSocket
    import asyncio
    asyncio.create_task(notify_item_update(order_id, item_id, data.status))

    return {
        "message": f"Status artikla {item.item_name} posodobljen na {data.status}",
        "order_id": order_id,
        "item_id": item_id,
        "status": data.status,
    }


@router.get("/{order_id}/timeline")
def get_order_timeline(order_id: int, db: Session = Depends(get_db)):
    """Vrni časovni trak naročila."""
    from app.models.order import Order, OrderItem

    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        return {"error": "Naročilo ni najdeno"}

    items = db.query(OrderItem).filter(OrderItem.order_id == order_id).all()

    timeline = []
    
    # Order created
    if order.created_at:
        timeline.append({
            "time": order.created_at.strftime('%H:%M'),
            "event": "Naročilo oddano",
            "status": "completed",
        })

    # Items status changes
    for item in items:
        if item.status == 'preparing':
            timeline.append({
                "time": "Trenutno",
                "event": f"{item.item_name} se pripravlja",
                "status": "active",
            })
        elif item.status == 'ready':
            timeline.append({
                "time": "Trenutno",
                "event": f"{item.item_name} pripravljeno",
                "status": "completed",
            })

    # Order closed
    if order.closed_at:
        timeline.append({
            "time": order.closed_at.strftime('%H:%M'),
            "event": "Naročilo zaključeno",
            "status": "completed",
        })

    return {
        "order_id": order_id,
        "timeline": timeline,
    }


@router.get("/active")
def get_active_orders(
    branch_id: int = 0,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Vrni aktivna naročila za sledenje."""
    from app.models.order import Order

    q = db.query(Order).filter(
        Order.status.in_(["open", "preparing", "ready"])
    )
    if branch_id:
        q = q.filter(Order.branch_id == branch_id)

    orders = q.order_by(Order.created_at.desc()).all()

    return {
        "orders": [{
            "id": o.id,
            "table_id": o.table_id,
            "customer_name": o.customer_name,
            "status": o.status,
            "created_at": o.created_at.isoformat() if o.created_at else None,
            "total": o.total,
        } for o in orders],
        "count": len(orders),
    }


async def notify_order_update(order_id: int, status: str, note: str = None):
    """Pošlji posodobitev statusa prek WebSocket."""
    if order_id in tracking_connections:
        message = json.dumps({
            "type": "order_status",
            "order_id": order_id,
            "status": status,
            "note": note,
            "timestamp": datetime.now().isoformat(),
        })
        for ws in tracking_connections[order_id]:
            try:
                await ws.send_text(message)
            except:
                pass


async def notify_item_update(order_id: int, item_id: int, status: str):
    """Pošlji posodobitev artikla prek WebSocket."""
    if order_id in tracking_connections:
        message = json.dumps({
            "type": "item_status",
            "order_id": order_id,
            "item_id": item_id,
            "status": status,
            "timestamp": datetime.now().isoformat(),
        })
        for ws in tracking_connections[order_id]:
            try:
                await ws.send_text(message)
            except:
                pass