"""Barcode API — barkod sistemi za zaloge in izdelke."""
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime

from app.core.database import get_db
from app.api.v1.auth import get_current_user

router = APIRouter(prefix="/barcode", tags=["Barkod"])


class BarcodeUpdateRequest(BaseModel):
    barcode: str
    quantity: Optional[float] = None
    action: str = "set"  # set, add, subtract


@router.get("/lookup/{barcode}")
def barcode_lookup(barcode: str, db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Poišči izdelek po barkodi."""
    from app.models.ingredient import Ingredient
    from app.models.menu_item import MenuItem

    # Try ingredients first
    ingredient = db.query(Ingredient).filter(Ingredient.barcode == barcode).first()
    if ingredient:
        return {
            "type": "ingredient",
            "id": ingredient.id,
            "name": ingredient.name,
            "current_stock": getattr(ingredient, 'current_stock', 0),
            "unit": getattr(ingredient, 'unit', 'kg'),
            "price": float(getattr(ingredient, 'cost_per_unit', 0) or 0),
        }

    # Try menu items
    menu_item = db.query(MenuItem).filter(MenuItem.barcode == barcode).first()
    if menu_item:
        return {
            "type": "menu_item",
            "id": menu_item.id,
            "name": menu_item.name,
            "price": float(menu_item.price),
            "category": getattr(menu_item, 'category', ''),
            "is_available": not getattr(menu_item, 'is_out_of_stock', False),
        }

    return {"type": "not_found", "barcode": barcode}


@router.post("/update-stock")
def update_stock(req: BarcodeUpdateRequest, db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Posodobi zalogo po barkodi."""
    from app.models.ingredient import Ingredient
    from app.models.inventory import StockTransaction

    ingredient = db.query(Ingredient).filter(Ingredient.barcode == req.barcode).first()
    if not ingredient:
        return {"error": "Sestavina ni najdena", "barcode": req.barcode}

    old_stock = float(getattr(ingredient, 'current_stock', 0) or 0)
    qty = req.quantity or 0

    if req.action == "add":
        new_stock = old_stock + qty
    elif req.action == "subtract":
        new_stock = max(0, old_stock - qty)
    else:
        new_stock = qty

    ingredient.current_stock = new_stock

    # Log transaction
    tx = StockTransaction(
        ingredient_id=ingredient.id,
        quantity=new_stock - old_stock,
        type="barcode_scan",
        notes=f"Barkod: {req.barcode} | {req.action} {qty}",
    )
    db.add(tx)
    db.commit()

    return {
        "id": ingredient.id,
        "name": ingredient.name,
        "old_stock": old_stock,
        "new_stock": new_stock,
        "unit": getattr(ingredient, 'unit', 'kg'),
        "message": f"Zaloga posodobljena: {old_stock} → {new_stock}",
    }


@router.get("/scan-history")
def scan_history(
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Zgodovina barkod skeniranj."""
    from app.models.inventory import StockTransaction

    txs = db.query(StockTransaction).filter(
        StockTransaction.type == "barcode_scan"
    ).order_by(StockTransaction.created_at.desc()).limit(limit).all()

    from app.models.ingredient import Ingredient
    ingredient_map = {}
    results = []
    for tx in txs:
        ing_id = getattr(tx, 'ingredient_id', 0)
        if ing_id not in ingredient_map:
            ing = db.query(Ingredient).filter(Ingredient.id == ing_id).first()
            ingredient_map[ing_id] = ing.name if ing else 'Neznano'
        results.append({
            "id": tx.id,
            "ingredient_id": ing_id,
            "ingredient_name": ingredient_map[ing_id],
            "quantity": getattr(tx, 'quantity', 0),
            "notes": getattr(tx, 'notes', ''),
            "created_at": tx.created_at.isoformat() if hasattr(tx.created_at, 'isoformat') else str(tx.created_at),
        })

    return {"history": results, "count": len(results)}


@router.post("/generate/{item_type}/{item_id}")
def generate_barcode_label(item_type: str, item_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Generiraj barkodno oznako za izdelek/sestavino."""
    import qrcode
    import base64
    from io import BytesIO

    if item_type == "ingredient":
        from app.models.ingredient import Ingredient
        item = db.query(Ingredient).filter(Ingredient.id == item_id).first()
        if not item:
            return {"error": "Sestavina ni najdena"}
        if not item.barcode:
            item.barcode = f"ING-{item_id:06d}"
            db.commit()
        barcode = item.barcode
        name = item.name
    elif item_type == "menu_item":
        from app.models.menu_item import MenuItem
        item = db.query(MenuItem).filter(MenuItem.id == item_id).first()
        if not item:
            return {"error": "Izdelek ni najdena"}
        if not getattr(item, 'barcode', None):
            item.barcode = f"MENU-{item_id:06d}"
            db.commit()
        barcode = item.barcode
        name = item.name
    else:
        return {"error": "Neznan tip"}

    # Generate QR code image
    qr = qrcode.QRCode(version=1, box_size=8, border=2)
    qr.add_data(barcode)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    buffer = BytesIO()
    img.save(buffer, format='PNG')
    buffer.seek(0)

    return {
        "barcode": barcode,
        "name": name,
        "type": item_type,
        "image": f"data:image/png;base64,{base64.b64encode(buffer.read()).decode()}"
    }
