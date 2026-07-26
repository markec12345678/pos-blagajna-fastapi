"""Menu allergen tracking system."""
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime

from app.core.database import get_db
from app.api.v1.auth import get_current_user

router = APIRouter(prefix="/menu-allergens", tags=["Meni alergeni"])

# Standard EU allergens
ALLERGENS = [
    {"id": 1, "code": "A", "name": "Gluten", "icon": "🌾"},
    {"id": 2, "code": "B", "name": "Rakiške", "icon": "🦐"},
    {"id": 3, "code": "C", "name": "Jajca", "icon": "🥚"},
    {"id": 4, "code": "D", "name": "Ribe", "icon": "🐟"},
    {"id": 5, "code": "E", "name": "Arašidi", "icon": "🥜"},
    {"id": 6, "code": "F", "name": "Soja", "icon": "🫘"},
    {"id": 7, "code": "G", "name": "Mleko", "icon": "🥛"},
    {"id": 8, "code": "H", "name": "Oreški", "icon": "🌰"},
    {"id": 9, "code": "I", "name": "Zelena", "icon": "🥬"},
    {"id": 10, "code": "J", "name": "Gorčica", "icon": "🟡"},
    {"id": 11, "code": "K", "name": "Sezam", "icon": "⚪"},
    {"id": 12, "code": "L", "name": "Sulfiti", "icon": "🧪"},
    {"id": 13, "code": "M", "name": "Lupinarji", "icon": "🫛"},
    {"id": 14, "code": "N", "name": "Mehkužci", "icon": "🦪"},
]


@router.get("/list")
def get_allergens():
    """Vrni seznam vseh alergenov."""
    return {"allergens": ALLERGENS}


@router.get("/item/{item_id}")
def get_item_allergens(item_id: int, db: Session = Depends(get_db)):
    """Vrni alergene za določen artikel."""
    from app.models.menu_item import MenuItem

    item = db.query(MenuItem).filter(MenuItem.id == item_id).first()
    if not item:
        return {"error": "Artikel ni najden"}

    # Get allergens from item
    item_allergens = getattr(item, 'allergens', None)
    if isinstance(item_allergens, str):
        try:
            import json
            item_allergens = json.loads(item_allergens)
        except:
            item_allergens = []

    # Match with full allergen info
    matched = []
    for a in ALLERGENS:
        if a["code"] in (item_allergens or []):
            matched.append(a)

    return {
        "item_id": item_id,
        "item_name": item.name,
        "allergens": matched,
        "allergen_codes": item_allergens or [],
    }


@router.post("/item/{item_id}")
def update_item_allergens(
    item_id: int,
    allergen_codes: List[str],
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Posodobi alergene za artikel."""
    from app.models.menu_item import MenuItem
    import json

    item = db.query(MenuItem).filter(MenuItem.id == item_id).first()
    if not item:
        return {"error": "Artikel ni najden"}

    # Validate codes
    valid_codes = [a["code"] for a in ALLERGENS]
    invalid = [c for c in allergen_codes if c not in valid_codes]
    if invalid:
        return {"error": f"Neveljavne kode: {', '.join(invalid)}"}

    item.allergens = json.dumps(allergen_codes)
    db.commit()

    return {
        "message": f"Alergeni posodobljeni za {item.name}",
        "item_id": item_id,
        "allergen_codes": allergen_codes,
    }


@router.get("/search")
def search_allergen_free(
    exclude_allergens: str = Query("", description="Comma-separated allergen codes to exclude"),
    db: Session = Depends(get_db)
):
    """Poišči jedi brez določenih alergenov."""
    from app.models.menu_item import MenuItem
    import json

    exclude = [a.strip() for a in exclude_allergens.split(",") if a.strip()]

    items = db.query(MenuItem).filter(MenuItem.is_available == True).all()

    results = []
    for item in items:
        item_allergens = getattr(item, 'allergens', None)
        if isinstance(item_allergens, str):
            try:
                item_allergens = json.loads(item_allergens)
            except:
                item_allergens = []
        
        item_allergens = item_allergens or []

        # Check if item has any excluded allergens
        has_excluded = any(a in item_allergens for a in exclude)

        if not has_excluded:
            matched_allergens = [a for a in ALLERGENS if a["code"] in item_allergens]
            results.append({
                "id": item.id,
                "name": item.name,
                "price": item.price,
                "allergens": matched_allergens,
            })

    return {
        "exclude_allergens": exclude,
        "results": results,
        "count": len(results),
    }


@router.get("/stats")
def get_allergen_stats(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Statistika alergenov v meniju."""
    from app.models.menu_item import MenuItem
    import json

    items = db.query(MenuItem).filter(MenuItem.is_available == True).all()

    allergen_counts = {a["code"]: 0 for a in ALLERGENS}
    items_with_allergens = 0
    items_without_allergens = 0

    for item in items:
        item_allergens = getattr(item, 'allergens', None)
        if isinstance(item_allergens, str):
            try:
                item_allergens = json.loads(item_allergens)
            except:
                item_allergens = []
        
        if item_allergens:
            items_with_allergens += 1
            for code in item_allergens:
                if code in allergen_counts:
                    allergen_counts[code] += 1
        else:
            items_without_allergens += 1

    # Sort by count
    top_allergens = sorted(
        [{"code": k, "count": v, "name": next((a["name"] for a in ALLERGENS if a["code"] == k), k)} for k, v in allergen_counts.items()],
        key=lambda x: x["count"],
        reverse=True
    )

    return {
        "total_items": len(items),
        "items_with_allergens": items_with_allergens,
        "items_without_allergens": items_without_allergens,
        "top_allergens": top_allergens[:5],
    }