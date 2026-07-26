"""Real-time Notifications API — WebSocket push obvestila."""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime
import json
import asyncio

from app.core.database import get_db
from app.api.v1.auth import get_current_user

router = APIRouter(prefix="/notifications", tags=["Real-time obvestila"])


class NotificationCreate(BaseModel):
    title: str
    message: str
    type: str = "info"  # info, warning, success, error, order, stock
    target_user_id: Optional[int] = None
    target_role: Optional[str] = None
    data: Optional[dict] = None


# Connection manager for WebSocket
class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[int, List[WebSocket]] = {}
        self.all_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket, user_id: int = 0):
        await websocket.accept()
        if user_id:
            if user_id not in self.active_connections:
                self.active_connections[user_id] = []
            self.active_connections[user_id].append(websocket)
        self.all_connections.append(websocket)

    def disconnect(self, websocket: WebSocket, user_id: int = 0):
        if websocket in self.all_connections:
            self.all_connections.remove(websocket)
        if user_id and user_id in self.active_connections:
            self.active_connections[user_id] = [
                ws for ws in self.active_connections[user_id] if ws != websocket
            ]

    async def send_to_user(self, user_id: int, message: dict):
        if user_id in self.active_connections:
            for ws in self.active_connections[user_id]:
                try:
                    await ws.send_json(message)
                except Exception:
                    pass

    async def send_to_all(self, message: dict):
        for ws in self.all_connections.copy():
            try:
                await ws.send_json(message)
            except Exception:
                self.all_connections.remove(ws)

    async def send_to_role(self, role: str, message: dict):
        for ws in self.all_connections.copy():
            try:
                await ws.send_json(message)
            except Exception:
                self.all_connections.remove(ws)


manager = ConnectionManager()


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: Optional[str] = Query(None)):
    """WebSocket za real-time obvestila."""
    user_id = 0
    # Try to extract user_id from token
    if token:
        try:
            from app.api.v1.auth import decode_token
            payload = decode_token(token)
            if payload:
                user_id = payload.get("sub", 0)
        except Exception:
            pass

    await manager.connect(websocket, user_id)
    try:
        while True:
            data = await websocket.receive_text()
            # Handle ping/pong
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        manager.disconnect(websocket, user_id)


@router.post("/send")
async def send_notification(req: NotificationCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Pošlji obvestilo."""
    from app.models.notification import Notification

    notification = Notification(
        title=req.title,
        message=req.message,
        type=req.type,
        target_user_id=req.target_user_id,
        target_role=req.target_role,
        data=json.dumps(req.data) if req.data else None,
    )
    db.add(notification)
    db.commit()

    # Send via WebSocket
    ws_message = {
        "type": "notification",
        "title": req.title,
        "message": req.message,
        "notification_type": req.type,
        "data": req.data,
        "timestamp": datetime.now().isoformat(),
    }

    if req.target_user_id:
        await manager.send_to_user(req.target_user_id, ws_message)
    else:
        await manager.send_to_all(ws_message)

    return {"message": "Obvestilo poslano", "id": notification.id}


@router.get("/")
def get_notifications(
    unread_only: bool = False,
    limit: int = 50,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Pridobi obvestila za uporabnika."""
    from app.models.notification import Notification

    q = db.query(Notification)
    if unread_only:
        q = q.filter(Notification.read == False)

    notifications = q.order_by(Notification.created_at.desc()).limit(limit).all()

    return {
        "notifications": [
            {
                "id": n.id,
                "title": n.title,
                "message": n.message,
                "type": n.type,
                "read": n.read,
                "created_at": n.created_at.isoformat() if hasattr(n.created_at, 'isoformat') else str(n.created_at),
            }
            for n in notifications
        ],
        "unread_count": db.query(Notification).filter(Notification.read == False).count(),
    }


@router.put("/{notification_id}/read")
def mark_read(notification_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Označi obvestilo kot prebrano."""
    from app.models.notification import Notification

    n = db.query(Notification).filter(Notification.id == notification_id).first()
    if n:
        n.read = True
        db.commit()

    return {"message": "Označeno kot prebrano"}


@router.put("/read-all")
def mark_all_read(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Označi vsa obvestila kot prebrana."""
    from app.models.notification import Notification

    db.query(Notification).filter(Notification.read == False).update({"read": True})
    db.commit()

    return {"message": "Vsa obvestila označena kot prebrana"}


@router.delete("/{notification_id}")
def delete_notification(notification_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Izbriši obvestilo."""
    from app.models.notification import Notification

    n = db.query(Notification).filter(Notification.id == notification_id).first()
    if n:
        db.delete(n)
        db.commit()

    return {"message": "Obvestilo izbrisano"}


# Helper functions for sending notifications from other parts of the app
async def notify_new_order(order_id: int, table_name: str):
    """Obvestilo o novem naročilu."""
    await manager.send_to_role("chef", {
        "type": "notification",
        "title": "🍽️ Novo naročilo",
        "message": f"Miza {table_name} - Naročilo #{order_id}",
        "notification_type": "order",
        "data": {"order_id": order_id, "table": table_name},
        "timestamp": datetime.now().isoformat(),
    })


async def notify_low_stock(item_name: str, current_stock: float, unit: str):
    """Obvestilo o nizki zalogi."""
    await manager.send_to_role("manager", {
        "type": "notification",
        "title": "⚠️ Nizka zaloga",
        "message": f"{item_name}: {current_stock} {unit}",
        "notification_type": "stock",
        "data": {"item": item_name, "stock": current_stock, "unit": unit},
        "timestamp": datetime.now().isoformat(),
    })


async def notify_order_ready(order_id: int, table_name: str):
    """Obvestilo, da je naročilo pripravljeno."""
    await manager.send_to_role("waiter", {
        "type": "notification",
        "title": "✅ Naročilo pripravljeno",
        "message": f"Miza {table_name} - Naročilo #{order_id}",
        "notification_type": "success",
        "data": {"order_id": order_id, "table": table_name},
        "timestamp": datetime.now().isoformat(),
    })
