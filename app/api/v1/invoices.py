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
from app.core.eracun import generate_eracun_xml, validate_eracun_xml, generate_furs_payload
from app.core.furs_zapos import fiscalize_zapos
from app.core.croatian_fiscal import fiscalize_croatian
from app.schemas.fiscal import FursZaposRequest, CroatianFiscalRequest
from datetime import datetime, date
import json
import logging

logger = logging.getLogger(__name__)

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
def generate_invoice(order_id: int, db: Session = Depends(get_db)):
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

    buyer_name = order.customer_name or ""
    buyer_tax_id = ""
    buyer_address = ""

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
        due_at=None,
        notes=order.notes or "",
    )
    db.add(inv)
    db.commit()
    db.refresh(inv)
    log_action(db, "issue", "invoice", inv.id, details=f"Izdan račun {inv.invoice_number} za naročilo #{order.id}")

    order.invoice_number = inv.id
    db.commit()

    auto_send = db.query(Setting).filter(Setting.key == "furs_auto_send").first()
    if auto_send and auto_send.value == "true":
        seller_name, seller_tax_id, seller_address = _read_seller(db)
        xml = generate_eracun_xml(
            invoice_number=inv.invoice_number, issued_at=inv.issued_at or datetime.now(),
            due_at=inv.due_at, buyer_name=buyer_name, buyer_tax_id=buyer_tax_id,
            buyer_address=buyer_address, seller_name=seller_name, seller_tax_id=seller_tax_id,
            seller_address=seller_address, items=items_data, subtotal=round(subtotal, 2),
            tax_total=round(tax_total, 2), discount_amount=round(discount, 2), total=round(total, 2),
        )
        inv.eracun_status = "sent"
        inv.eracun_xml_id = f"XML-{inv.invoice_number}"
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
    log_action(db, "pay", "invoice", inv.id, details=f"Plačan račun {inv.invoice_number}")
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
    log_action(db, "cancel", "invoice", inv.id, details=f"Storniran račun {inv.invoice_number}")
    return {"id": inv.id, "status": inv.status}


@router.post("/{invoice_id}/credit-note")
def create_credit_note(invoice_id: int, data: dict = None, db: Session = Depends(get_db)):
    inv = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not inv:
        raise HTTPException(404, "Invoice not found")
    if inv.status == "cancelled":
        raise HTTPException(400, "Invoice is already cancelled")
    if inv.status != "paid":
        raise HTTPException(400, "Credit notes can only be issued for paid invoices")

    reason = (data or {}).get("reason", "Storno po zahtevi kupca")
    items_data = json.loads(inv.items) if inv.items else []

    credit_items = []
    for item in items_data:
        credit_items.append({
            **item,
            "quantity": -abs(item.get("quantity", 1)),
            "total_price": -abs(item.get("total_price", 0)),
            "tax_amount": -abs(item.get("tax_amount", 0)),
        })

    credit_number = _next_invoice_number(db)
    credit = Invoice(
        invoice_number=credit_number,
        order_id=inv.order_id,
        buyer_name=inv.buyer_name,
        buyer_tax_id=inv.buyer_tax_id,
        buyer_address=inv.buyer_address,
        items=json.dumps(credit_items, ensure_ascii=False),
        subtotal=-abs(inv.subtotal),
        tax_total=-abs(inv.tax_total),
        discount_amount=0,
        total=-abs(inv.total),
        status="issued",
        branch_id=inv.branch_id,
        notes=f"Dobropis za {inv.invoice_number}: {reason}",
        credit_note_ref=inv.id,
        credit_reason=reason,
    )
    db.add(credit)
    db.commit()
    db.refresh(credit)

    log_action(db, "credit_note", "invoice", credit.id,
               details=f"Izdan dobropis {credit.invoice_number} za {inv.invoice_number}: {reason}")

    return {
        "id": credit.id, "invoice_number": credit.invoice_number,
        "total": credit.total, "reason": reason, "ref_invoice": inv.invoice_number,
    }


@router.get("/{invoice_id}/eracun-xml")
def get_eracun_xml(invoice_id: int, db: Session = Depends(get_db)):
    inv = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not inv:
        raise HTTPException(404, "Invoice not found")

    items = json.loads(inv.items) if inv.items else []
    seller_name, seller_tax_id, seller_address = _read_seller(db)

    invoice_type = "381" if inv.credit_note_ref else "380"
    credit_ref = ""
    if inv.credit_note_ref:
        ref_inv = db.query(Invoice).filter(Invoice.id == inv.credit_note_ref).first()
        credit_ref = ref_inv.invoice_number if ref_inv else ""

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
        invoice_type_code=invoice_type,
        credit_note_ref=credit_ref,
    )

    return Response(content=xml, media_type="application/xml",
                    headers={"Content-Disposition": f'attachment; filename="eracun-{inv.invoice_number}.xml"'})


