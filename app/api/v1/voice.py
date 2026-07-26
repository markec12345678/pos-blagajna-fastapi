"""Voice Ordering API — glasovno naročanje v POS."""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional

from app.core.database import get_db
from app.api.v1.auth import get_current_user
from app.services.voice_service import parse_voice_order, voice_search, recognize_command

router = APIRouter(prefix="/voice", tags=["Glasovno naročanje"])


class VoiceRequest(BaseModel):
    text: str


class VoiceSearchRequest(BaseModel):
    query: str


@router.post("/parse-order")
def api_parse_voice_order(req: VoiceRequest, db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Razume glasovno naročilo in vrni strukturirano."""
    from app.models.menu_item import MenuItem
    items = db.query(MenuItem).filter(MenuItem.is_active == True).all()
    menu_items = [{"id": i.id, "name": i.name, "category": getattr(i, 'category', ''), "price": float(i.price), "description": getattr(i, 'description', '')} for i in items]

    parsed = parse_voice_order(req.text, menu_items)

    # Check for voice commands first
    command = recognize_command(req.text)
    if command:
        return {"type": "command", "command": command, "raw": req.text}

    if parsed.get("error") and not parsed.get("items"):
        return {"type": "error", **parsed}

    return {"type": "order", **parsed}


@router.post("/search")
def api_voice_search(req: VoiceSearchRequest, db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Iskanje po jedilniku z glasom."""
    from app.models.menu_item import MenuItem
    items = db.query(MenuItem).filter(MenuItem.is_active == True).all()
    menu_items = [{"id": i.id, "name": i.name, "category": getattr(i, 'category', ''), "price": float(i.price), "description": getattr(i, 'description', '')} for i in items]

    matches = voice_search(req.query, menu_items)

    # Enrich with full item data
    from app.models.menu_item import MenuItem as MI
    enriched = []
    for match in matches:
        item = db.query(MI).filter(MI.id == match.get("id")).first()
        if item:
            enriched.append({
                "id": item.id, "name": item.name,
                "price": float(item.price),
                "category": getattr(item, 'category', ''),
                "reason": match.get("reason", "")
            })

    return {"items": enriched, "query": req.query}


@router.get("/commands")
def api_voice_commands():
    """Vrni seznam razpoložljivih glasovnih ukazov."""
    from app.services.voice_service import VOICE_COMMANDS
    return {
        "commands": [
            {"phrase": phrase, "action": action}
            for phrase, action in VOICE_COMMANDS.items()
        ]
    }