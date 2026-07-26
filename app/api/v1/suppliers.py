from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List
from app.core.database import get_db
from app.models.supplier import Supplier, PurchaseOrder, PurchaseOrderItem
from app.models.inventory import Ingredient, StockTransaction
from app.api.v1.audit_log import log_action
from app.schemas.supplier import CreateSupplier, UpdateSupplier, CreateOrder, ApproveOrder, ReceiveOrder
from datetime import datetime

router = APIRouter(prefix="/suppliers", tags=["suppliers"])


@router.get("")
def list_suppliers(branch_id: int = 0, db: Session = Depends(get_db)):
    q = db.query(Supplier).order_by(Supplier.name)
    if branch_id:
        q = q.filter(Supplier.branch_id == branch_id)
    suppliers = q.all()
    return [{"id": s.id, "name": s.name, "contact": s.contact, "phone": s.phone,
             "email": s.email, "address": s.address, "notes": s.notes, "branch_id": s.branch_id} for s in suppliers]


@router.post("")
def create_supplier(data: CreateSupplier, db: Session = Depends(get_db)):
    s = Supplier(name=data.name, contact=data.contact,
                 phone=data.phone, email=data.email,
                 address=data.address, notes=data.notes,
                 branch_id=data.branch_id)
    db.add(s)
    db.commit()
    db.refresh(s)
    return {"id": s.id, "name": s.name}


@router.put("/{supplier_id}")
def update_supplier(supplier_id: int, data: UpdateSupplier, db: Session = Depends(get_db)):
    s = db.query(Supplier).filter(Supplier.id == supplier_id).first()
    if not s:
        raise HTTPException(404, "Supplier not found")
    update_data = data.model_dump(exclude_unset=True)
    for k, v in update_data.items():
        setattr(s, k, v)
    db.commit()
    return {"ok": True}


@router.delete("/{supplier_id}")
def delete_supplier(supplier_id: int, db: Session = Depends(get_db)):
    s = db.query(Supplier).filter(Supplier.id == supplier_id).first()
    if not s:
        raise HTTPException(404, "Supplier not found")
    db.delete(s)
    db.commit()
    return {"ok": True}


# ── Purchase Orders (must be before /{supplier_id} catch-all) ──

def _po_json(po: PurchaseOrder, db: Session):
    items = db.query(PurchaseOrderItem).filter(PurchaseOrderItem.po_id == po.id).all()
    sup = db.query(Supplier).filter(Supplier.id == po.supplier_id).first() if po.supplier_id else None
    return {
        "id": po.id, "supplier_id": po.supplier_id,
        "supplier_name": sup.name if sup else "—",
        "status": po.status, "total": po.total,
        "notes": po.notes, "created_at": str(po.created_at),
        "created_by": po.created_by,
        "approved_at": str(po.approved_at) if po.approved_at else None,
        "received_at": str(po.received_at) if po.received_at else None,
        "items": [{
            "id": i.id, "ingredient_id": i.ingredient_id,
            "ingredient_name": db.query(Ingredient.name).filter(Ingredient.id == i.ingredient_id).scalar() or "—",
            "quantity": i.quantity, "unit_price": i.unit_price,
            "received_quantity": i.received_quantity or 0,
        } for i in items]
    }


@router.get("/orders")
def list_orders(status: str = None, db: Session = Depends(get_db)):
    q = db.query(PurchaseOrder)
    if status:
        q = q.filter(PurchaseOrder.status == status)
    orders = q.order_by(PurchaseOrder.created_at.desc()).all()
    return [_po_json(po, db) for po in orders]


@router.get("/orders/{po_id}")
def get_order(po_id: int, db: Session = Depends(get_db)):
    po = db.query(PurchaseOrder).filter(PurchaseOrder.id == po_id).first()
    if not po:
        raise HTTPException(404, "PO not found")
    return _po_json(po, db)


@router.post("/orders")
def create_order(data: CreateOrder, db: Session = Depends(get_db)):
    total = 0
    items = []
    for idata in data.items:
        ing = db.query(Ingredient).filter(Ingredient.id == idata["ingredient_id"]).first()
        if not ing:
            raise HTTPException(404, f"Ingredient {idata['ingredient_id']} not found")
        up = idata.get("unit_price", ing.cost_per_unit)
        qty = idata["quantity"]
        item = PurchaseOrderItem(ingredient_id=ing.id, quantity=qty, unit_price=up)
        items.append(item)
        total += up * qty
    po = PurchaseOrder(
        supplier_id=data.supplier_id,
        status="pending",
        total=round(total, 2),
        notes=data.notes,
        created_by=data.created_by,
        items=items
    )
    db.add(po)
    db.flush()
    log_action(db, "po_created", "purchase_order", po.id,
               details=f"PO #{po.id}: {len(items)} items, total {po.total}")
    db.commit()
    db.refresh(po)
    return {"id": po.id, "total": po.total, "status": po.status}


