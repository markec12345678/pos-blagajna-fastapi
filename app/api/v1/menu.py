from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.category import Category
from app.models.menu_item import MenuItem, ComboItem, MenuVersion, CrossSellItem
from app.models.inventory import RecipeItem, Ingredient
from app.schemas.menu import CategoryWithItems, MenuItemOut, MenuItemCreate
from datetime import datetime
import json

router = APIRouter(prefix="/menu", tags=["menu"])

BADGE_PRESETS = [
    {"value": "Vegan", "icon": "\U0001f331"},
    {"value": "Vegetarian", "icon": "\U0001f96c"},
    {"value": "Gluten-Free", "icon": "\U0001f6ab\U0001f33e"},
    {"value": "Spicy", "icon": "\U0001f336\ufe0f"},
    {"value": "Chef-Special", "icon": "\U0001f468\u200d\U0001f373"},
    {"value": "Local", "icon": "\U0001f1f8\U0001f1ee"},
    {"value": "Organic", "icon": "\U0001f33f"},
    {"value": "Sugar-Free", "icon": "\U0001f6ab\U0001f36c"},
    {"value": "Seasonal", "icon": "\U0001f342"},
    {"value": "Signature", "icon": "\u2b50"},
    {"value": "New", "icon": "\U0001f195"},
    {"value": "Popular", "icon": "\U0001f525"},
]


@router.get("/badge-presets")
def get_badge_presets():
    return BADGE_PRESETS


@router.get("")
def get_menu(branch_id: int = 0, db: Session = Depends(get_db)):
    q = db.query(Category).order_by(Category.sort_order)
    if branch_id:
        q = q.filter(Category.branch_id == branch_id)
    categories = q.all()
    result = []
    for cat in categories:
        iq = db.query(MenuItem).filter(MenuItem.category_id == cat.id, MenuItem.is_active == True)
        if branch_id:
            iq = iq.filter(MenuItem.branch_id == branch_id)
        items = iq.all()
        result.append(CategoryWithItems(
            id=cat.id, name=cat.name, sort_order=cat.sort_order,
            items=[MenuItemOut.model_validate(i) for i in items]
        ))
    return result


@router.get("/all")
def get_all_menu(branch_id: int = 0, db: Session = Depends(get_db)):
    q = db.query(Category).order_by(Category.sort_order)
    if branch_id:
        q = q.filter(Category.branch_id == branch_id)
    categories = q.all()
    result = []
    for cat in categories:
        iq = db.query(MenuItem).filter(MenuItem.category_id == cat.id)
        if branch_id:
            iq = iq.filter(MenuItem.branch_id == branch_id)
        items = iq.all()
        result.append({
            "id": cat.id, "name": cat.name, "sort_order": cat.sort_order,
            "items": [{"id": i.id, "name": i.name, "description": i.description or "", "price": i.price, "category_id": i.category_id, "course_id": i.course_id, "is_active": i.is_active, "is_favorite": i.is_favorite, "is_out_of_stock": i.is_out_of_stock, "plu_code": i.plu_code, "tax_rate": i.tax_rate or 0, "translations": i.translations, "image_url": i.image_url, "allergens": i.allergens, "tags": i.tags, "calories": i.calories, "protein": i.protein, "fat": i.fat, "carbs": i.carbs} for i in items]
        })
    return result


@router.get("/categories")
def list_categories(branch_id: int = 0, db: Session = Depends(get_db)):
    q = db.query(Category).order_by(Category.sort_order)
    if branch_id:
        q = q.filter(Category.branch_id == branch_id)
    return q.all()


@router.post("/categories")
def create_category(data: dict, db: Session = Depends(get_db)):
    max_order = db.query(Category.sort_order).order_by(Category.sort_order.desc()).first()
    cat = Category(name=data["name"], sort_order=(max_order[0] + 1 if max_order else 0), branch_id=data.get("branch_id"))
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return {"id": cat.id, "name": cat.name, "sort_order": cat.sort_order}


@router.put("/categories/{cat_id}")
def update_category(cat_id: int, data: dict, db: Session = Depends(get_db)):
    cat = db.query(Category).filter(Category.id == cat_id).first()
    if not cat:
        raise HTTPException(404, "Category not found")
    if "name" in data:
        cat.name = data["name"]
    if "sort_order" in data:
        cat.sort_order = data["sort_order"]
    db.commit()
    return {"id": cat.id, "name": cat.name, "sort_order": cat.sort_order}


