from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List
from app.core.database import get_db
from app.models.customer import Customer
from app.models.order import Order
from app.api.v1.audit_log import log_action
from app.schemas.customer import CustomerCreate, CustomerUpdate, RedeemLoyalty

router = APIRouter(prefix="/customers", tags=["customers"])


@router.get("")
def list_customers(search: str = "", tag: str = "", skip: int = 0, limit: int = 50, db: Session = Depends(get_db)):
    q = db.query(Customer)
    if search:
        q = q.filter(
            Customer.name.ilike(f"%{search}%") |
            Customer.phone.ilike(f"%{search}%")
        )
    if tag:
        q = q.filter(Customer.tags.ilike(f"%{tag}%"))
    total = q.count()
    customers = q.order_by(Customer.name).offset(skip).limit(limit).all()
    return {
        "items": [{
            "id": c.id, "name": c.name, "phone": c.phone,
            "address": c.address, "email": c.email, "notes": c.notes, "tags": c.tags,
            "created_at": str(c.created_at),
            "loyalty_points": c.loyalty_points or 0,
            "total_spent": round(c.total_spent or 0, 2),
            "is_member": c.is_member or False
        } for c in customers],
        "total": total
    }


@router.post("")
def create_customer(data: CustomerCreate, db: Session = Depends(get_db)):
    c = Customer(
        name=data.name,
        phone=data.phone,
        address=data.address,
        email=data.email,
        notes=data.notes,
        tags=data.tags,
        is_member=data.is_member
    )
    db.add(c)
    db.commit()
    db.refresh(c)
    return {"id": c.id, "name": c.name, "phone": c.phone, "address": c.address, "email": c.email, "notes": c.notes, "tags": c.tags, "loyalty_points": 0, "is_member": c.is_member}


@router.put("/{customer_id}")
def update_customer(customer_id: int, data: CustomerUpdate, db: Session = Depends(get_db)):
    c = db.query(Customer).filter(Customer.id == customer_id).first()
    if not c:
        raise HTTPException(404, "Customer not found")
    update_data = data.model_dump(exclude_unset=True)
    for k, v in update_data.items():
        setattr(c, k, v)
    db.commit()
    return {"ok": True}


@router.delete("/{customer_id}")
def delete_customer(customer_id: int, db: Session = Depends(get_db)):
    c = db.query(Customer).filter(Customer.id == customer_id).first()
    if not c:
        raise HTTPException(404, "Customer not found")
    db.delete(c)
    db.commit()
    return {"ok": True}


@router.get("/{customer_id}")
def get_customer(customer_id: int, db: Session = Depends(get_db)):
    c = db.query(Customer).filter(Customer.id == customer_id).first()
    if not c:
        raise HTTPException(404, "Customer not found")
    return {
        "id": c.id, "name": c.name, "phone": c.phone,
        "address": c.address, "email": c.email, "notes": c.notes, "tags": c.tags,
        "created_at": str(c.created_at),
        "loyalty_points": c.loyalty_points or 0,
        "total_spent": round(c.total_spent or 0, 2),
        "is_member": c.is_member or False,
        "branch_id": c.branch_id
    }


@router.post("/{customer_id}/redeem-points")
def redeem_loyalty(customer_id: int, data: RedeemLoyalty, db: Session = Depends(get_db)):
    c = db.query(Customer).filter(Customer.id == customer_id).first()
    if not c:
        raise HTTPException(404, "Customer not found")
    points = data.points
    if points <= 0:
        raise HTTPException(400, "Invalid points")
    if points > (c.loyalty_points or 0):
        raise HTTPException(400, "Not enough points")
    # 100 points = 1 EUR
    discount = round(points / 100, 2)
    c.loyalty_points -= points
    log_action(db, "loyalty_redeemed", "customer", c.id, details=f"Redeemed {points} pts for {discount} EUR")
    db.commit()
    return {"points_redeemed": points, "discount": discount, "remaining": c.loyalty_points}


@router.get("/{customer_id}/orders")
def get_customer_orders(customer_id: int, db: Session = Depends(get_db)):
    orders = db.query(Order).filter(
        Order.customer_id == customer_id,
        Order.status == "closed"
    ).order_by(Order.closed_at.desc()).limit(50).all()
    result = []
    for o in orders:
        items = [{
            "item_name": i.item_name, "quantity": i.quantity, "total_price": i.total_price
        } for i in o.items]
        result.append({
            "id": o.id, "total": o.total, "status": o.status, "items": items,
            "created_at": str(o.created_at), "closed_at": str(o.closed_at) if o.closed_at else None
        })
    return result


