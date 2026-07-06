from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.invoice import Invoice
from app.models.order import Order, OrderItem
from app.models.customer import Customer
from app.models.branch import Branch
from app.models.settings import Setting
from app.api.v1.audit_log import log_action
from app.core.eracun import generate_eracun_xml
from datetime import datetime, date
import json

router = APIRouter(prefix="/invoices", tags=["invoices"])


def _next_invoice_number(db: Session) -> str:
    year = date.today().year
    key = f"invoice_counter_{year}"
    setting = db.query(Setting).filter(Setting.key == key).first()
    if not setting:
        setting = Setting(key=key, value="1")
        db.add(setting)
        counter = 1
    else:
        counter = int(setting.value) + 1
        setting.value = str(counter)
    db.commit()
    return f"RAČ-{year}-{counter:04d}"


@router.post("/generate/{order_id}")
def generate_invoice(order_id: int, data: dict = {}, db: Session = Depends(get_db)):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(404, "Order not found")
    if order.status not in ("closed", "paid"):
        raise HTTPException(400, "Order must be closed or paid")

    items_data = []
    for oi in db.query(OrderItem).filter(OrderItem.order_id == order.id).all():
        items_data.append({
            "id": oi.id, "item_name": oi.item_name, "quantity": oi.quantity,
            "unit_price": oi.unit_price, "total_price": oi.total_price,
            "tax_rate": oi.tax_rate or 0, "tax_amount": oi.tax_amount or 0,
            "notes": oi.notes, "modifiers": oi.modifiers,
        })

    subtotal = sum(i["total_price"] for i in items_data)
    tax_total = sum(i["tax_amount"] for i in items_data)
    discount = order.discount_amount or 0
    total = order.total or (subtotal - discount)

    buyer_name = data.get("buyer_name", order.customer_name or "")
    buyer_tax_id = data.get("buyer_tax_id", "")
    buyer_address = data.get("buyer_address", "")

    if not buyer_name and order.customer_id:
        cust = db.query(Customer).filter(Customer.id == order.customer_id).first()
        if cust:
            buyer_name = buyer_name or cust.name
            buyer_tax_id = buyer_tax_id or ""
            buyer_address = buyer_address or cust.address or ""

    inv = Invoice(
        invoice_number=_next_invoice_number(db),
        order_id=order.id,
        buyer_name=buyer_name,
        buyer_tax_id=buyer_tax_id,
        buyer_address=buyer_address,
        items=json.dumps(items_data, ensure_ascii=False),
        subtotal=round(subtotal, 2),
        tax_total=round(tax_total, 2),
        discount_amount=round(discount, 2),
        total=round(total, 2),
        status="issued",
        branch_id=order.branch_id,
        due_at=datetime.fromisoformat(data["due_at"]) if data.get("due_at") else None,
        notes=order.notes or "",
    )
    db.add(inv)
    db.commit()
    db.refresh(inv)
    log_action("invoice", inv.id, "issue", f"Izdan račun {inv.invoice_number} za naročilo #{order.id}", db)

    order.invoice_number = inv.id
    db.commit()

    return {
        "id": inv.id, "invoice_number": inv.invoice_number,
        "total": inv.total, "status": inv.status,
    }


@router.get("")
def list_invoices(branch_id: int = 0, status: str = "", db: Session = Depends(get_db)):
    q = db.query(Invoice)
    if branch_id:
        q = q.filter(Invoice.branch_id == branch_id)
    if status:
        q = q.filter(Invoice.status == status)
    q = q.order_by(Invoice.issued_at.desc())
    return [
        {
            "id": inv.id, "invoice_number": inv.invoice_number,
            "order_id": inv.order_id, "buyer_name": inv.buyer_name,
            "buyer_tax_id": inv.buyer_tax_id, "buyer_address": inv.buyer_address,
            "subtotal": inv.subtotal, "tax_total": inv.tax_total,
            "discount_amount": inv.discount_amount, "total": inv.total,
            "status": inv.status,
            "issued_at": inv.issued_at.isoformat() if inv.issued_at else None,
            "due_at": inv.due_at.isoformat() if inv.due_at else None,
            "paid_at": inv.paid_at.isoformat() if inv.paid_at else None,
            "cancelled_at": inv.cancelled_at.isoformat() if inv.cancelled_at else None,
            "branch_id": inv.branch_id,
        }
        for inv in q.all()
    ]


@router.get("/{invoice_id}")
def get_invoice(invoice_id: int, db: Session = Depends(get_db)):
    inv = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not inv:
        raise HTTPException(404, "Invoice not found")
    order = db.query(Order).filter(Order.id == inv.order_id).first() if inv.order_id else None
    return {
        "id": inv.id, "invoice_number": inv.invoice_number,
        "order_id": inv.order_id,
        "order_status": order.status if order else None,
        "order_created_at": order.created_at.isoformat() if order and order.created_at else None,
        "buyer_name": inv.buyer_name, "buyer_tax_id": inv.buyer_tax_id,
        "buyer_address": inv.buyer_address,
        "items": json.loads(inv.items) if inv.items else [],
        "subtotal": inv.subtotal, "tax_total": inv.tax_total,
        "discount_amount": inv.discount_amount, "total": inv.total,
        "status": inv.status,
        "issued_at": inv.issued_at.isoformat() if inv.issued_at else None,
        "due_at": inv.due_at.isoformat() if inv.due_at else None,
        "paid_at": inv.paid_at.isoformat() if inv.paid_at else None,
        "cancelled_at": inv.cancelled_at.isoformat() if inv.cancelled_at else None,
        "branch_id": inv.branch_id, "notes": inv.notes,
    }


