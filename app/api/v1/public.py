from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.category import Category
from app.models.menu_item import MenuItem
from app.models.table_model import TableModel
from app.models.modifiers import ModifierGroup, ModifierOption, MenuItemModifierLink
from app.models.order import Order, OrderItem
from app.models.payment import Payment
from app.models.customer import Customer
from app.models.loyalty import LoyaltyTransaction
from app.models.branch import Branch
from app.models.settings import Setting
from app.models.service_request import ServiceRequest
from app.schemas.public import (
    CreatePublicOrder, CreateKioskOrder, CreateOnlineOrder,
    CustomerRegister, CustomerLogin, CustomerUpdateProfile,
    TablePay, PublicReservation, TableServiceRequest,
)
from datetime import datetime
import json, uuid
from app.api.v1.audit_log import log_action

router = APIRouter(prefix="/public", tags=["public"])


@router.get("/menu/{table_id}")
def get_public_menu(table_id: int, db: Session = Depends(get_db)):
    table = db.query(TableModel).filter(TableModel.id == table_id).first()
    if not table:
        raise HTTPException(404, "Table not found")

    cq = db.query(Category).order_by(Category.sort_order)
    if table.branch_id:
        cq = cq.filter(Category.branch_id == table.branch_id)
    categories = cq.all()
    result = []
    for cat in categories:
        iq = db.query(MenuItem).filter(
            MenuItem.category_id == cat.id,
            MenuItem.is_active == True
        )
        if table.branch_id:
            iq = iq.filter(MenuItem.branch_id == table.branch_id)
        items = iq.all()
        result.append({
            "id": cat.id,
            "name": cat.name,
                "items": [{"id": i.id, "name": i.name, "description": i.description or "", "price": i.price, "image_url": i.image_url, "allergens": i.allergens, "tags": i.tags, "translations": i.translations, "calories": i.calories, "protein": i.protein, "fat": i.fat, "carbs": i.carbs} for i in items]
        })

    return {
        "table": {"id": table.id, "name": table.name, "number": table.number},
        "categories": result
    }


@router.post("/orders")
def create_public_order(data: CreatePublicOrder, db: Session = Depends(get_db)):
    table = db.query(TableModel).filter(TableModel.id == data.table_id).first()
    if not table:
        raise HTTPException(404, "Table not found")

    total = 0
    items = []
    for item_data in data.items:
        menu_item = db.query(MenuItem).filter(MenuItem.id == item_data.menu_item_id).first()
        if not menu_item:
            raise HTTPException(404, f"Item {item_data.menu_item_id} not found")
        line_total = menu_item.price * item_data.quantity
        total += line_total
        items.append(OrderItem(
            menu_item_id=menu_item.id,
            item_name=menu_item.name,
            quantity=item_data.quantity,
            unit_price=menu_item.price,
            total_price=line_total,
            notes=item_data.notes
        ))

    order = Order(
        table_id=data.table_id,
        order_type="dine-in",
        cashier_id=0,
        customer_name=data.customer_name,
        status="open",
        total=total,
        branch_id=table.branch_id,
        items=items
    )
    db.add(order)
    table.status = "occupied"
    db.commit()
    db.refresh(order)

    return {"order_id": order.id, "total": order.total, "status": order.status}


@router.get("/kiosk-menu/{branch_id}")
def get_kiosk_menu(branch_id: int, db: Session = Depends(get_db)):
    cq = db.query(Category).order_by(Category.sort_order).filter(Category.branch_id == branch_id)
    categories = cq.all()
    result = []
    for cat in categories:
        items = db.query(MenuItem).filter(
            MenuItem.category_id == cat.id,
            MenuItem.is_active == True,
            MenuItem.branch_id == branch_id
        ).all()
        result.append({
            "id": cat.id, "name": cat.name,
            "items": [{"id": i.id, "name": i.name, "description": i.description or "", "price": i.price, "image_url": i.image_url, "allergens": i.allergens, "tags": i.tags, "translations": i.translations, "calories": i.calories, "protein": i.protein, "fat": i.fat, "carbs": i.carbs} for i in items]
        })
    return result