@router.post("/{invoice_id}/send-eracun")
def send_eracun(invoice_id: int, db: Session = Depends(get_db)):
    inv = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not inv:
        raise HTTPException(404, "Invoice not found")

    items = json.loads(inv.items) if inv.items else []
    seller_name, seller_tax_id, seller_address = _read_seller(db)

    invoice_type = "381" if inv.credit_note_ref else "380"
    credit_ref = ""
    if inv.credit_note_ref:
        ref_inv = db.query(Invoice).filter(Invoice.id == inv.credit_note_ref).first()
        credit_ref = ref_inv.invoice_number if ref_inv else ""

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
        invoice_type_code=invoice_type,
        credit_note_ref=credit_ref,
    )

    # Simulate sending (in production: send via eDavki API or third-party service)
    inv.eracun_status = "sent"
    inv.eracun_xml_id = f"XML-{inv.invoice_number}"
    db.commit()
    log_action(db, "eracun_send", "invoice", inv.id, details=f"eRačun poslan: {inv.invoice_number}")

    return {"id": inv.id, "eracun_status": "sent", "xml_length": len(xml)}


@router.get("/{invoice_id}/validate")
def validate_invoice_eracun(invoice_id: int, db: Session = Depends(get_db)):
    inv = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not inv:
        raise HTTPException(404, "Invoice not found")

    items = json.loads(inv.items) if inv.items else []
    seller_name, seller_tax_id, seller_address = _read_seller(db)

    invoice_type = "381" if inv.credit_note_ref else "380"
    credit_ref = ""
    if inv.credit_note_ref:
        ref_inv = db.query(Invoice).filter(Invoice.id == inv.credit_note_ref).first()
        credit_ref = ref_inv.invoice_number if ref_inv else ""

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
        invoice_type_code=invoice_type,
        credit_note_ref=credit_ref,
    )

    validation = validate_eracun_xml(xml)
    payload = generate_furs_payload(xml)

    return {
        "valid": validation["valid"],
        "errors": validation.get("errors", []),
        "hash": payload["invoiceHash"],
        "uuid": payload["uuid"],
        "xml_length": len(xml),
    }


@router.post("/bulk/send-eracun")
def bulk_send_eracun(data: dict, db: Session = Depends(get_db)):
    ids = data.get("ids", [])
    if not ids:
        raise HTTPException(400, "No invoice IDs provided")

    results = []
    for inv_id in ids:
        inv = db.query(Invoice).filter(Invoice.id == inv_id).first()
        if not inv or inv.eracun_status == "sent":
            continue

        items = json.loads(inv.items) if inv.items else []
        seller_name, seller_tax_id, seller_address = _read_seller(db)

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

        inv.eracun_status = "sent"
        inv.eracun_xml_id = f"XML-{inv.invoice_number}"
        results.append({"id": inv.id, "invoice_number": inv.invoice_number, "status": "sent"})
        log_action(db, "eracun_send", "invoice", inv.id, details=f"eRačun poslan: {inv.invoice_number}")

    db.commit()
    return {"sent": len(results), "results": results}


@router.post("/bulk/status")
def bulk_update_status(data: dict, db: Session = Depends(get_db)):
    ids = data.get("ids", [])
    status = data.get("status", "")
    if not ids or status not in ("pending", "sent", "error"):
        raise HTTPException(400, "Invalid ids or status")

    count = 0
    for inv_id in ids:
        inv = db.query(Invoice).filter(Invoice.id == inv_id).first()
        if inv:
            inv.eracun_status = status
            count += 1
    db.commit()
    return {"updated": count}


@router.post("/bulk/delete")
def bulk_delete_invoices(data: dict, db: Session = Depends(get_db)):
    ids = data.get("ids", [])
    if not ids:
        raise HTTPException(400, "No invoice IDs provided")

    count = 0
    for inv_id in ids:
        inv = db.query(Invoice).filter(Invoice.id == inv_id).first()
        if inv and inv.status != "paid":
            db.delete(inv)
            count += 1
    db.commit()
    return {"deleted": count}


@router.get("/export-xml")
def export_all_eracun_xml(branch_id: int = 0, db: Session = Depends(get_db)):
    q = db.query(Invoice).filter(Invoice.eracun_status == "sent")
    if branch_id:
        q = q.filter(Invoice.branch_id == branch_id)
    invoices = q.all()
    if not invoices:
        raise HTTPException(404, "No sent e-invoices found")

    seller_name, seller_tax_id, seller_address = _read_seller(db)
    parts = []
    for inv in invoices:
        items = json.loads(inv.items) if inv.items else []
        invoice_type = "381" if inv.credit_note_ref else "380"
        credit_ref = ""
        if inv.credit_note_ref:
            ref_inv = db.query(Invoice).filter(Invoice.id == inv.credit_note_ref).first()
            credit_ref = ref_inv.invoice_number if ref_inv else ""

        xml = generate_eracun_xml(
            invoice_number=inv.invoice_number, issued_at=inv.issued_at or datetime.now(),
            due_at=inv.due_at, buyer_name=inv.buyer_name, buyer_tax_id=inv.buyer_tax_id,
            buyer_address=inv.buyer_address, seller_name=seller_name, seller_tax_id=seller_tax_id,
            seller_address=seller_address, items=items, subtotal=inv.subtotal,
            tax_total=inv.tax_total, discount_amount=inv.discount_amount, total=inv.total,
            invoice_type_code=invoice_type, credit_note_ref=credit_ref,
        )
        parts.append(f"<!-- {inv.invoice_number} -->\n{xml}")

    combined = '<?xml version="1.0" encoding="UTF-8"?>\n<Batch>\n' + "\n".join(parts) + "\n</Batch>"
    return Response(content=combined, media_type="application/xml",
                    headers={"Content-Disposition": f'attachment; filename="eracun-batch-{date.today()}.xml"'})