@router.delete("/categories/{cat_id}")
def delete_category(cat_id: int, db: Session = Depends(get_db)):
    cat = db.query(Category).filter(Category.id == cat_id).first()
    if not cat:
        raise HTTPException(404, "Category not found")
    items = db.query(MenuItem).filter(MenuItem.category_id == cat_id).count()
    if items > 0:
        raise HTTPException(400, f"Kategorija vsebuje {items} artiklov. Najprej jih prestavite ali izbrišite.")
    db.delete(cat)
    db.commit()
    return {"ok": True}


@router.post("/items", response_model=MenuItemOut)
def create_item(item: MenuItemCreate, db: Session = Depends(get_db)):
    db_item = MenuItem(**item.model_dump())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return MenuItemOut.model_validate(db_item)


@router.put("/items/{item_id}")
def update_item(item_id: int, data: dict, db: Session = Depends(get_db)):
    item = db.query(MenuItem).filter(MenuItem.id == item_id).first()
    if not item:
        raise HTTPException(404, "Item not found")
    for k in ("name", "description", "price", "category_id", "is_active", "is_favorite", "course_id", "is_out_of_stock", "is_combo", "branch_id", "image_url", "allergens", "tags", "translations", "tax_rate", "calories", "protein", "fat", "carbs"):
        if k in data:
            setattr(item, k, data[k])
    if "plu_code" in data:
        item.plu_code = data.get("plu_code")
    if "combo_price" in data:
        item.combo_price = data["combo_price"]
        item.is_combo = data["combo_price"] is not None and data["combo_price"] > 0
    db.commit()
    return {"id": item.id, "name": item.name, "price": item.price, "is_active": item.is_active}


@router.get("/items/{item_id}/cost")
def item_cost(item_id: int, db: Session = Depends(get_db)):
    item = db.query(MenuItem).filter(MenuItem.id == item_id).first()
    if not item:
        raise HTTPException(404, "Item not found")
    recipes = db.query(RecipeItem).filter(RecipeItem.menu_item_id == item_id).all()
    total_cost = 0
    breakdown = []
    for r in recipes:
        ing = db.query(Ingredient).filter(Ingredient.id == r.ingredient_id).first()
        if ing and ing.cost_per_unit:
            cost = r.quantity * ing.cost_per_unit
            total_cost += cost
            breakdown.append({"ingredient": ing.name, "quantity": r.quantity, "unit": ing.unit, "cost": round(cost, 4)})
    margin = round((item.price - total_cost) / item.price * 100, 1) if item.price > 0 else 0
    return {
        "item_id": item_id, "item_name": item.name, "price": item.price,
        "cost": round(total_cost, 4), "margin": margin,
        "breakdown": breakdown
    }


@router.get("/plu/{plu_code}")
def lookup_plu(plu_code: str, branch_id: int = 0, db: Session = Depends(get_db)):
    q = db.query(MenuItem).filter(MenuItem.plu_code == plu_code, MenuItem.is_active == True)
    if branch_id:
        q = q.filter(MenuItem.branch_id == branch_id)
    item = q.first()
    if not item:
        raise HTTPException(404, "Item not found")
    return {"id": item.id, "name": item.name, "price": item.price, "combo_price": item.combo_price, "is_combo": item.is_combo, "is_out_of_stock": item.is_out_of_stock}


@router.post("/auto-out-of-stock")
def auto_out_of_stock(branch_id: int = 0, db: Session = Depends(get_db)):
    q = db.query(MenuItem).filter(MenuItem.is_active == True)
    if branch_id:
        q = q.filter(MenuItem.branch_id == branch_id)
    items = q.all()
    marked = 0
    unmarked = 0
    for item in items:
        recipes = db.query(RecipeItem).filter(RecipeItem.menu_item_id == item.id).all()
        is_low = False
        for r in recipes:
            ing = db.query(Ingredient).filter(Ingredient.id == r.ingredient_id).first()
            if ing and ing.min_stock > 0 and ing.stock <= ing.min_stock * 0.5:
                is_low = True
                break
        if is_low and not item.is_out_of_stock:
            item.is_out_of_stock = True
            marked += 1
        elif not is_low and item.is_out_of_stock:
            item.is_out_of_stock = False
            unmarked += 1
    db.commit()
    return {"marked_out_of_stock": marked, "marked_available": unmarked}