@router.post("/kiosk-orders")
def create_kiosk_order(data: CreateKioskOrder, db: Session = Depends(get_db)):
    total = 0
    items = []
    for item_data in data.items:
        menu_item = db.query(MenuItem).filter(MenuItem.id == item_data.menu_item_id).first()
        if not menu_item:
            raise HTTPException(404, f"Item {item_data.menu_item_id} not found")
        line_total = menu_item.price * item_data.quantity
        total += line_total
        items.append(OrderItem(
            menu_item_id=menu_item.id, item_name=menu_item.name,
            quantity=item_data.quantity, unit_price=menu_item.price,
            total_price=line_total, notes=item_data.notes
        ))
    order = Order(
        table_id=0, order_type="takeaway", cashier_id=0,
        customer_name=data.customer_name,
        status="open", total=total, branch_id=data.branch_id, items=items
    )
    db.add(order)
    db.commit()
    db.refresh(order)
    return {"order_id": order.id, "total": order.total, "status": order.status}


@router.get("/order/{table_id}")
def get_table_order(table_id: int, db: Session = Depends(get_db)):
    table = db.query(TableModel).filter(TableModel.id == table_id).first()
    if not table:
        raise HTTPException(404, "Table not found")
    order = db.query(Order).filter(
        Order.table_id == table_id, Order.status == "open"
    ).order_by(Order.created_at.desc()).first()
    if not order:
        return {"order": None, "table": {"id": table.id, "name": table.name}}
    items = db.query(OrderItem).filter(OrderItem.order_id == order.id).all()
    return {
        "order": {
            "id": order.id, "total": order.total, "status": order.status,
            "created_at": order.created_at.isoformat() if order.created_at else None,
            "items": [{
                "id": i.id, "item_name": i.item_name,
                "quantity": i.quantity, "unit_price": i.unit_price,
                "total_price": i.total_price, "notes": i.notes,
                "modifiers": json.loads(i.modifiers) if i.modifiers else []
            } for i in items]
        },
        "table": {"id": table.id, "name": table.name}
    }


@router.get("/branches")
def list_branches(db: Session = Depends(get_db)):
    branches = db.query(Branch).all()
    return [{"id": b.id, "name": b.name, "address": b.address or ""} for b in branches]


@router.get("/online-menu/{branch_id}")
def get_online_menu(branch_id: int, db: Session = Depends(get_db)):
    cq = db.query(Category).order_by(Category.sort_order)
    if branch_id:
        cq = cq.filter(Category.branch_id == branch_id)
    categories = cq.all()
    result = []
    for cat in categories:
        iq = db.query(MenuItem).filter(
            MenuItem.category_id == cat.id,
            MenuItem.is_active == True
        )
        if branch_id:
            iq = iq.filter(MenuItem.branch_id == branch_id)
        items = iq.all()
        items_out = []
        for item in items:
            # Fetch modifier groups for this item
            links = db.query(MenuItemModifierLink).filter(MenuItemModifierLink.menu_item_id == item.id).all()
            groups = []
            for link in links:
                group = db.query(ModifierGroup).filter(ModifierGroup.id == link.group_id).first()
                if not group:
                    continue
                options = db.query(ModifierOption).filter(ModifierOption.group_id == group.id).order_by(ModifierOption.sort_order).all()
                groups.append({
                    "id": group.id,
                    "name": group.name,
                    "min_select": group.min_select,
                    "max_select": group.max_select,
                    "is_required": group.is_required,
                    "options": [{
                        "id": o.id, "name": o.name,
                        "price_impact": o.price_impact,
                        "sort_order": o.sort_order
                    } for o in options]
                })
            items_out.append({
                "id": item.id, "name": item.name,
                "description": item.description or "",
                "price": item.price,
                "image_url": item.image_url,
                "allergens": item.allergens,
                "tags": item.tags,
                "translations": item.translations,
                "tax_rate": item.tax_rate or 0,
                "calories": item.calories,
                "protein": item.protein,
                "fat": item.fat,
                "carbs": item.carbs,
                "modifier_groups": groups
            })
        result.append({
            "id": cat.id, "name": cat.name,
            "sort_order": cat.sort_order,
            "items": items_out
        })
    return result