@router.get("/{customer_id}/history")
def get_customer_history(customer_id: int, db: Session = Depends(get_db)):
    c = db.query(Customer).filter(Customer.id == customer_id).first()
    if not c:
        raise HTTPException(404, "Customer not found")
    orders = db.query(Order).filter(
        Order.customer_id == customer_id,
        Order.status == "closed"
    ).order_by(Order.closed_at.desc()).limit(50).all()
    # Aggregate favorite items
    from collections import Counter
    item_counter = Counter()
    for o in orders:
        for i in o.items:
            item_counter[i.item_name] += i.quantity
    favorite_items = [{"name": n, "count": cnt} for n, cnt in item_counter.most_common(10)]
    order_list = [{
        "id": o.id, "total": o.total, "status": o.status,
        "created_at": str(o.created_at), "closed_at": str(o.closed_at) if o.closed_at else None,
        "item_count": sum(i.quantity for i in o.items)
    } for o in orders]
    return {
        "customer": {
            "id": c.id, "name": c.name, "phone": c.phone, "email": c.email,
            "address": c.address, "notes": c.notes, "tags": c.tags, "created_at": str(c.created_at),
            "loyalty_points": c.loyalty_points or 0,
            "total_spent": round(c.total_spent or 0, 2),
            "is_member": c.is_member or False
        },
        "order_count": len(orders),
        "favorite_items": favorite_items,
        "orders": order_list
    }


class BulkDeleteRequest(BaseModel):
    ids: List[int]


class BulkTagRequest(BaseModel):
    ids: List[int]
    tag: str


@router.post("/bulk/delete")
def bulk_delete(body: BulkDeleteRequest, db: Session = Depends(get_db)):
    customers = db.query(Customer).filter(Customer.id.in_(body.ids)).all()
    count = len(customers)
    for c in customers:
        db.delete(c)
    db.commit()
    log_action(db, "bulk_delete_customers", f"Deleted {count} customers", "customer")
    return {"deleted": count}


@router.post("/bulk/tag")
def bulk_tag(body: BulkTagRequest, db: Session = Depends(get_db)):
    customers = db.query(Customer).filter(Customer.id.in_(body.ids)).all()
    count = 0
    for c in customers:
        existing = set(t.strip() for t in (c.tags or '').split(',') if t.strip())
        existing.add(body.tag)
        c.tags = ', '.join(sorted(existing))
        count += 1
    db.commit()
    log_action(db, "bulk_tag_customers", f"Tagged {count} customers with '{body.tag}'", "customer")
    return {"tagged": count}


