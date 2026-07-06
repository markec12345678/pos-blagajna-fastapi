from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.core.database import get_db
from app.models.order import Order
from app.models.menu_item import MenuItem
from app.models.customer import Customer
from app.models.invoice import Invoice
from app.models.reservation import Reservation
from app.models.user import User
from app.models.promotion import Promotion
from app.models.catering import CateringOrder
from app.models.supplier import Supplier
from app.models.gift_card import GiftCard

router = APIRouter(prefix="/search", tags=["search"])


@router.get("")
def global_search(q: str = "", branch_id: int = 0, db: Session = Depends(get_db)):
    if not q or len(q) < 1:
        return {"results": []}
    term = f"%{q}%"
    results = []

    # Orders by id or customer_name
    orders = db.query(Order).filter(
        or_(Order.customer_name.ilike(term), Order.id.ilike(term) if q.isdigit() else False)
    ).limit(10).all()
    for o in orders:
        results.append({"type": "order", "id": o.id, "label": f"#{o.id} — {o.customer_name or 'Guest'} ({o.total:.2f} €)", "page": "pos"})

    # Menu items
    items = db.query(MenuItem).filter(
        or_(MenuItem.name.ilike(term), MenuItem.plu_code.ilike(term))
    ).limit(10).all()
    for i in items:
        results.append({"type": "menu", "id": i.id, "label": f"{i.name} ({i.price:.2f} €){' [' + i.plu_code + ']' if i.plu_code else ''}", "page": "menu-editor"})

    # Customers
    customers = db.query(Customer).filter(
        or_(Customer.name.ilike(term), Customer.phone.ilike(term), Customer.email.ilike(term))
    ).limit(10).all()
    for c in customers:
        results.append({"type": "customer", "id": c.id, "label": f"{c.name}{' — ' + c.phone if c.phone else ''}", "page": "customers"})

    # Invoices
    invoices = db.query(Invoice).filter(
        or_(Invoice.invoice_number.ilike(term), Invoice.buyer_name.ilike(term))
    ).limit(10).all()
    for inv in invoices:
        results.append({"type": "invoice", "id": inv.id, "label": f"{inv.invoice_number} — {inv.buyer_name} ({inv.total:.2f} €)", "page": "invoices"})

    # Reservations
    res = db.query(Reservation).filter(Reservation.customer_name.ilike(term)).limit(10).all()
    for r in res:
        results.append({"type": "reservation", "id": r.id, "label": f"{r.customer_name} ({r.guests} oseb)", "page": "reservations"})

    # Users
    users = db.query(User).filter(
        or_(User.full_name.ilike(term), User.username.ilike(term))
    ).limit(5).all()
    for u in users:
        results.append({"type": "user", "id": u.id, "label": f"{u.full_name} (@{u.username})", "page": "users"})

    # Promotions
    promos = db.query(Promotion).filter(Promotion.name.ilike(term)).limit(5).all()
    for p in promos:
        results.append({"type": "promotion", "id": p.id, "label": f"{p.name}", "page": "promotions"})

    # Catering
    catering = db.query(CateringOrder).filter(CateringOrder.customer_name.ilike(term)).limit(5).all()
    for c in catering:
        results.append({"type": "catering", "id": c.id, "label": f"{c.customer_name} ({c.event_type})", "page": "catering"})

    # Suppliers
    suppliers = db.query(Supplier).filter(Supplier.name.ilike(term)).limit(5).all()
    for s in suppliers:
        results.append({"type": "supplier", "id": s.id, "label": s.name, "page": "suppliers"})

    # Gift cards by code
    gcs = db.query(GiftCard).filter(GiftCard.code.ilike(term)).limit(5).all()
    for g in gcs:
        results.append({"type": "gift_card", "id": g.id, "label": f"Darilna kartica {g.code} ({g.balance:.2f} €)", "page": "gift-cards"})

    return {"results": results}