@router.post("/online-orders")
def create_online_order(data: CreateOnlineOrder, db: Session = Depends(get_db)):
    branch = db.query(Branch).filter(Branch.id == data.branch_id).first()
    if not branch:
        raise HTTPException(404, "Branch not found")

    total = 0
    items = []
    for item_data in data.items:
        menu_item = db.query(MenuItem).filter(MenuItem.id == item_data.menu_item_id).first()
        if not menu_item:
            raise HTTPException(404, f"Item {item_data.menu_item_id} not found")
        modifier_option_ids = item_data.modifier_option_ids
        mod_impact = 0
        mod_details = []
        if modifier_option_ids:
            options = db.query(ModifierOption).filter(ModifierOption.id.in_(modifier_option_ids)).all()
            for opt in options:
                mod_impact += opt.price_impact
                mod_details.append({
                    "option_id": opt.id, "option_name": opt.name,
                    "price_impact": opt.price_impact,
                    "group_id": opt.group_id
                })
        unit_price = menu_item.price + mod_impact
        line_total = unit_price * item_data.quantity
        total += line_total
        items.append(OrderItem(
            menu_item_id=menu_item.id,
            item_name=menu_item.name,
            quantity=item_data.quantity,
            unit_price=unit_price,
            total_price=line_total,
            notes=item_data.notes,
            modifiers=json.dumps(mod_details)
        ))

    if data.order_type == "delivery":
        dfee_setting = db.query(Setting).filter(Setting.key == "delivery_fee").first()
        dfee = float(dfee_setting.value) if dfee_setting and dfee_setting.value else 0
        if dfee > 0:
            items.append(OrderItem(
                menu_item_id=0, item_name="Dostava",
                quantity=1, unit_price=dfee,
                total_price=dfee, notes=""
            ))
            total += dfee

    notes_parts = []
    if data.delivery_notes:
        notes_parts.append(data.delivery_notes)
    notes = " | ".join(notes_parts)

    order = Order(
        table_id=0,
        order_type=data.order_type,
        cashier_id=0,
        customer_name=data.customer_name,
        customer_phone=data.customer_phone,
        customer_email=data.customer_email,
        delivery_address=data.delivery_address if data.order_type == "delivery" else "",
        status="open",
        total=total,
        branch_id=data.branch_id,
        notes=notes,
        items=items
    )
    if data.token:
        try:
            cust = _get_customer_by_token(data.token, db)
            order.customer_id = cust.id
            cust.total_spent = (cust.total_spent or 0) + total
            pts = int(total)
            if pts > 0:
                cust.loyalty_points = (cust.loyalty_points or 0) + pts
                tx = LoyaltyTransaction(
                    customer_id=cust.id, order_id=order.id, points=pts,
                    type="earn", note=f"Online order #{order.id}"
                )
                db.add(tx)
        except HTTPException:
            pass

    db.add(order)
    db.commit()
    db.refresh(order)

    return {
        "order_id": order.id,
        "total": order.total,
        "status": order.status,
        "created_at": order.created_at.isoformat() if order.created_at else None
    }


@router.get("/order-status/{order_id}")
def get_order_status(order_id: int, phone: str = "", db: Session = Depends(get_db)):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(404, "Order not found")
    if phone and order.customer_phone and order.customer_phone != phone:
        raise HTTPException(403, "Phone does not match")
    items = db.query(OrderItem).filter(OrderItem.order_id == order.id).all()
    return {
        "order_id": order.id,
        "status": order.status,
        "total": order.total,
        "order_type": order.order_type,
        "created_at": order.created_at.isoformat() if order.created_at else None,
        "customer_name": order.customer_name,
        "items": [{
            "id": i.id, "item_name": i.item_name,
            "quantity": i.quantity, "unit_price": i.unit_price,
            "total_price": i.total_price, "status": i.status,
            "notes": i.notes,
            "modifiers": json.loads(i.modifiers) if i.modifiers else []
        } for i in items]
    }


def _get_customer_by_token(token: str, db: Session) -> Customer:
    if not token:
        raise HTTPException(401, "Not logged in")
    c = db.query(Customer).filter(Customer.auth_token == token).first()
    if not c:
        raise HTTPException(401, "Invalid session")
    return c


def _hash_pw(password: str) -> str:
    import bcrypt
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


@router.post("/auth/register")
def customer_register(data: CustomerRegister, db: Session = Depends(get_db)):
    name = data.name.strip()
    phone = data.phone.strip()
    email = data.email.strip()
    if not name:
        raise HTTPException(400, "Name is required")
    existing = db.query(Customer).filter(Customer.phone == phone).first() if phone else None
    if existing:
        raise HTTPException(400, "Phone already registered")
    token = uuid.uuid4().hex
    c = Customer(
        name=name, phone=phone, email=email,
        password_hash=_hash_pw(data.password),
        auth_token=token,
        is_member=True,
        loyalty_points=50
    )
    db.add(c)
    db.commit()
    db.refresh(c)
    return {
        "customer": {"id": c.id, "name": c.name, "phone": c.phone, "email": c.email,
                      "loyalty_points": c.loyalty_points, "is_member": c.is_member},
        "token": token
    }


