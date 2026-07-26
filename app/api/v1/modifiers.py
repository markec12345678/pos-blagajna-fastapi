from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.modifiers import ModifierGroup, ModifierOption, MenuItemModifierLink
from app.models.menu_item import MenuItem
from app.schemas.modifier import (
    ModifierGroupCreate, ModifierGroupUpdate,
    ModifierOptionCreate, ModifierOptionUpdate, ModifierLink
)

router = APIRouter(prefix="/modifiers", tags=["modifiers"])


@router.get("/groups")
def list_groups(db: Session = Depends(get_db)):
    groups = db.query(ModifierGroup).order_by(ModifierGroup.sort_order).all()
    result = []
    for g in groups:
        options = db.query(ModifierOption).filter(ModifierOption.group_id == g.id).order_by(ModifierOption.sort_order).all()
        result.append({
            "id": g.id, "name": g.name,
            "min_select": g.min_select, "max_select": g.max_select,
            "is_required": g.is_required, "sort_order": g.sort_order,
            "options": [{
                "id": o.id, "name": o.name, "price_impact": o.price_impact,
                "ingredient_id": o.ingredient_id, "ingredient_quantity": o.ingredient_quantity,
                "sort_order": o.sort_order
            } for o in options]
        })
    return result


@router.post("/groups")
def create_group(data: ModifierGroupCreate, db: Session = Depends(get_db)):
    max_order = db.query(ModifierGroup.sort_order).order_by(ModifierGroup.sort_order.desc()).first()
    g = ModifierGroup(
        name=data.name,
        min_select=data.min_select,
        max_select=data.max_select,
        is_required=data.is_required,
        sort_order=(max_order[0] + 1 if max_order else 0)
    )
    db.add(g)
    db.commit()
    db.refresh(g)
    return {"id": g.id, "name": g.name}


@router.put("/groups/{group_id}")
def update_group(group_id: int, data: ModifierGroupUpdate, db: Session = Depends(get_db)):
    g = db.query(ModifierGroup).filter(ModifierGroup.id == group_id).first()
    if not g:
        raise HTTPException(404, "Group not found")
    update_data = data.model_dump(exclude_unset=True)
    for k, v in update_data.items():
        setattr(g, k, v)
    db.commit()
    return {"ok": True}


@router.delete("/groups/{group_id}")
def delete_group(group_id: int, db: Session = Depends(get_db)):
    g = db.query(ModifierGroup).filter(ModifierGroup.id == group_id).first()
    if not g:
        raise HTTPException(404, "Group not found")
    db.query(ModifierOption).filter(ModifierOption.group_id == group_id).delete()
    db.query(MenuItemModifierLink).filter(MenuItemModifierLink.group_id == group_id).delete()
    db.delete(g)
    db.commit()
    return {"ok": True}


@router.post("/options")
def create_option(data: ModifierOptionCreate, db: Session = Depends(get_db)):
    group = db.query(ModifierGroup).filter(ModifierGroup.id == data.group_id).first()
    if not group:
        raise HTTPException(404, "Group not found")
    max_order = db.query(ModifierOption.sort_order).filter(ModifierOption.group_id == data.group_id).order_by(ModifierOption.sort_order.desc()).first()
    o = ModifierOption(
        group_id=data.group_id,
        name=data.name,
        price_impact=data.price_impact,
        ingredient_id=data.ingredient_id,
        ingredient_quantity=data.ingredient_quantity,
        sort_order=(max_order[0] + 1 if max_order else 0)
    )
    db.add(o)
    db.commit()
    db.refresh(o)
    return {"id": o.id, "name": o.name, "price_impact": o.price_impact}


@router.put("/options/{option_id}")
def update_option(option_id: int, data: ModifierOptionUpdate, db: Session = Depends(get_db)):
    o = db.query(ModifierOption).filter(ModifierOption.id == option_id).first()
    if not o:
        raise HTTPException(404, "Option not found")
    update_data = data.model_dump(exclude_unset=True)
    for k, v in update_data.items():
        setattr(o, k, v)
    db.commit()
    return {"ok": True}


@router.delete("/options/{option_id}")
def delete_option(option_id: int, db: Session = Depends(get_db)):
    o = db.query(ModifierOption).filter(ModifierOption.id == option_id).first()
    if not o:
        raise HTTPException(404, "Option not found")
    db.delete(o)
    db.commit()
    return {"ok": True}


@router.get("/links")
def list_all_links(db: Session = Depends(get_db)):
    from app.models.modifiers import MenuItemModifierLink
    links = db.query(MenuItemModifierLink).all()
    result = {}
    for l in links:
        result.setdefault(l.menu_item_id, []).append(l.group_id)
    return result

@router.get("/by-item/{menu_item_id}")
def get_modifiers_for_item(menu_item_id: int, db: Session = Depends(get_db)):
    links = db.query(MenuItemModifierLink).filter(MenuItemModifierLink.menu_item_id == menu_item_id).all()
    group_ids = [l.group_id for l in links]
    groups = db.query(ModifierGroup).filter(ModifierGroup.id.in_(group_ids)).order_by(ModifierGroup.sort_order).all()
    result = []
    for g in groups:
        options = db.query(ModifierOption).filter(ModifierOption.group_id == g.id).order_by(ModifierOption.sort_order).all()
        result.append({
            "id": g.id, "name": g.name,
            "min_select": g.min_select, "max_select": g.max_select,
            "is_required": g.is_required,
            "options": [{
                "id": o.id, "name": o.name, "price_impact": o.price_impact,
                "ingredient_id": o.ingredient_id, "ingredient_quantity": o.ingredient_quantity
            } for o in options]
        })
    return result


@router.post("/link")
def link_modifier(data: ModifierLink, db: Session = Depends(get_db)):
    existing = db.query(MenuItemModifierLink).filter(
        MenuItemModifierLink.menu_item_id == data.menu_item_id,
        MenuItemModifierLink.group_id == data.group_id
    ).first()
    if existing:
        raise HTTPException(400, "Already linked")
    link = MenuItemModifierLink(menu_item_id=data.menu_item_id, group_id=data.group_id)
    db.add(link)
    db.commit()
    return {"ok": True}


@router.delete("/link")
def unlink_modifier(data: ModifierLink, db: Session = Depends(get_db)):
    link = db.query(MenuItemModifierLink).filter(
        MenuItemModifierLink.menu_item_id == data.menu_item_id,
        MenuItemModifierLink.group_id == data.group_id
    ).first()
    if not link:
        raise HTTPException(404, "Link not found")
    db.delete(link)
    db.commit()
    return {"ok": True}