@router.get("/{customer_id}/profile")
def get_customer_profile(customer_id: int, db: Session = Depends(get_db)):
    """Podroben profil stranke z analitiko."""
    from app.models.order import Order, OrderItem
    from app.models.payment import Payment
    from app.models.reservation import Reservation
    from app.models.rating import Rating
    from datetime import datetime, timedelta
    from collections import Counter

    c = db.query(Customer).filter(Customer.id == customer_id).first()
    if not c:
        raise HTTPException(404, "Customer not found")

    # Orders
    orders = db.query(Order).filter(
        Order.customer_id == customer_id,
        Order.status == "closed"
    ).order_by(Order.closed_at.desc()).all()

    # Payments
    order_ids = [o.id for o in orders]
    payments = db.query(Payment).filter(Payment.order_id.in_(order_ids)).all() if order_ids else []

    # Reservations
    reservations = db.query(Reservation).filter(
        Reservation.customer_id == customer_id
    ).order_by(Reservation.reservation_time.desc()).limit(10).all()

    # Ratings
    ratings = db.query(Rating).filter(Rating.customer_id == customer_id).all()

    # Analytics
    total_spent = sum(p.amount for p in payments)
    avg_order = total_sped / len(orders) if orders else 0
    total_orders = len(orders)
    total_reservations = len(reservations)

    # Favorite items
    item_counter = Counter()
    for o in orders:
        for i in o.items:
            item_counter[i.item_name] += i.quantity
    favorite_items = [{"name": n, "count": cnt} for n, cnt in item_counter.most_common(5)]

    # Visit frequency
    if len(orders) >= 2:
        first_order = orders[-1].created_at
        last_order = orders[0].created_at
        if first_order and last_order:
            days_diff = (last_order - first_order).days
            avg_days_between = days_diff / len(orders) if len(orders) > 1 else 0
        else:
            avg_days_between = 0
    else:
        avg_days_between = 0

    # Average rating
    rating_scores = [r.score for r in ratings if r.score]
    avg_rating = sum(rating_scores) / len(rating_scores) if rating_scores else 0

    # Last visit
    last_order_date = orders[0].closed_at if orders else None

    # Days since last visit
    if last_order_date:
        days_since_visit = (datetime.now() - last_order_date).days
    else:
        days_since_visit = None

    return {
        "customer": {
            "id": c.id, "name": c.name, "phone": c.phone, "email": c.email,
            "address": c.address, "notes": c.notes, "tags": c.tags,
            "created_at": str(c.created_at),
            "loyalty_points": c.loyalty_points or 0,
            "total_spent": round(c.total_spent or 0, 2),
            "is_member": c.is_member or False,
        },
        "analytics": {
            "total_orders": total_orders,
            "total_spent": round(total_spent, 2),
            "avg_order_value": round(avg_order, 2),
            "total_reservations": total_reservations,
            "avg_rating": round(avg_rating, 1),
            "favorite_items": favorite_items,
            "avg_days_between_visits": round(avg_days_between, 1),
            "days_since_last_visit": days_since_visit,
        },
        "recent_orders": [{
            "id": o.id, "total": o.total,
            "created_at": str(o.created_at),
            "closed_at": str(o.closed_at) if o.closed_at else None,
        } for o in orders[:10]],
        "recent_reservations": [{
            "id": r.id, "reservation_time": str(r.reservation_time),
            "guests": r.guests, "status": r.status,
        } for r in reservations[:5]],
    }


@router.get("/{customer_id}/recommendations")
def get_customer_recommendations(customer_id: int, db: Session = Depends(get_db)):
    """Priporočila jedi na podlagi zgodovine."""
    from app.models.order import Order
    from app.models.menu_item import MenuItem
    from collections import Counter

    orders = db.query(Order).filter(
        Order.customer_id == customer_id,
        Order.status == "closed"
    ).all()

    # Get ordered items
    ordered_items = Counter()
    for o in orders:
        for i in o.items:
            ordered_items[i.item_name] += i.quantity

    # Get all menu items
    all_items = db.query(MenuItem).filter(MenuItem.is_active == True).all()

    # Recommend items not yet ordered
    recommendations = []
    for item in all_items:
        if item.name not in ordered_items:
            recommendations.append({
                "id": item.id,
                "name": item.name,
                "price": item.price,
                "reason": "Novo v meniju",
            })

    # Sort by price (mid-range first)
    recommendations.sort(key=lambda x: abs((x["price"] or 0) - 15))

    return {
        "customer_id": customer_id,
        "ordered_count": len(ordered_items),
        "recommendations": recommendations[:5],
    }


@router.post("/{customer_id}/notes")
def add_customer_note(customer_id: int, note: str, db: Session = Depends(get_db), user=None):
    """Dodaj opombo stranki."""
    from app.models.customer import CustomerNote

    c = db.query(Customer).filter(Customer.id == customer_id).first()
    if not c:
        raise HTTPException(404, "Customer not found")

    new_note = CustomerNote(
        customer_id=customer_id,
        note=note,
        user_id=user.id if user else None,
    )
    db.add(new_note)
    db.commit()

    return {"message": "Opomba dodana", "note_id": new_note.id}


@router.get("/{customer_id}/notes")
def get_customer_notes(customer_id: int, db: Session = Depends(get_db)):
    """Vrni opombe stranke."""
    from app.models.customer import CustomerNote

    notes = db.query(CustomerNote).filter(
        CustomerNote.customer_id == customer_id
    ).order_by(CustomerNote.created_at.desc()).limit(20).all()

    return {
        "notes": [{
            "id": n.id, "note": n.note,
            "created_at": str(n.created_at),
        } for n in notes]
    }