@router.post("/auth/login")
def customer_login(data: CustomerLogin, db: Session = Depends(get_db)):
    phone = data.phone.strip()
    if not phone:
        raise HTTPException(400, "Phone is required")
    c = db.query(Customer).filter(Customer.phone == phone).first()
    import bcrypt
    if not c or not bcrypt.checkpw(data.password.encode(), c.password_hash.encode()):
        raise HTTPException(401, "Invalid credentials")
    c.auth_token = uuid.uuid4().hex
    db.commit()
    return {
        "customer": {"id": c.id, "name": c.name, "phone": c.phone, "email": c.email,
                      "loyalty_points": c.loyalty_points or 0, "is_member": c.is_member or False,
                      "address": c.address or ""},
        "token": c.auth_token
    }


@router.get("/profile")
def customer_profile(token: str = "", db: Session = Depends(get_db)):
    c = _get_customer_by_token(token, db)
    return {
        "id": c.id, "name": c.name, "phone": c.phone, "email": c.email,
        "address": c.address or "", "notes": c.notes or "",
        "loyalty_points": c.loyalty_points or 0,
        "total_spent": round(c.total_spent or 0, 2),
        "is_member": c.is_member or False,
        "created_at": str(c.created_at)
    }


@router.put("/profile")
def customer_update_profile(data: CustomerUpdateProfile, token: str = "", db: Session = Depends(get_db)):
    c = _get_customer_by_token(token, db)
    update_data = data.model_dump(exclude_unset=True)
    for k, v in update_data.items():
        setattr(c, k, v)
    db.commit()
    return {"ok": True}


@router.get("/profile/orders")
def customer_orders(token: str = "", db: Session = Depends(get_db)):
    c = _get_customer_by_token(token, db)
    orders = db.query(Order).filter(
        Order.customer_phone == c.phone
    ).order_by(Order.created_at.desc()).limit(50).all()
    return [{
        "id": o.id, "total": o.total, "status": o.status,
        "order_type": o.order_type, "notes": o.notes,
        "created_at": o.created_at.isoformat() if o.created_at else None,
        "items": [{"item_name": i.item_name, "quantity": i.quantity, "total_price": i.total_price} for i in o.items]
    } for o in orders]


@router.get("/profile/loyalty")
def customer_loyalty(token: str = "", db: Session = Depends(get_db)):
    c = _get_customer_by_token(token, db)
    transactions = db.query(LoyaltyTransaction).filter(
        LoyaltyTransaction.customer_id == c.id
    ).order_by(LoyaltyTransaction.created_at.desc()).limit(50).all()
    return {
        "points": c.loyalty_points or 0,
        "total_spent": round(c.total_spent or 0, 2),
        "transactions": [{
            "id": t.id, "points": t.points, "type": t.type,
            "note": t.note, "order_id": t.order_id,
            "created_at": t.created_at.isoformat() if t.created_at else None
        } for t in transactions]
    }


@router.get("/table-bill/{table_id}")
def get_table_bill(table_id: int, db: Session = Depends(get_db)):
    table = db.query(TableModel).filter(TableModel.id == table_id).first()
    if not table:
        raise HTTPException(404, "Table not found")
    order = db.query(Order).filter(
        Order.table_id == table_id, Order.status == "open"
    ).first()
    if not order:
        return {"table": table.name, "status": "free", "order_exists": False}
    items = []
    for i in order.items:
        mods = json.loads(i.modifiers) if i.modifiers else []
        mod_str = ", ".join(m.get("name", "") for m in mods) if mods else ""
        items.append({
            "id": i.id, "name": i.item_name, "quantity": i.quantity,
            "unit_price": i.unit_price, "total_price": i.total_price,
            "modifiers": mod_str, "notes": i.notes or ""
        })
    return {
        "table": table.name, "order_id": order.id, "status": "open",
        "items": items, "total": order.total, "order_type": order.order_type,
        "created_at": order.created_at.isoformat() if order.created_at else None,
        "order_exists": True
    }