@router.get("/costs")
def all_item_costs(branch_id: int = 0, db: Session = Depends(get_db)):
    q = db.query(MenuItem).filter(MenuItem.is_active == True)
    if branch_id:
        q = q.filter(MenuItem.branch_id == branch_id)
    items = q.all()
    result = []
    for item in items:
        recipes = db.query(RecipeItem).filter(RecipeItem.menu_item_id == item.id).all()
        total_cost = sum(
            r.quantity * (db.query(Ingredient.cost_per_unit).filter(Ingredient.id == r.ingredient_id).scalar() or 0)
            for r in recipes
        )
        result.append({
            "id": item.id, "name": item.name, "price": item.price,
            "cost": round(total_cost, 4),
            "margin": round((item.price - total_cost) / item.price * 100, 1) if item.price > 0 else 0
        })
    return result


@router.delete("/items/{item_id}")
def delete_item(item_id: int, db: Session = Depends(get_db)):
    item = db.query(MenuItem).filter(MenuItem.id == item_id).first()
    if not item:
        raise HTTPException(404, "Item not found")
    db.delete(item)
    db.commit()
    return {"ok": True}


# ── Combos ──
@router.get("/combos")
def list_combos(branch_id: int = 0, db: Session = Depends(get_db)):
    q = db.query(MenuItem).filter(MenuItem.is_combo == True)
    if branch_id:
        q = q.filter(MenuItem.branch_id == branch_id)
    combos = q.all()
    result = []
    for c in combos:
        items = db.query(ComboItem).filter(ComboItem.combo_id == c.id).all()
        result.append({
            "id": c.id, "name": c.name, "price": c.price,
            "combo_price": c.combo_price,
            "items": [{"id": ci.item_id, "quantity": ci.quantity} for ci in items]
        })
    return result


@router.post("/combos/{combo_id}/items")
def add_combo_item(combo_id: int, data: dict, db: Session = Depends(get_db)):
    combo = db.query(MenuItem).filter(MenuItem.id == combo_id, MenuItem.is_combo == True).first()
    if not combo:
        raise HTTPException(404, "Combo not found")
    item = db.query(MenuItem).filter(MenuItem.id == data["item_id"]).first()
    if not item:
        raise HTTPException(404, "Item not found")
    ci = ComboItem(combo_id=combo_id, item_id=data["item_id"], quantity=data.get("quantity", 1))
    db.add(ci)
    db.commit()
    return {"ok": True}


@router.delete("/combos/{combo_id}/items/{item_id}")
def remove_combo_item(combo_id: int, item_id: int, db: Session = Depends(get_db)):
    ci = db.query(ComboItem).filter(ComboItem.combo_id == combo_id, ComboItem.item_id == item_id).first()
    if not ci:
        raise HTTPException(404, "Combo item not found")
    db.delete(ci)
    db.commit()
    return {"ok": True}


# ── Menu Versions ──
@router.get("/versions")
def list_versions(item_id: int = None, branch_id: int = 0, db: Session = Depends(get_db)):
    q = db.query(MenuVersion)
    if item_id:
        q = q.filter(MenuVersion.item_id == item_id)
    if branch_id:
        q = q.filter(MenuVersion.branch_id == branch_id)
    versions = q.order_by(MenuVersion.valid_from.desc().nullslast()).all()
    return [{"id": v.id, "item_id": v.item_id, "price": v.price, 
             "valid_from": v.valid_from.isoformat() if v.valid_from else None,
             "valid_to": v.valid_to.isoformat() if v.valid_to else None} for v in versions]


@router.post("/versions")
def create_version(data: dict, db: Session = Depends(get_db)):
    item = db.query(MenuItem).filter(MenuItem.id == data.get("item_id")).first()
    if not item:
        raise HTTPException(404, "Item not found")
    v = MenuVersion(
        item_id=data["item_id"],
        price=float(data["price"]),
        valid_from=datetime.fromisoformat(data["valid_from"]) if data.get("valid_from") else None,
        valid_to=datetime.fromisoformat(data["valid_to"]) if data.get("valid_to") else None,
        branch_id=data.get("branch_id") if data.get("branch_id") else None
    )
    db.add(v)
    db.commit()
    db.refresh(v)
    return {"id": v.id, "price": v.price, "valid_from": v.valid_from.isoformat() if v.valid_from else None, "valid_to": v.valid_to.isoformat() if v.valid_to else None}