def _read_seller(db: Session) -> tuple[str, str, str]:
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
    return seller_name, seller_tax_id, seller_address


@router.post("/{invoice_id}/furs-zapos")
def fiscalize_invoice_furs_zapos(invoice_id: int, req: FursZaposRequest, db: Session = Depends(get_db)):
    inv = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not inv:
        raise HTTPException(404, "Invoice not found")
    if inv.furs_zapos_status == "fiscalized":
        raise HTTPException(400, "Invoice already fiscalized with FURS ZAPOS")

    items_data = json.loads(inv.items) if inv.items else []
    seller_name, seller_tax_id, seller_address = _read_seller(db)

    try:
        result = fiscalize_zapos(
            tax_number=req.tax_number,
            invoice_number=inv.invoice_number,
            issued_at=inv.issued_at or datetime.now(),
            items=items_data,
            subtotal=inv.subtotal,
            tax_total=inv.tax_total,
            total=inv.total,
            payment_method=req.payment_method,
            operator_id=req.operator_id,
            private_key_path=req.private_key_path,
            cert_path=req.cert_path,
            key_path=req.key_path,
            env=req.environment,
        )
    except Exception as e:
        logger.error("FURS ZAPOS fiscalization error: %s", e)
        raise HTTPException(500, "Fiscalization failed")

    if result["success"]:
        inv.furs_zapos_status = "fiscalized"
        inv.furs_zapos_eor = result.get("eor", "")
        db.commit()
        log_action(db, "furs_zapos", "invoice", inv.id, details=f"FURS ZAPOS: {inv.invoice_number}")
    else:
        inv.furs_zapos_status = "error"
        db.commit()

    return {
        "success": result["success"],
        "eor": result.get("eor", ""),
        "zoi": result.get("zoi", ""),
        "qr_data": result.get("qr_data", ""),
        "errors": result.get("errors", []),
        "note": result.get("note", ""),
    }


@router.post("/{invoice_id}/croatian-fiscal")
def fiscalize_invoice_croatian(invoice_id: int, req: CroatianFiscalRequest, db: Session = Depends(get_db)):
    inv = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not inv:
        raise HTTPException(404, "Invoice not found")
    if inv.croatian_jir:
        raise HTTPException(400, "Invoice already fiscalized with Croatian CIS")

    items_data = json.loads(inv.items) if inv.items else []

    try:
        result = fiscalize_croatian(
            oib=req.oib,
            invoice_number=inv.invoice_number,
            issued_at=inv.issued_at or datetime.now(),
            items=items_data,
            subtotal=inv.subtotal,
            tax_total=inv.tax_total,
            total=inv.total,
            payment_method=req.payment_method,
            operator_id=req.operator_id,
            private_key_path=req.private_key_path,
            cert_path=req.cert_path,
            key_path=req.key_path,
            env=req.environment,
        )
    except Exception as e:
        logger.error("Croatian fiscalization error: %s", e)
        raise HTTPException(500, "Fiscalization failed")

    if result["success"]:
        inv.croatian_zki = result.get("zki", "")
        inv.croatian_jir = result.get("jir", "")
        db.commit()
        log_action(db, "croatian_fiscal", "invoice", inv.id, details=f"CIS: {inv.invoice_number}")
    else:
        inv.croatian_jir = "error"
        db.commit()

    return {
        "success": result["success"],
        "jir": result.get("jir", ""),
        "zki": result.get("zki", ""),
        "errors": result.get("errors", []),
        "note": result.get("note", ""),
    }


@router.get("/{invoice_id}/fiscal-status")
def get_fiscal_status(invoice_id: int, db: Session = Depends(get_db)):
    inv = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not inv:
        raise HTTPException(404, "Invoice not found")

    return {
        "invoice_id": inv.id,
        "invoice_number": inv.invoice_number,
        "furs_zapos_status": inv.furs_zapos_status or "",
        "furs_zapos_eor": inv.furs_zapos_eor or "",
        "croatian_zki": inv.croatian_zki or "",
        "croatian_jir": inv.croatian_jir or "",
        "eracun_status": inv.eracun_status or "",
    }


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
        "eracun_pending": sum(1 for r in rows if r.eracun_status == "pending"),
        "eracun_sent": sum(1 for r in rows if r.eracun_status == "sent"),
    }