@router.post("/table-pay/{table_id}")
def pay_table_bill(table_id: int, data: TablePay, db: Session = Depends(get_db)):
    table = db.query(TableModel).filter(TableModel.id == table_id).first()
    if not table:
        raise HTTPException(404, "Table not found")
    order = db.query(Order).filter(
        Order.table_id == table_id, Order.status == "open"
    ).first()
    if not order:
        raise HTTPException(400, "No open order on this table")

    payment = Payment(
        order_id=order.id, amount=order.total, method=data.method, tip=data.tip
    )
    db.add(payment)

    order.status = "closed"
    order.closed_at = datetime.now()
    table.status = "free"

    # Loyalty points if customer linked
    if order.customer_id:
        cust = db.query(Customer).filter(Customer.id == order.customer_id).first()
        if cust:
            pts = int(order.total)
            if pts > 0:
                cust.loyalty_points = (cust.loyalty_points or 0) + pts
                tx = LoyaltyTransaction(
                    customer_id=cust.id, order_id=order.id, points=pts,
                    type="earn", description=f"Table pay #{order.id}"
                )
                db.add(tx)

    log_action(db, "table_pay", "payment", payment.id, details=f"Table #{table.name} paid {order.total} via {data.method}")
    db.commit()

    try:
        from app.core.websocket_manager import broadcast
        broadcast("order_closed", {"order_id": order.id})
    except Exception:
        pass

    return {"ok": True, "order_id": order.id, "total": order.total, "method": data.method}


from app.models.reservation import Reservation

@router.get("/reservations/available-slots")
def available_slots(date_str: str, guests: int = 2, branch_id: int = 0, db: Session = Depends(get_db)):
    try:
        d = datetime.strptime(date_str, "%Y-%m-%d")
    except (ValueError, TypeError):
        raise HTTPException(400, "Invalid date format (use YYYY-MM-DD)")

    open_h = 10
    close_h = 22
    settings = db.query(Setting).filter(Setting.key.in_(["opening_hour", "closing_hour"])).all()
    for s in settings:
        if s.key == "opening_hour": open_h = int(s.value)
        if s.key == "closing_hour": close_h = int(s.value)

    tq = db.query(TableModel).filter(TableModel.capacity >= guests, TableModel.status == "free")
    if branch_id:
        tq = tq.filter(TableModel.branch_id == branch_id)
    suitable_tables = tq.all()
    if not suitable_tables:
        return {"date": date_str, "slots": [], "note": "Ni ustreznih miz"}

    day_start = d.replace(hour=0, minute=0, second=0, microsecond=0)
    day_end = d.replace(hour=23, minute=59, second=59)
    existing = db.query(Reservation).filter(
        Reservation.reservation_time >= day_start,
        Reservation.reservation_time <= day_end,
        Reservation.status.in_(["confirmed", "seated"])
    ).all()
    hour_tables: dict[int, int] = {}
    for r in existing:
        h = r.reservation_time.hour
        hour_tables[h] = hour_tables.get(h, 0) + 1

    slots = []
    for h in range(open_h, close_h):
        used = hour_tables.get(h, 0)
        available = max(0, len(suitable_tables) - used)
        if available > 0:
            slots.append({
                "time": f"{h:02d}:00",
                "available_tables": available,
                "limited": available <= 1
            })

    return {"date": date_str, "guests": guests, "slots": slots}


@router.post("/reservations")
def create_public_reservation(data: PublicReservation, db: Session = Depends(get_db)):
    name = data.customer_name.strip()
    time_str = data.reservation_time.strip()

    if not name or not time_str:
        raise HTTPException(400, "Ime in čas rezervacije sta obvezna")

    try:
        rtime = datetime.fromisoformat(time_str)
    except (ValueError, TypeError):
        raise HTTPException(400, "Napačen format datuma")

    branch_id = data.branch_id
    tq = db.query(TableModel).filter(TableModel.capacity >= data.guests, TableModel.status == "free")
    if branch_id:
        tq = tq.filter(TableModel.branch_id == branch_id)
    table = tq.first()

    r = Reservation(
        table_id=table.id if table else None,
        customer_name=name,
        customer_phone=data.customer_phone,
        customer_email=data.customer_email,
        guests=data.guests,
        reservation_time=rtime,
        status="confirmed",
        notes=data.notes,
        branch_id=branch_id or None
    )
    db.add(r)
    db.flush()
    log_action(db, "public_reservation", "reservation", r.id, details=f"{name} ({data.guests} oseb)")
    db.commit()
    db.refresh(r)
    return {"id": r.id, "status": r.status, "table_assigned": table.id if table else None}


@router.post("/table-service/{table_id}")
def table_service_request(table_id: int, data: TableServiceRequest, db: Session = Depends(get_db)):
    table = db.query(TableModel).filter(TableModel.id == table_id).first()
    sr = ServiceRequest(
        table_id=table_id,
        table_name=table.name if table else f"Miza {table_id}",
        request_type=data.type,
        message=data.message,
        status="pending"
    )
    db.add(sr)
    db.commit()
    db.refresh(sr)
    return {"id": sr.id, "status": sr.status}