@router.delete("/versions/{version_id}")
def delete_version(version_id: int, db: Session = Depends(get_db)):
    v = db.query(MenuVersion).filter(MenuVersion.id == version_id).first()
    if not v:
        raise HTTPException(404, "Version not found")
    db.delete(v)
    db.commit()
    return {"ok": True}


@router.post("/bulk")
def bulk_action(payload: dict, db: Session = Depends(get_db)):
    action = payload.get("action")
    category_id = payload.get("category_id")
    q = db.query(MenuItem)
    if category_id:
        q = q.filter(MenuItem.category_id == category_id)
    items = q.all()
    updated = 0
    for item in items:
        if action == "price":
            value = payload.get("value", "")
            if not value:
                continue
            if value.startswith("+") and value.endswith("%"):
                pct = float(value.strip("%").strip("+"))
                item.price = round(item.price * (1 + pct / 100), 2)
            elif value.startswith("-") and value.endswith("%"):
                pct = float(value.strip("%").strip("-"))
                item.price = round(item.price * (1 - pct / 100), 2)
            elif value.startswith("+"):
                item.price = round(item.price + float(value.strip("+")), 2)
            elif value.startswith("-"):
                item.price = round(item.price - float(value.strip("-")), 2)
            else:
                item.price = round(float(value), 2)
            updated += 1
        elif action == "category":
            new_cat = payload.get("category_id")
            if new_cat:
                item.category_id = int(new_cat)
                updated += 1
        elif action == "course":
            new_course = payload.get("course_id")
            item.course_id = int(new_course) if new_course else None
            updated += 1
        elif action == "activate":
            val = payload.get("value", "activate")
            item.is_active = val == "activate"
            updated += 1
    db.commit()
    return {"updated": updated}


@router.get("/translations/{item_id}")
def get_item_translations(item_id: int, db: Session = Depends(get_db)):
    item = db.query(MenuItem).filter(MenuItem.id == item_id).first()
    if not item:
        raise HTTPException(404, "Item not found")
    return json.loads(item.translations) if item.translations else {}


@router.put("/translations/{item_id}")
def set_item_translations(item_id: int, data: dict, db: Session = Depends(get_db)):
    item = db.query(MenuItem).filter(MenuItem.id == item_id).first()
    if not item:
        raise HTTPException(404, "Item not found")
    existing = json.loads(item.translations) if item.translations else {}
    for lang, fields in data.items():
        if isinstance(fields, dict):
            existing[lang] = {**existing.get(lang, {}), **fields}
        else:
            existing[lang] = fields
    item.translations = json.dumps(existing)
    db.commit()
    return existing


@router.get("/cross-sell/{item_id}")
def get_cross_sell(item_id: int, db: Session = Depends(get_db)):
    suggestions = db.query(CrossSellItem).filter(CrossSellItem.item_id == item_id).all()
    result = []
    for cs in suggestions:
        sug = db.query(MenuItem).filter(MenuItem.id == cs.suggested_id).first()
        result.append({
            "id": cs.id, "suggested_id": cs.suggested_id,
            "name": sug.name if sug else "?",
            "price": sug.price if sug else 0,
            "type": cs.type
        })
    return result


@router.post("/cross-sell")
def add_cross_sell(data: dict, db: Session = Depends(get_db)):
    item_id = data.get("item_id")
    suggested_id = data.get("suggested_id")
    cs_type = data.get("type", "cross-sell")
    if not item_id or not suggested_id:
        raise HTTPException(400, "item_id and suggested_id required")
    existing = db.query(CrossSellItem).filter(
        CrossSellItem.item_id == item_id,
        CrossSellItem.suggested_id == suggested_id
    ).first()
    if existing:
        raise HTTPException(400, "Already exists")
    cs = CrossSellItem(item_id=item_id, suggested_id=suggested_id, type=cs_type)
    db.add(cs)
    db.commit()
    db.refresh(cs)
    return {"id": cs.id, "type": cs.type}


@router.delete("/cross-sell/{cs_id}")
def delete_cross_sell(cs_id: int, db: Session = Depends(get_db)):
    cs = db.query(CrossSellItem).filter(CrossSellItem.id == cs_id).first()
    if not cs:
        raise HTTPException(404, "Not found")
    db.delete(cs)
    db.commit()
    return {"ok": True}