@router.post("/orders/{po_id}/approve")
def approve_order(po_id: int, data: ApproveOrder = None, db: Session = Depends(get_db)):
    po = db.query(PurchaseOrder).filter(PurchaseOrder.id == po_id, PurchaseOrder.status == "pending").first()
    if not po:
        raise HTTPException(400, "PO not found or not pending")
    po.status = "approved"
    po.approved_at = datetime.now()
    log_action(db, "po_approved", "purchase_order", po.id, details=f"PO #{po.id} approved")
    db.commit()
    return {"status": "approved"}


@router.post("/orders/{po_id}/receive")
def receive_order(po_id: int, data: ReceiveOrder = None, db: Session = Depends(get_db)):
    po = db.query(PurchaseOrder).filter(PurchaseOrder.id == po_id, PurchaseOrder.status.in_(["approved", "pending"])).first()
    if not po:
        raise HTTPException(400, "PO not found or already received/cancelled")
    items = db.query(PurchaseOrderItem).filter(PurchaseOrderItem.po_id == po.id).all()
    partials = data.items if data else None
    for item in items:
        ing = db.query(Ingredient).filter(Ingredient.id == item.ingredient_id).first()
        if not ing:
            continue
        receive_qty = 0
        if partials:
            found = [p for p in partials if p.get("item_id") == item.id]
            if found:
                receive_qty = float(found[0].get("received_quantity", 0))
        else:
            receive_qty = item.quantity - (item.received_quantity or 0)
        if receive_qty <= 0:
            continue
        item.received_quantity = (item.received_quantity or 0) + receive_qty
        ing.stock += receive_qty
        tx = StockTransaction(
            ingredient_id=ing.id, type="purchase",
            quantity=receive_qty,
            note=f"PO #{po.id} - {ing.name}"
        )
        db.add(tx)
    all_received = all(
        (i.received_quantity or 0) >= i.quantity for i in items
    )
    if all_received:
        po.status = "received"
        po.received_at = datetime.now()
    else:
        po.status = "approved"
    log_action(db, "po_received", "purchase_order", po.id,
               details=f"PO #{po.id} partially received")
    db.commit()
    return {"status": po.status}


@router.post("/orders/{po_id}/cancel")
def cancel_order(po_id: int, db: Session = Depends(get_db)):
    po = db.query(PurchaseOrder).filter(PurchaseOrder.id == po_id, PurchaseOrder.status.in_(["pending", "approved"])).first()
    if not po:
        raise HTTPException(400, "PO not found or already done")
    po.status = "cancelled"
    log_action(db, "po_cancelled", "purchase_order", po.id, details=f"PO #{po.id} cancelled")
    db.commit()
    return {"status": "cancelled"}


@router.post("/orders/auto-generate")
def auto_generate_orders(supplier_id: int = 0, db: Session = Depends(get_db)):
    q = db.query(Ingredient).filter(
        Ingredient.stock <= Ingredient.min_stock,
        Ingredient.min_stock > 0
    )
    if supplier_id:
        q = q.filter(Ingredient.supplier_id == supplier_id)
    low_ings = q.all()
    if not low_ings:
        return {"orders": [], "message": "No low-stock ingredients"}

    from collections import defaultdict
    by_supplier = defaultdict(list)
    for ing in low_ings:
        by_supplier[ing.supplier_id].append(ing)

    suppliers = {s.id: s for s in db.query(Supplier).all()}
    created_orders = []

    for sid, ings in by_supplier.items():
        items = []
        for ing in ings:
            restock_qty = max(ing.min_stock * 3 - ing.stock, ing.min_stock)
            items.append({
                "ingredient_id": ing.id,
                "quantity": round(restock_qty, 1),
                "unit_price": ing.cost_per_unit
            })
        total = round(sum(i["quantity"] * i["unit_price"] for i in items), 2)
        supplier = suppliers.get(sid)
        po = PurchaseOrder(
            supplier_id=sid, status="pending", total=total,
            notes=f"Auto-generated for {supplier.name if supplier else 'Unknown'}"
        )
        db.add(po)
        db.flush()
        for idata in items:
            db.add(PurchaseOrderItem(
                po_id=po.id, ingredient_id=idata["ingredient_id"],
                quantity=idata["quantity"], unit_price=idata["unit_price"]
            ))
        log_action(db, "po_auto_generated", "purchase_order", po.id,
                   details=f"Auto PO #{po.id} for {supplier.name if supplier else '?'}: {len(items)} items, total {total}")
        created_orders.append({"id": po.id, "supplier": supplier.name if supplier else "?", "total": total, "items": len(items)})

    db.commit()
    return {"orders": created_orders, "message": f"Created {len(created_orders)} PO(s)"}


