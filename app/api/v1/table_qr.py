"""Table QR Code API — QR kode za samostojno naročanje."""
from fastapi import APIRouter, Depends, Query
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional, List

from app.core.database import get_db
from app.api.v1.auth import get_current_user

router = APIRouter(prefix="/table-qr", tags=["QR Kode za mize"])


class QRGenerateRequest(BaseModel):
    table_ids: List[int]
    base_url: Optional[str] = None


@router.get("/{table_id}")
def get_table_qr(table_id: int, db: Session = Depends(get_db)):
    """Generiraj QR kodo za mizo (javni endpoint za stranke)."""
    from app.models.table import Table
    from app.core.qr_generator import generate_table_qr_html

    table = db.query(Table).filter(Table.id == table_id).first()
    if not table:
        return HTMLResponse("<h1>Miza ni najdena</h1>", status_code=404)

    html = generate_table_qr_html(table.id, table.name)
    return HTMLResponse(content=html)


@router.post("/generate")
def generate_qr_codes(req: QRGenerateRequest, db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Generiraj QR kode za izbrane mize."""
    from app.models.table import Table
    from app.core.qr_generator import generate_table_qr, generate_bulk_qr

    tables = db.query(Table).filter(Table.id.in_(req.table_ids)).all()
    if not tables:
        return {"error": "Nobre mize"}

    table_data = [{"id": t.id, "name": t.name} for t in tables]

    # Return individual QR codes as base64
    qr_codes = []
    for t in tables:
        qr_b64 = generate_table_qr(t.id, req.base_url)
        qr_codes.append({
            "table_id": t.id,
            "table_name": t.name,
            "qr_image": f"data:image/png;base64,{qr_b64}",
            "url": f"/table-order/{t.id}"
        })

    return {"qr_codes": qr_codes, "count": len(qr_codes)}


@router.get("/print/all")
def print_all_qr(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Generiraj HTML za tiskanje vseh QR kod."""
    from app.models.table import Table
    from app.core.qr_generator import generate_bulk_qr

    tables = db.query(Table).filter(Table.is_active == True).order_by(Table.name).all()
    table_data = [{"id": t.id, "name": t.name} for t in tables]

    html = generate_bulk_qr(table_data)
    return HTMLResponse(content=html)


@router.get("/menu/{table_id}")
def get_table_menu(table_id: int, db: Session = Depends(get_db)):
    """Jedilnik za mizo (javni endpoint)."""
    from app.models.table import Table
    from app.models.menu_item import MenuItem
    from app.models.modifier import Modifier

    table = db.query(Table).filter(Table.id == table_id).first()
    if not table:
        return {"error": "Miza ni najdena"}

    items = db.query(MenuItem).filter(MenuItem.is_active == True).order_by(MenuItem.category, MenuItem.name).all()

    menu = []
    for item in items:
        menu.append({
            "id": item.id,
            "name": item.name,
            "description": getattr(item, 'description', '') or '',
            "price": float(item.price),
            "category": getattr(item, 'category', '') or 'Drugo',
            "image_url": getattr(item, 'image_url', None),
            "is_available": not getattr(item, 'is_out_of_stock', False),
        })

    # Group by category
    categories = {}
    for item in menu:
        cat = item['category']
        if cat not in categories:
            categories[cat] = []
        categories[cat].append(item)

    return {
        "table_id": table_id,
        "table_name": table.name,
        "categories": categories,
    }


@router.post("/order/{table_id}")
def submit_table_order(table_id: int, order_data: dict, db: Session = Depends(get_db)):
    """Stranka odda naročilo z mize (javni endpoint)."""
    from app.models.table import Table
    from app.models.order import Order, OrderItem

    table = db.query(Table).filter(Table.id == table_id).first()
    if not table:
        return {"error": "Miza ni najdena"}

    items = order_data.get("items", [])
    notes = order_data.get("notes", "")

    if not items:
        return {"error": "Ni artiklov"}

    # Create order
    order = Order(
        table_id=table_id,
        status='pending',
        notes=notes,
        source='qr_self_service',
    )
    db.add(order)
    db.flush()

    total = 0
    for item_data in items:
        from app.models.menu_item import MenuItem
        menu_item = db.query(MenuItem).filter(MenuItem.id == item_data.get("id")).first()
        if menu_item:
            qty = item_data.get("quantity", 1)
            oi = OrderItem(
                order_id=order.id,
                menu_item_id=menu_item.id,
                name=menu_item.name,
                price=float(menu_item.price),
                quantity=qty,
                notes=item_data.get("notes", ""),
            )
            db.add(oi)
            total += float(menu_item.price) * qty

    order.total = total
    db.commit()

    return {
        "order_id": order.id,
        "table_name": table.name,
        "total": total,
        "message": "Naročilo oddano! Kmalu pride k vam.",
    }
