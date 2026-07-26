import asyncio
import logging
from fastapi import WebSocket
from typing import Set

logger = logging.getLogger(__name__)
clients: Set[WebSocket] = set()


async def connect(ws: WebSocket):
    await ws.accept()
    clients.add(ws)


def disconnect(ws: WebSocket):
    clients.discard(ws)


async def _broadcast(event_type: str, payload: dict | None = None):
    if payload is None:
        payload = {}
    msg = {"event": event_type, "data": payload}
    dead: list[WebSocket] = []
    for ws in clients:
        try:
            await ws.send_json(msg)
        except Exception:
            dead.append(ws)
    for ws in dead:
        clients.discard(ws)


def broadcast(event_type: str, payload: dict | None = None):
    try:
        loop = asyncio.get_running_loop()
        if loop.is_running():
            loop.create_task(_broadcast(event_type, payload))
    except RuntimeError:
        logger.debug("No running event loop, broadcast dropped: %s", event_type)