@router.get("/{supplier_id}")
def get_supplier(supplier_id: int, db: Session = Depends(get_db)):
    s = db.query(Supplier).filter(Supplier.id == supplier_id).first()
    if not s:
        raise HTTPException(404, "Supplier not found")
    ingredients = db.query(Ingredient).filter(Ingredient.supplier_id == supplier_id).all()
    return {
        "id": s.id, "name": s.name, "contact": s.contact, "phone": s.phone,
        "email": s.email, "address": s.address, "notes": s.notes, "branch_id": s.branch_id,
        "ingredients": [{"id": i.id, "name": i.name, "unit": i.unit, "stock": i.stock, "min_stock": i.min_stock, "cost_per_unit": i.cost_per_unit} for i in ingredients]
    }


@router.get("/{supplier_id}/ingredients")
def supplier_ingredients(supplier_id: int, db: Session = Depends(get_db)):
    ingredients = db.query(Ingredient).filter(Ingredient.supplier_id == supplier_id).order_by(Ingredient.name).all()
    return [{"id": i.id, "name": i.name, "unit": i.unit, "category": i.category, "stock": i.stock, "min_stock": i.min_stock, "cost_per_unit": i.cost_per_unit} for i in ingredients]
    q = db.query(Ingredient).filter(
        Ingredient.stock <= Ingredient.min_stock,
        Ingredient.min_stock > 0
    )
    if supplier_id:
        q = q.filter(Ingredient.supplier_id == supplier_id)
    low_ings = q.all()
    if not low_ings:
        return {"orders": [], "message": "No low-stock ingredients"}

    # Group by supplier
    from collections import defaultdict
    by_supplier = defaultdict(list)
    for ing in low_ings:
        by_supplier[ing.supplier_id].append(ing)

    suppliers = {s.id: s for s in db.query(Supplier).all()}
    created_orders = []

    for sid, ings in by_supplier.items():
        items = []
        for ing in ings:
            restock_qty = max(ing.min_stock * 3 - ing.stock, ing.min_stock)
            items.append({
                "ingredient_id": ing.id,
                "quantity": round(restock_qty, 1),
                "unit_price": ing.cost_per_unit
            })
        total = round(sum(i["quantity"] * i["unit_price"] for i in items), 2)
        supplier = suppliers.get(sid)
        po = PurchaseOrder(
            supplier_id=sid, status="pending", total=total,
            notes=f"Auto-generated for {supplier.name if supplier else 'Unknown'}"
        )
        db.add(po)
        db.flush()
        for idata in items:
            db.add(PurchaseOrderItem(
                po_id=po.id, ingredient_id=idata["ingredient_id"],
                quantity=idata["quantity"], unit_price=idata["unit_price"]
            ))
        log_action(db, "po_auto_generated", "purchase_order", po.id,
                   details=f"Auto PO #{po.id} for {supplier.name if supplier else '?'}: {len(items)} items, total {total}")
        created_orders.append({"id": po.id, "supplier": supplier.name if supplier else "?", "total": total, "items": len(items)})

    db.commit()
    return {"orders": created_orders, "message": f"Created {len(created_orders)} PO(s)"}


class BulkPORequest(BaseModel):
    ids: List[int]


class BulkPOStatusRequest(BaseModel):
    ids: List[int]
    status: str


@router.post('/orders/bulk/status')
def bulk_update_po_status(body: BulkPOStatusRequest, db: Session = Depends(get_db)):
    orders = db.query(PurchaseOrder).filter(PurchaseOrder.id.in_(body.ids)).all()
    valid = {'pending', 'approved', 'received', 'cancelled'}
    if body.status not in valid:
        raise HTTPException(400, f'Invalid status. Must be one of: {chr(44).join(valid)}')
    count = 0
    for po in orders:
        po.status = body.status
        if body.status == 'received':
            po.received_at = datetime.utcnow()
        count += 1
    db.commit()
    log_action(db, 'bulk_po_status', 'purchase_order', 0,
               details=f'Updated {count} POs to {chr(39)}' + body.status + chr(39))
    return {'updated': count}


@router.post('/orders/bulk/delete')
def bulk_delete_pos(body: BulkPORequest, db: Session = Depends(get_db)):
    orders = db.query(PurchaseOrder).filter(PurchaseOrder.id.in_(body.ids)).all()
    count = 0
    for po in orders:
        if po.status == 'pending':
            db.query(PurchaseOrderItem).filter(PurchaseOrderItem.po_id == po.id).delete()
            db.delete(po)
            count += 1
    db.commit()
    log_action(db, 'bulk_delete_pos', 'purchase_order', 0,
               details=f'Deleted {count} pending POs')
    return {'deleted': count}


@router.post('/bulk/delete')
def bulk_delete_suppliers(body: BulkPORequest, db: Session = Depends(get_db)):
    suppliers_q = db.query(Supplier).filter(Supplier.id.in_(body.ids)).all()
    count = 0
    for s in suppliers_q:
        has_pos = db.query(PurchaseOrder).filter(PurchaseOrder.supplier_id == s.id).count()
        if has_pos == 0:
            db.delete(s)
            count += 1
    db.commit()
    log_action(db, 'bulk_delete_suppliers', 'supplier', 0,
               details=f'Deleted {count} suppliers')
    return {'deleted': count, 'skipped': len(suppliers_q) - count}
