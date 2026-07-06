from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.customer import Customer
from app.models.order import Order
from app.api.v1.audit_log import log_action

router = APIRouter(prefix="/customers", tags=["customers"])


@router.get("")
def list_customers(search: str = "", tag: str = "", db: Session = Depends(get_db)):
    q = db.query(Customer)
    if search:
        q = q.filter(
            Customer.name.ilike(f"%{search}%") |
            Customer.phone.ilike(f"%{search}%")
        )
    if tag:
        q = q.filter(Customer.tags.ilike(f"%{tag}%"))
    customers = q.order_by(Customer.name).all()
    return [{
        "id": c.id, "name": c.name, "phone": c.phone,
        "address": c.address, "email": c.email, "notes": c.notes, "tags": c.tags,
        "created_at": str(c.created_at),
        "loyalty_points": c.loyalty_points or 0,
        "total_spent": round(c.total_spent or 0, 2),
        "is_member": c.is_member or False
    } for c in customers]


@router.post("")
def create_customer(data: dict, db: Session = Depends(get_db)):
    c = Customer(
        name=data["name"],
        phone=data.get("phone", ""),
        address=data.get("address", ""),
        email=data.get("email", ""),
        notes=data.get("notes", ""),
        tags=data.get("tags", ""),
        is_member=data.get("is_member", False)
    )
    db.add(c)
    db.commit()
    db.refresh(c)
    return {"id": c.id, "name": c.name, "phone": c.phone, "address": c.address, "email": c.email, "notes": c.notes, "tags": c.tags, "loyalty_points": 0, "is_member": c.is_member}


@router.put("/{customer_id}")
def update_customer(customer_id: int, data: dict, db: Session = Depends(get_db)):
    c = db.query(Customer).filter(Customer.id == customer_id).first()
    if not c:
        raise HTTPException(404, "Customer not found")
    for k in ("name", "phone", "address", "email", "notes", "tags", "is_member", "loyalty_points", "branch_id"):
        if k in data:
            setattr(c, k, data[k])
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
def redeem_loyalty(customer_id: int, data: dict, db: Session = Depends(get_db)):
    c = db.query(Customer).filter(Customer.id == customer_id).first()
    if not c:
        raise HTTPException(404, "Customer not found")
    points = data.get("points", 0)
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
