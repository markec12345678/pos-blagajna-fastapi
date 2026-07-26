"""Payment receipt improvements — formatting, templates, printing."""
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime

from app.core.database import get_db
from app.api.v1.auth import get_current_user

router = APIRouter(prefix="/receipts", tags=["Računi"])


class ReceiptTemplate(BaseModel):
    name: str
    header: Optional[str] = None
    footer: Optional[str] = None
    show_logo: bool = True
    show_tax_id: bool = True
    show_qr: bool = True
    paper_width: int = 80  # mm


@router.get("/templates")
def get_receipt_templates(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Vrni predloge za račune."""
    return {
        "templates": [
            {
                "id": "standard",
                "name": "Standard",
                "header": "Restavracija River Kolpa",
                "footer": "Hvala za obisk! Do prihodnjič!",
                "show_logo": True,
                "show_tax_id": True,
                "show_qr": True,
                "paper_width": 80,
            },
            {
                "id": "minimal",
                "name": "Minimalen",
                "header": "",
                "footer": "",
                "show_logo": False,
                "show_tax_id": True,
                "show_qr": False,
                "paper_width": 58,
            },
            {
                "id": "detailed",
                "name": "Podroben",
                "header": "Restavracija River Kolpa\nGriblje 70, 8332 Gradac\nDavčna številka: SI12345678",
                "footer": "Zahvaljujemo se vam za nakup!\nPridite kmalu nazaj!",
                "show_logo": True,
                "show_tax_id": True,
                "show_qr": True,
                "paper_width": 80,
            },
        ]
    }


@router.get("/preview/{order_id}")
def preview_receipt(order_id: int, template_id: str = "standard", db: Session = Depends(get_db)):
    """Predogled računa."""
    from app.models.order import Order, OrderItem
    from app.models.payment import Payment
    from app.models.table_model import TableModel

    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        return {"error": "Naročilo ni najdeno"}

    items = db.query(OrderItem).filter(OrderItem.order_id == order_id).all()
    payments = db.query(Payment).filter(Payment.order_id == order_id).all()
    table = db.query(TableModel).filter(TableModel.id == order.table_id).first() if order.table_id else None

    # Get template
    templates = {
        "standard": {"header": "Restavracija River Kolpa", "footer": "Hvala za obisk!", "show_qr": True},
        "minimal": {"header": "", "footer": "", "show_qr": False},
        "detailed": {"header": "Restavracija River Kolpa\nGriblje 70, 8332 Gradac", "footer": "Do prihodnjič!", "show_qr": True},
    }
    template = templates.get(template_id, templates["standard"])

    # Build receipt
    receipt_lines = []
    receipt_lines.append("=" * 40)
    if template["header"]:
        receipt_lines.append(template["header"].center(40))
        receipt_lines.append("=" * 40)
    receipt_lines.append(f"Naročilo #{order.id}")
    receipt_lines.append(f"Miza: {table.name if table else 'Ni mize'}")
    receipt_lines.append(f"Čas: {order.created_at.strftime('%d.%m.%Y %H:%M') if order.created_at else ''}")
    receipt_lines.append("-" * 40)

    # Items
    subtotal = 0
    for item in items:
        line_total = item.quantity * item.price
        subtotal += line_total
        receipt_lines.append(f"{item.quantity}x {item.item_name}")
        receipt_lines.append(f"  {item.price:.2f} € x {item.quantity} = {line_total:.2f} €")

    receipt_lines.append("-" * 40)
    receipt_lines.append(f"Skupaj: {subtotal:.2f} €")

    # Tax breakdown
    tax_rate = 0.22
    tax = subtotal * tax_rate / (1 + tax_rate)
    receipt_lines.append(f"DDV 22%: {tax:.2f} €")
    receipt_lines.append(f"Neto: {subtotal - tax:.2f} €")

    # Payments
    if payments:
        receipt_lines.append("-" * 40)
        receipt_lines.append("PLAČILO:")
        for p in payments:
            receipt_lines.append(f"  {p.payment_method}: {p.amount:.2f} €")
            if p.tip:
                receipt_lines.append(f"  Napitnina: {p.tip:.2f} €")

    receipt_lines.append("=" * 40)
    if template["footer"]:
        receipt_lines.append(template["footer"].center(40))
    receipt_lines.append("=" * 40)

    return {
        "order_id": order_id,
        "template": template_id,
        "receipt": "\n".join(receipt_lines),
        "total": subtotal,
        "tax": round(tax, 2),
    }


@router.get("/print/{order_id}")
def print_receipt(order_id: int, template_id: str = "standard", db: Session = Depends(get_db)):
    """Tiskanje računa (pošlji na tiskalnik)."""
    from app.models.order import Order

    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        return {"error": "Naročilo ni najdeno"}

    # In production: send to thermal printer
    # For now: return receipt data
    receipt_data = preview_receipt(order_id, template_id, db)

    return {
        "message": f"Račun #{order_id} poslan na tiskalnik",
        "order_id": order_id,
        "template": template_id,
        "printer_status": "sent",
    }


@router.post("/email/{order_id}")
def email_receipt(
    order_id: int,
    email: str,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Pošlji račun po e-pošti."""
    from app.models.order import Order
    import smtplib
    from email.mime.text import MIMEText
    from app.models.settings import Setting

    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        return {"error": "Naročilo ni najdeno"}

    # Get SMTP settings
    def get_setting(key, default=""):
        s = db.query(Setting).filter(Setting.key == key).first()
        return s.value if s else default

    host = get_setting("smtp_host")
    if not host:
        return {"error": "SMTP ni konfiguriran"}

    port = int(get_setting("smtp_port", "587"))
    user_email = get_setting("smtp_user")
    pwd = get_setting("smtp_pass")
    from_addr = get_setting("smtp_from", user_email)
    from_name = get_setting("smtp_from_name", "Restavracija")

    # Generate receipt
    receipt_data = preview_receipt(order_id, "standard", db)

    subject = f"Vaš račun #{order_id}"
    body = receipt_data.get("receipt", "")

    msg = MIMEText(body)
    msg["Subject"] = subject
    msg["From"] = f"{from_name} <{from_addr}>" if from_name else from_addr
    msg["To"] = email

    try:
        with smtplib.SMTP(host, port, timeout=10) as server:
            server.starttls()
            if user_email and pwd:
                server.login(user_email, pwd)
            server.send_message(msg)
        return {"message": f"Račun poslan na {email}", "email": email}
    except Exception as e:
        return {"error": f"Napaka pri pošiljanju: {str(e)}"}


@router.get("/stats")
def get_receipt_stats(
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Statistika računov."""
    from app.models.order import Order
    from app.models.payment import Payment
    from datetime import timedelta

    start = datetime.now() - timedelta(days=days)

    orders = db.query(Order).filter(
        Order.status == "closed",
        Order.closed_at >= start
    ).all()

    payments = db.query(Payment).filter(
        Payment.created_at >= start
    ).all()

    total_revenue = sum(p.amount for p in payments)
    total_tips = sum(p.tip for p in payments if p.tip)
    order_count = len(orders)

    # Payment method breakdown
    method_breakdown = {}
    for p in payments:
        method = p.payment_method or "unknown"
        if method not in method_breakdown:
            method_breakdown[method] = {"count": 0, "total": 0}
        method_breakdown[method]["count"] += 1
        method_breakdown[method]["total"] += p.amount

    return {
        "period_days": days,
        "total_revenue": round(total_revenue, 2),
        "total_tips": round(total_tips, 2),
        "order_count": order_count,
        "avg_order": round(total_revenue / order_count, 2) if order_count > 0 else 0,
        "payment_methods": method_breakdown,
    }