@router.put("/{invoice_id}/pay")
def pay_invoice(invoice_id: int, db: Session = Depends(get_db)):
    inv = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not inv:
        raise HTTPException(404, "Invoice not found")
    if inv.status == "cancelled":
        raise HTTPException(400, "Cannot pay a cancelled invoice")
    inv.status = "paid"
    inv.paid_at = datetime.now()
    db.commit()
    log_action("invoice", inv.id, "pay", f"Plačan račun {inv.invoice_number}", db)
    return {"id": inv.id, "status": inv.status}


@router.put("/{invoice_id}/cancel")
def cancel_invoice(invoice_id: int, db: Session = Depends(get_db)):
    inv = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not inv:
        raise HTTPException(404, "Invoice not found")
    if inv.status == "paid":
        raise HTTPException(400, "Cannot cancel a paid invoice — issue a credit note instead")
    inv.status = "cancelled"
    inv.cancelled_at = datetime.now()
    db.commit()
    log_action("invoice", inv.id, "cancel", f"Storniran račun {inv.invoice_number}", db)
    return {"id": inv.id, "status": inv.status}


@router.get("/{invoice_id}/eracun-xml")
def get_eracun_xml(invoice_id: int, db: Session = Depends(get_db)):
    inv = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not inv:
        raise HTTPException(404, "Invoice not found")

    items = json.loads(inv.items) if inv.items else []
    seller_name = "POS Restavracija"
    seller_tax_id = ""
    seller_address = ""

    # Read seller info from settings
    for key in ["company_name", "company_tax_id", "company_address"]:
        s = db.query(Setting).filter(Setting.key == key).first()
        if s:
            if key == "company_name":
                seller_name = s.value
            elif key == "company_tax_id":
                seller_tax_id = s.value
            elif key == "company_address":
                seller_address = s.value

    xml = generate_eracun_xml(
        invoice_number=inv.invoice_number,
        issued_at=inv.issued_at or datetime.now(),
        due_at=inv.due_at,
        buyer_name=inv.buyer_name,
        buyer_tax_id=inv.buyer_tax_id,
        buyer_address=inv.buyer_address,
        seller_name=seller_name,
        seller_tax_id=seller_tax_id,
        seller_address=seller_address,
        items=items,
        subtotal=inv.subtotal,
        tax_total=inv.tax_total,
        discount_amount=inv.discount_amount,
        total=inv.total,
    )

    return Response(content=xml, media_type="application/xml",
                    headers={"Content-Disposition": f'attachment; filename="eracun-{inv.invoice_number}.xml"'})


@router.post("/{invoice_id}/send-eracun")
def send_eracun(invoice_id: int, db: Session = Depends(get_db)):
    inv = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not inv:
        raise HTTPException(404, "Invoice not found")

    items = json.loads(inv.items) if inv.items else []
    seller_name = "POS Restavracija"
    seller_tax_id = ""
    seller_address = ""

    for key in ["company_name", "company_tax_id", "company_address"]:
        s = db.query(Setting).filter(Setting.key == key).first()
        if s:
            if key == "company_name":
                seller_name = s.value
            elif key == "company_tax_id":
                seller_tax_id = s.value
            elif key == "company_address":
                seller_address = s.value

    xml = generate_eracun_xml(
        invoice_number=inv.invoice_number,
        issued_at=inv.issued_at or datetime.now(),
        due_at=inv.due_at,
        buyer_name=inv.buyer_name,
        buyer_tax_id=inv.buyer_tax_id,
        buyer_address=inv.buyer_address,
        seller_name=seller_name,
        seller_tax_id=seller_tax_id,
        seller_address=seller_address,
        items=items,
        subtotal=inv.subtotal,
        tax_total=inv.tax_total,
        discount_amount=inv.discount_amount,
        total=inv.total,
    )

    # Simulate sending (in production: send via eDavki API or third-party service)
    inv.eracun_status = "sent"
    inv.eracun_xml_id = f"XML-{inv.invoice_number}"
    db.commit()
    log_action("invoice", inv.id, "eracun_send", f"eRačun poslan: {inv.invoice_number}", db)

    return {"id": inv.id, "eracun_status": "sent", "xml_length": len(xml)}


@router.get("/stats")
def invoice_stats(branch_id: int = 0, db: Session = Depends(get_db)):
    q = db.query(Invoice)
    if branch_id:
        q = q.filter(Invoice.branch_id == branch_id)
    rows = q.all()
    return {
        "total": len(rows),
        "issued": sum(1 for r in rows if r.status == "issued"),
        "paid": sum(1 for r in rows if r.status == "paid"),
        "cancelled": sum(1 for r in rows if r.status == "cancelled"),
        "total_amount": sum(r.total for r in rows if r.status != "cancelled"),
        "paid_amount": sum(r.total for r in rows if r.status == "paid"),
    }
