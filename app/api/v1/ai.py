"""
AI endpoints — natural language features powered by Puter free AI.
"""
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.v1.auth import get_current_user
from app.models.menu_item import MenuItem
from app.models.category import Category
from app.services.ai_service import (
    ai_menu_search,
    ai_combo_suggestions,
    ai_order_summary,
    ai_inventory_insight,
)

router = APIRouter(prefix="/ai", tags=["AI"])


def _get_menu_items(db: Session) -> list[dict]:
    cats = {c.id: c.name for c in db.query(Category).all()}
    items = db.query(MenuItem).filter(MenuItem.is_active == True).all()
    return [{
        "id": i.id,
        "name": i.name,
        "price": i.price,
        "category": cats.get(i.category_id, ""),
        "description": i.description or "",
        "tags": i.tags or "",
        "calories": i.calories,
    } for i in items]


class AISearchRequest(BaseModel):
    query: str


class AIComboRequest(BaseModel):
    cart_items: list[dict]


class AIOrderSummaryRequest(BaseModel):
    order_data: dict


class AIInventoryRequest(BaseModel):
    ingredients: list[dict]


@router.post("/search")
def ai_search(body: AISearchRequest, db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Natural language menu search — ask in Slovenian or English."""
    items = _get_menu_items(db)
    results = ai_menu_search(body.query, items)
    return {"results": results, "query": body.query}


@router.post("/combos")
def ai_combos(body: AIComboRequest, db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Suggest combo/upsell items based on cart contents."""
    items = _get_menu_items(db)
    suggestions = ai_combo_suggestions(body.cart_items, items)
    return {"suggestions": suggestions}


@router.post("/order-summary")
def ai_summary(body: AIOrderSummaryRequest, user=Depends(get_current_user)):
    """Generate natural language order summary."""
    summary = ai_order_summary(body.order_data)
    return {"summary": summary}


@router.post("/inventory-insight")
def ai_inventory(body: AIInventoryRequest, user=Depends(get_current_user)):
    """AI inventory analysis and reorder suggestions."""
    insight = ai_inventory_insight(body.ingredients)
    return {"insight": insight}
