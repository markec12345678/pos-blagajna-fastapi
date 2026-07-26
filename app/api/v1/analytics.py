from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from app.core.database import get_db
from app.models.order import Order, OrderItem
from app.models.payment import Payment
from app.models.menu_item import MenuItem
from app.models.category import Category
from app.models.branch import Branch
from app.models.inventory import RecipeItem, Ingredient
from app.models.shift import EmployeeShift
from app.models.user import User
from app.models.settings import Setting
from app.models.expense import Expense
from app.models.reservation import Reservation
from app.schemas.analytics import UpdateSalesTargets
from datetime import datetime, timedelta, date, time

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/sales/daily")
def daily_sales(days: int = 7, branch_id: int = 0, db: Session = Depends(get_db)):
    today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    since = today - timedelta(days=days - 1)
    next_day = today + timedelta(days=1)
    q = db.query(
        func.date(Payment.created_at).label('day'),
        func.coalesce(func.sum(Payment.amount), 0).label('sales'),
        func.count(Payment.id).label('orders')
    ).filter(Payment.created_at >= since, Payment.created_at < next_day)
    if branch_id:
        q = q.join(Order, Payment.order_id == Order.id).filter(Order.branch_id == branch_id)
    rows = q.group_by('day').all()
    sales_by_day = {str(r.day): (float(r.sales), r.orders) for r in rows}
    results = []
    for i in range(days - 1, -1, -1):
        day = today - timedelta(days=i)
        day_str = day.strftime("%Y-%m-%d")
        s = sales_by_day.get(day_str, (0, 0))
        results.append({"date": day_str, "sales": s[0], "orders": s[1]})
    return results


@router.get("/sales/hourly")
def hourly_sales(days: int = 7, branch_id: int = 0, db: Session = Depends(get_db)):
    since = datetime.now() - timedelta(days=days)
    q = db.query(
        extract('hour', Payment.created_at).label('hour'),
        func.coalesce(func.sum(Payment.amount), 0).label('total')
    ).filter(Payment.created_at >= since)
    if branch_id:
        q = q.join(Order, Payment.order_id == Order.id).filter(Order.branch_id == branch_id)
    rows = q.group_by('hour').order_by('hour').all()
    return [{"hour": int(r.hour), "sales": float(r.total)} for r in rows]


@router.get("/top-items")
def top_items(limit: int = 10, branch_id: int = 0, db: Session = Depends(get_db)):
    since = datetime.now() - timedelta(days=30)
    q = db.query(
        OrderItem.item_name,
        func.sum(OrderItem.quantity).label('qty'),
        func.sum(OrderItem.total_price).label('total')
    ).join(Order).filter(Order.created_at >= since)
    if branch_id:
        q = q.filter(Order.branch_id == branch_id)
    rows = q.group_by(OrderItem.item_name).order_by(func.sum(OrderItem.total_price).desc()).limit(limit).all()
    return [{"name": r.item_name, "quantity": int(r.qty), "total": float(r.total)} for r in rows]


@router.get("/categories")
def sales_by_category(days: int = 30, branch_id: int = 0, db: Session = Depends(get_db)):
    since = datetime.now() - timedelta(days=days)
    q = db.query(
        Category.name,
        func.coalesce(func.sum(OrderItem.total_price), 0).label('total'),
        func.coalesce(func.sum(OrderItem.quantity), 0).label('qty')
    ).join(MenuItem, MenuItem.category_id == Category.id
    ).join(OrderItem, OrderItem.menu_item_id == MenuItem.id
    ).join(Order).filter(
        Order.created_at >= since, Order.status == "closed"
    )
    if branch_id:
        q = q.filter(Order.branch_id == branch_id)
    rows = q.group_by(Category.id).all()
    return [{"category": r.name, "sales": float(r.total), "quantity": int(r.qty)} for r in rows]


@router.get("/popularity/hourly")
def hourly_popularity(days: int = 30, branch_id: int = 0, db: Session = Depends(get_db)):
    since = datetime.now() - timedelta(days=days)
    q = db.query(
        extract('hour', Order.created_at).label('hour'),
        func.sum(OrderItem.quantity).label('qty'),
        func.sum(OrderItem.total_price).label('total')
    ).join(OrderItem).filter(Order.created_at >= since)
    if branch_id:
        q = q.filter(Order.branch_id == branch_id)
    rows = q.group_by('hour').order_by('hour').all()
    return [{"hour": int(r.hour), "quantity": int(r.qty or 0), "sales": float(r.total or 0)} for r in rows]


@router.get("/popularity/dow")
def popularity_by_day(days: int = 90, branch_id: int = 0, db: Session = Depends(get_db)):
    since = datetime.now() - timedelta(days=days)
    q = db.query(
        func.strftime('%w', Order.created_at).label('dow'),
        func.sum(OrderItem.quantity).label('qty'),
        func.sum(OrderItem.total_price).label('total')
    ).join(OrderItem).filter(Order.created_at >= since, Order.status == "closed")
    if branch_id:
        q = q.filter(Order.branch_id == branch_id)
    rows = q.group_by('dow').order_by('dow').all()
    days_sl = ["Ned", "Pon", "Tor", "Sre", "Čet", "Pet", "Sob"]
    return [{"day": days_sl[int(r.dow)] if r.dow is not None else "?", "dow": int(r.dow or 0), "quantity": int(r.qty or 0), "sales": float(r.total or 0)} for r in rows]


@router.get("/popularity/bottom")
def bottom_items(limit: int = 10, days: int = 30, branch_id: int = 0, db: Session = Depends(get_db)):
    since = datetime.now() - timedelta(days=days)
    q = db.query(
        OrderItem.item_name,
        func.sum(OrderItem.quantity).label('qty'),
        func.sum(OrderItem.total_price).label('total')
    ).join(Order).filter(Order.created_at >= since, Order.status == "closed")
    if branch_id:
        q = q.filter(Order.branch_id == branch_id)
    rows = q.group_by(OrderItem.item_name).order_by(func.sum(OrderItem.total_price).asc()).limit(limit).all()
    return [{"name": r.item_name, "quantity": int(r.qty or 0), "total": float(r.total or 0)} for r in rows]


@router.get("/summary")
def summary(branch_id: int = 0, db: Session = Depends(get_db)):
    today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    week_ago = today - timedelta(days=7)
    month_ago = today - timedelta(days=30)

    def _payments_since(dt):
        q = db.query(func.coalesce(func.sum(Payment.amount), 0)).filter(Payment.created_at >= dt)
        if branch_id:
            q = q.join(Order, Payment.order_id == Order.id).filter(Order.branch_id == branch_id)
        return q.scalar()

    def _orders_today():
        q = db.query(func.count(Order.id)).filter(Order.created_at >= today)
        if branch_id:
            q = q.filter(Order.branch_id == branch_id)
        return q.scalar()

    ms = _payments_since(month_ago)
    ot = _orders_today()
    return {
        "today_sales": float(_payments_since(today)),
        "week_sales": float(_payments_since(week_ago)),
        "month_sales": float(ms),
        "orders_today": ot,
        "avg_order_value": float(ms / ot if ot else 0)
    }


@router.get("/by-branch")
def sales_by_branch(days: int = 7, db: Session = Depends(get_db)):
    since = datetime.now() - timedelta(days=days)
    branches = db.query(Branch).all()

    stats_q = db.query(
        Order.branch_id,
        func.coalesce(func.sum(Payment.amount), 0).label('sales'),
        func.count(Payment.id.distinct()).label('orders'),
        func.coalesce(func.sum(Payment.tip), 0).label('tips')
    ).join(Order, Payment.order_id == Order.id).filter(Payment.created_at >= since)
    stats_rows = stats_q.group_by(Order.branch_id).all()
    stats_map = {r.branch_id: r for r in stats_rows}

    result = []
    for b in branches:
        s = stats_map.get(b.id)
        result.append({
            "branch_id": b.id, "branch_name": b.name,
            "sales": float(s.sales) if s else 0,
            "orders": s.orders if s else 0,
            "tips": float(s.tips) if s else 0
        })
    return result


@router.get("/report")
def date_range_report(date_from: str = None, date_to: str = None, branch_id: int = 0, db: Session = Depends(get_db)):
    if not date_from:
        date_from = datetime.now().strftime("%Y-%m-%d")
    if not date_to:
        date_to = datetime.now().strftime("%Y-%m-%d")
    start = datetime.fromisoformat(date_from + "T00:00:00")
    end = datetime.fromisoformat(date_to + "T23:59:59")

    pq = db.query(Payment).filter(Payment.created_at >= start, Payment.created_at <= end)
    if branch_id:
        pq = pq.join(Order, Payment.order_id == Order.id).filter(Order.branch_id == branch_id)
    payments = pq.all()
    total_sales = sum(p.amount for p in payments)
    total_tips = sum(p.tip for p in payments if p.tip)

    ocq = db.query(func.count(Order.id.distinct())).join(Payment, Payment.order_id == Order.id).filter(
        Payment.created_at >= start, Payment.created_at <= end
    )
    if branch_id:
        ocq = ocq.filter(Order.branch_id == branch_id)
    order_count = ocq.scalar() or 0

    by_method = {}
    for p in payments:
        by_method[p.method] = by_method.get(p.method, 0) + p.amount

    tq = db.query(
        OrderItem.item_name,
        func.sum(OrderItem.quantity).label('qty'),
        func.sum(OrderItem.total_price).label('total')
    ).join(Order).filter(
        Order.closed_at >= start, Order.closed_at <= end, Order.status == "closed"
    )
    if branch_id:
        tq = tq.filter(Order.branch_id == branch_id)
    top = tq.group_by(OrderItem.item_name).order_by(func.sum(OrderItem.total_price).desc()).limit(10).all()

    return {
        "total_sales": round(total_sales, 2),
        "total_tips": round(total_tips, 2),
        "order_count": order_count,
        "avg_order": round(total_sales / order_count, 2) if order_count else 0,
        "by_method": {k: round(v, 2) for k, v in by_method.items()},
        "top_items": [{"name": r.item_name, "quantity": int(r.qty), "total": round(float(r.total), 2)} for r in top],
        "date_from": date_from,
        "date_to": date_to
    }


@router.get("/food-costs")
def food_cost_analysis(branch_id: int = 0, db: Session = Depends(get_db)):
    q = db.query(MenuItem).filter(MenuItem.is_active == True, MenuItem.price > 0)
    if branch_id:
        q = q.filter(MenuItem.branch_id == branch_id)
    items = q.all()

    rows = []
    cat_totals: dict[str, dict] = {}
    total_cost = 0
    total_revenue = 0

    item_ids = [item.id for item in items]
    all_recipes = db.query(RecipeItem).filter(RecipeItem.menu_item_id.in_(item_ids)).all() if item_ids else []
    ing_ids = list({r.ingredient_id for r in all_recipes})
    all_ingredients = {i.id: i for i in db.query(Ingredient).filter(Ingredient.id.in_(ing_ids)).all()} if ing_ids else {}
    cat_ids = list({item.category_id for item in items if item.category_id})
    all_categories = {c.id: c for c in db.query(Category).filter(Category.id.in_(cat_ids)).all()} if cat_ids else {}
    recipes_by_item: dict[int, list] = {}
    for r in all_recipes:
        recipes_by_item.setdefault(r.menu_item_id, []).append(r)

    for item in items:
        item_recipes = recipes_by_item.get(item.id, [])
        cost = 0
        ing_count = 0
        for r in item_recipes:
            ing = all_ingredients.get(r.ingredient_id)
            if ing and ing.cost_per_unit:
                cost += r.quantity * ing.cost_per_unit
                ing_count += 1
        margin = item.price - cost
        margin_pct = round((margin / item.price) * 100, 1) if item.price else 0
        cat_obj = all_categories.get(item.category_id) if item.category_id else None
        cat_name = cat_obj.name if cat_obj else "?"

        rows.append({
            "id": item.id, "name": item.name,
            "category": cat_name,
            "price": item.price,
            "cost": round(cost, 2),
            "margin": round(margin, 2),
            "margin_pct": margin_pct,
            "ingredient_count": ing_count,
            "has_recipe": ing_count > 0
        })
        total_cost += cost
        total_revenue += item.price

        if cat_name not in cat_totals:
            cat_totals[cat_name] = {"cost": 0, "revenue": 0, "count": 0}
        cat_totals[cat_name]["cost"] += cost
        cat_totals[cat_name]["revenue"] += item.price
        cat_totals[cat_name]["count"] += 1

    categories = []
    for name, ct in sorted(cat_totals.items()):
        cat_margin = ct["revenue"] - ct["cost"]
        cat_margin_pct = round((cat_margin / ct["revenue"]) * 100, 1) if ct["revenue"] else 0
        categories.append({
            "name": name,
            "total_cost": round(ct["cost"], 2),
            "total_revenue": round(ct["revenue"], 2),
            "margin": round(cat_margin, 2),
            "margin_pct": cat_margin_pct,
            "item_count": ct["count"]
        })

    # Sort items by margin_pct ascending (worst first)
    rows.sort(key=lambda r: r["margin_pct"])

    overall_margin = total_revenue - total_cost
    overall_margin_pct = round((overall_margin / total_revenue) * 100, 1) if total_revenue else 0

    low_margin = [r for r in rows if r["has_recipe"] and r["margin_pct"] < 30]
    negative_margin = [r for r in rows if r["has_recipe"] and r["margin_pct"] <= 0]

    return {
        "items": rows,
        "categories": categories,
        "summary": {
            "total_items": len(items),
            "items_with_recipe": sum(1 for r in rows if r["has_recipe"]),
            "items_without_recipe": sum(1 for r in rows if not r["has_recipe"]),
            "total_cost": round(total_cost, 2),
            "total_revenue": round(total_revenue, 2),
            "overall_margin": round(overall_margin, 2),
            "overall_margin_pct": overall_margin_pct,
            "low_margin_count": len(low_margin),
            "negative_margin_count": len(negative_margin)
        },
        "warnings": {
            "no_recipe_items": [r["name"] for r in rows if not r["has_recipe"]],
            "low_margin_items": [{"name": r["name"], "margin_pct": r["margin_pct"]} for r in low_margin],
            "negative_margin_items": [{"name": r["name"], "margin_pct": r["margin_pct"]} for r in negative_margin]
        }
    }


@router.get("/menu-engineering")
def menu_engineering(days: int = 30, branch_id: int = 0, db: Session = Depends(get_db)):
    since = datetime.now() - timedelta(days=days)
    q = db.query(MenuItem).filter(MenuItem.is_active == True, MenuItem.price > 0)
    if branch_id:
        q = q.filter(MenuItem.branch_id == branch_id)
    items = q.all()

    # Get sales data per item
    sales_q = db.query(
        OrderItem.menu_item_id,
        func.sum(OrderItem.quantity).label('qty_sold'),
        func.sum(OrderItem.total_price).label('revenue')
    ).join(Order).filter(
        Order.closed_at >= since,
        Order.status == "closed",
        OrderItem.menu_item_id > 0
    )
    if branch_id:
        sales_q = sales_q.filter(Order.branch_id == branch_id)
    sales_data = sales_q.group_by(OrderItem.menu_item_id).all()
    sales_map = {r.menu_item_id: (int(r.qty_sold), float(r.revenue)) for r in sales_data}

    total_sold = sum(qty for qty, _ in sales_map.values())
    avg_popularity = total_sold / max(len(items), 1)

    rows = []
    item_ids = [item.id for item in items]
    all_recipes = db.query(RecipeItem).filter(RecipeItem.menu_item_id.in_(item_ids)).all() if item_ids else []
    ing_ids = list({r.ingredient_id for r in all_recipes})
    all_ingredients = {i.id: i for i in db.query(Ingredient).filter(Ingredient.id.in_(ing_ids)).all()} if ing_ids else {}
    cat_ids = list({item.category_id for item in items if item.category_id})
    all_categories = {c.id: c for c in db.query(Category).filter(Category.id.in_(cat_ids)).all()} if cat_ids else {}
    recipes_by_item: dict[int, list] = {}
    for r in all_recipes:
        recipes_by_item.setdefault(r.menu_item_id, []).append(r)

    for item in items:
        qty_sold, item_revenue = sales_map.get(item.id, (0, 0))
        item_recipes = recipes_by_item.get(item.id, [])
        cost = 0
        for r in item_recipes:
            ing = all_ingredients.get(r.ingredient_id)
            if ing and ing.cost_per_unit:
                cost += r.quantity * ing.cost_per_unit
        margin = item.price - cost
        margin_pct = round((margin / item.price) * 100, 1) if item.price else 0
        has_recipe = len(item_recipes) > 0

        # Classify
        is_high_margin = margin_pct >= 50 if has_recipe else True
        is_popular = qty_sold >= avg_popularity

        if is_popular and is_high_margin:
            classification = "star"
        elif is_popular and not is_high_margin:
            classification = "plowhorse"
        elif not is_popular and is_high_margin:
            classification = "puzzle"
        else:
            classification = "dog"

        cat_obj = all_categories.get(item.category_id) if item.category_id else None
        cat_name = cat_obj.name if cat_obj else "?"

        rows.append({
            "id": item.id, "name": item.name, "category": cat_name,
            "price": item.price, "cost": round(cost, 2) if has_recipe else None,
            "margin": round(margin, 2) if has_recipe else None,
            "margin_pct": margin_pct if has_recipe else None,
            "qty_sold": qty_sold, "revenue": round(item_revenue, 2),
            "popularity": qty_sold / max(avg_popularity, 1) * 100 if avg_popularity > 0 else 0,
            "has_recipe": has_recipe,
            "classification": classification
        })

    counts = {"star": 0, "plowhorse": 0, "puzzle": 0, "dog": 0}
    for r in rows:
        counts[r["classification"]] += 1

    return {
        "items": rows,
        "summary": {
            "days": days,
            "total_items": len(items),
            "total_sold": total_sold,
            "avg_popularity": round(avg_popularity, 1),
            "avg_margin_pct": round(sum(r["margin_pct"] or 0 for r in rows if r["has_recipe"]) / max(sum(1 for r in rows if r["has_recipe"]), 1), 1),
            "classifications": counts
        }
    }


@router.get("/labor-costs")
def labor_cost_analysis(days: int = 7, branch_id: int = 0, db: Session = Depends(get_db)):
    since = datetime.now() - timedelta(days=days)
    users_q = db.query(User)
    if branch_id:
        users_q = users_q.filter(User.branch_id == branch_id)
    users = users_q.all()

    shifts_q = db.query(EmployeeShift).filter(
        EmployeeShift.clock_in >= since,
        EmployeeShift.clock_out != None
    )
    if branch_id:
        shifts_q = shifts_q.join(User, EmployeeShift.user_id == User.id).filter(User.branch_id == branch_id)
    shifts = shifts_q.all()

    # Revenue in period
    rev_q = db.query(func.coalesce(func.sum(Payment.amount), 0)).filter(Payment.created_at >= since)
    if branch_id:
        rev_q = rev_q.join(Order, Payment.order_id == Order.id).filter(Order.branch_id == branch_id)
    revenue = float(rev_q.scalar())

    # Default hourly rate from settings
    default_rate = db.query(func.max(func.nullif(Setting.value, ''))).filter(Setting.key == 'hourly_wage').scalar()
    default_rate = int(float(default_rate)) if default_rate else 10

    per_user: dict[int, dict] = {}
    for shift in shifts:
        uid = shift.user_id
        if uid not in per_user:
            u = next((x for x in users if x.id == uid), None)
            rate = u.hourly_rate or default_rate if u else default_rate
            per_user[uid] = {
                "user_id": uid, "user_name": u.full_name if u else f"User #{uid}",
                "role": u.role if u else "", "hourly_rate": rate,
                "total_seconds": 0, "shift_count": 0
            }
        if shift.clock_in and shift.clock_out:
            delta = shift.clock_out - shift.clock_in
            per_user[uid]["total_seconds"] += int(delta.total_seconds())
            per_user[uid]["shift_count"] += 1

    total_labor_cost = 0
    total_hours = 0
    employees = []
    for uid, data in per_user.items():
        hours = round(data["total_seconds"] / 3600, 2)
        cost = round(hours * data["hourly_rate"], 2)
        total_hours += hours
        total_labor_cost += cost
        employees.append({
            **data,
            "hours": hours,
            "cost": cost
        })

    employees.sort(key=lambda e: e["cost"], reverse=True)
    labor_pct = round((total_labor_cost / revenue) * 100, 1) if revenue else 0

    return {
        "total_days": days,
        "total_labor_cost": round(total_labor_cost, 2),
        "total_hours": round(total_hours, 2),
        "total_revenue": round(revenue, 2),
        "labor_cost_pct": labor_pct,
        "employee_count": len(employees),
        "default_rate": default_rate,
        "employees": employees,
        "daily": _labor_daily(since, days, branch_id, db)
    }


def _labor_daily(since: datetime, days: int, branch_id: int, db: Session) -> list:
    results = []
    # Pre-load all shifts for the entire period
    all_shifts = db.query(EmployeeShift).filter(
        EmployeeShift.clock_in >= since,
        EmployeeShift.clock_in < since + timedelta(days=days),
        EmployeeShift.clock_out != None
    )
    if branch_id:
        all_shifts = all_shifts.join(User, EmployeeShift.user_id == User.id).filter(User.branch_id == branch_id)
    all_shifts = all_shifts.all()
    user_ids = list({s.user_id for s in all_shifts})
    all_users = {u.id: u for u in db.query(User).filter(User.id.in_(user_ids)).all()} if user_ids else {}
    # Pre-load all revenue for the period
    rev_q = db.query(
        func.strftime('%Y-%m-%d', Payment.created_at).label('day'),
        func.coalesce(func.sum(Payment.amount), 0).label('total')
    ).filter(Payment.created_at >= since, Payment.created_at < since + timedelta(days=days))
    if branch_id:
        rev_q = rev_q.join(Order, Payment.order_id == Order.id).filter(Order.branch_id == branch_id)
    rev_by_day = {r.day: float(r.total) for r in rev_q.group_by('day').all()}

    for i in range(days):
        day_start = since + timedelta(days=i)
        day_end = day_start + timedelta(days=1)
        day_key = day_start.strftime("%Y-%m-%d")
        day_shifts = [s for s in all_shifts if s.clock_in and s.clock_in >= day_start and s.clock_in < day_end]
        day_hours = 0
        day_cost = 0
        for s in day_shifts:
            if s.clock_out:
                hrs = (s.clock_out - s.clock_in).total_seconds() / 3600
                u = all_users.get(s.user_id)
                rate = u.hourly_rate if u and u.hourly_rate else 10
                day_hours += hrs
                day_cost += hrs * rate
        day_rev = rev_by_day.get(day_key, 0)
        results.append({
            "date": day_key,
            "hours": round(day_hours, 2),
            "labor_cost": round(day_cost, 2),
            "revenue": round(day_rev, 2),
            "labor_pct": round((day_cost / day_rev) * 100, 1) if day_rev else 0
        })
    return results


@router.get("/profit-loss")
def profit_loss(date_from: str = None, date_to: str = None, branch_id: int = 0, db: Session = Depends(get_db)):
    if not date_from:
        date_from = datetime.now().replace(day=1).strftime("%Y-%m-%d")
    if not date_to:
        date_to = datetime.now().strftime("%Y-%m-%d")
    start = datetime.fromisoformat(date_from + "T00:00:00")
    end = datetime.fromisoformat(date_to + "T23:59:59")
    period_days = (end - start).days + 1
    prev_start = start - timedelta(days=period_days)
    prev_end = start - timedelta(seconds=1)

    recipe_items = db.query(RecipeItem).all()
    ingredients = {i.id: i for i in db.query(Ingredient).all()}
    item_cost_map = {}
    for ri in recipe_items:
        ing = ingredients.get(ri.ingredient_id)
        if ing and ing.cost_per_unit:
            item_cost_map[ri.menu_item_id] = item_cost_map.get(ri.menu_item_id, 0) + ri.quantity * ing.cost_per_unit

    def _compute(dt_start, dt_end):
        oq = db.query(Order).filter(
            Order.closed_at >= dt_start, Order.closed_at < dt_end,
            Order.status == "closed"
        )
        if branch_id:
            oq = oq.filter(Order.branch_id == branch_id)
        orders = oq.all()
        revenue = sum(o.total or 0 for o in orders)
        order_count = len(orders)

        cogs = 0
        cat_data = {}
        if orders:
            oids = [o.id for o in orders]
            oitems = db.query(OrderItem).filter(OrderItem.order_id.in_(oids)).all()
            menu_item_ids = list({oi.menu_item_id for oi in oitems if oi.menu_item_id})
            menu_items_map = {mi.id: mi for mi in db.query(MenuItem).filter(MenuItem.id.in_(menu_item_ids)).all()} if menu_item_ids else {}
            cat_ids = list({mi.category_id for mi in menu_items_map.values() if mi.category_id})
            categories_map = {c.id: c for c in db.query(Category).filter(Category.id.in_(cat_ids)).all()} if cat_ids else {}
            for oi in oitems:
                cost = item_cost_map.get(oi.menu_item_id, 0) * (oi.quantity or 0)
                cogs += cost
                if oi.menu_item_id:
                    mi = menu_items_map.get(oi.menu_item_id)
                    if mi and mi.category_id:
                        cn = categories_map[mi.category_id].name if mi.category_id in categories_map else "?"
                        if cn not in cat_data:
                            cat_data[cn] = {"revenue": 0, "cogs": 0}
                        cat_data[cn]["revenue"] += oi.total_price or 0
                        cat_data[cn]["cogs"] += cost

        gp = revenue - cogs
        gmp = round((gp / revenue) * 100, 1) if revenue else 0

        sq = db.query(EmployeeShift).filter(
            EmployeeShift.clock_in >= dt_start, EmployeeShift.clock_in < dt_end,
            EmployeeShift.clock_out != None
        )
        if branch_id:
            bu = {u.id for u in db.query(User.id).filter(User.branch_id == branch_id).all()}
            sq = sq.filter(EmployeeShift.user_id.in_(bu))
        secs = sum(int((s.clock_out - s.clock_in).total_seconds()) for s in sq.all() if s.clock_in and s.clock_out)
        lh = secs / 3600
        dr = db.query(func.max(func.nullif(Setting.value, ''))).filter(Setting.key == 'hourly_wage').scalar()
        lc = lh * (int(float(dr)) if dr else 10)
        # Operating expenses
        eq = db.query(func.coalesce(func.sum(Expense.amount), 0)).filter(
            Expense.expense_date >= dt_start.date(), Expense.expense_date < dt_end.date()
        )
        if branch_id:
            eq = eq.filter(Expense.branch_id == branch_id)
        op_ex = float(eq.scalar())
        np = gp - lc - op_ex
        nmp = round((np / revenue) * 100, 1) if revenue else 0

        return {
            "revenue": round(revenue, 2), "cogs": round(cogs, 2),
            "gross_profit": round(gp, 2), "gross_margin_pct": gmp,
            "labor_cost": round(lc, 2), "labor_hours": round(lh, 1),
            "operating_expenses": round(op_ex, 2),
            "net_profit": round(np, 2), "net_margin_pct": nmp,
            "order_count": order_count,
            "avg_order_value": round(revenue / order_count, 2) if order_count else 0,
            "cogs_pct": round((cogs / revenue) * 100, 1) if revenue else 0,
            "labor_pct": round((lc / revenue) * 100, 1) if revenue else 0,
            "categories": sorted(
                [{"name": k, "revenue": round(v["revenue"], 2), "cogs": round(v["cogs"], 2),
                  "margin_pct": round(((v["revenue"] - v["cogs"]) / v["revenue"]) * 100, 1) if v["revenue"] else 0}
                 for k, v in cat_data.items()],
                key=lambda x: x["revenue"], reverse=True
            )
        }

    current = _compute(start, end)
    previous = _compute(prev_start, prev_end) if period_days <= 365 else None

    daily = []
    for i in range(period_days):
        ds = start + timedelta(days=i)
        dr = _compute(ds, ds + timedelta(days=1))
        daily.append({"date": ds.strftime("%Y-%m-%d"), "revenue": dr["revenue"], "cogs": dr["cogs"],
                      "gross_profit": dr["gross_profit"], "labor_cost": dr["labor_cost"], "operating_expenses": dr["operating_expenses"], "net_profit": dr["net_profit"]})

    return {"current": current, "previous": previous, "daily": daily, "date_from": date_from, "date_to": date_to, "days": period_days}


@router.get("/sales-forecast")
def sales_forecast(days: int = 90, forecast_days: int = 14, branch_id: int = 0, db: Session = Depends(get_db)):
    since = datetime.now() - timedelta(days=days)
    next_day = since + timedelta(days=days)
    q = db.query(
        func.date(Payment.created_at).label('day'),
        func.coalesce(func.sum(Payment.amount), 0).label('total')
    ).filter(Payment.created_at >= since, Payment.created_at < next_day)
    if branch_id:
        q = q.join(Order, Payment.order_id == Order.id).filter(Order.branch_id == branch_id)
    rows = q.group_by('day').all()
    sales_by_day = {str(r.day): round(float(r.total), 2) for r in rows}
    data = {}
    for i in range(days):
        ds = since + timedelta(days=i)
        day_str = ds.strftime("%Y-%m-%d")
        data[day_str] = {"date": day_str, "dow": ds.weekday(), "sales": sales_by_day.get(day_str, 0)}

    values = [v["sales"] for v in data.values()]
    n = len(values)

    # 7-day moving average
    ma7 = []
    for i in range(n):
        if i < 6:
            ma7.append(None)
        else:
            ma7.append(round(sum(values[i-6:i+1]) / 7, 2))

    # Same-day-of-week average
    dow_vals = [[] for _ in range(7)]
    for v in data.values():
        dow_vals[v["dow"]].append(v["sales"])
    dow_avg = {i: (sum(vals) / len(vals)) if vals else 0 for i, vals in enumerate(dow_vals)}

    # Linear trend (simple linear regression on last 30 days)
    recent = values[-30:]
    if len(recent) >= 7:
        x_vals = list(range(len(recent)))
        x_mean = sum(x_vals) / len(x_vals)
        y_mean = sum(recent) / len(recent)
        num = sum((x - x_mean) * (y - y_mean) for x, y in zip(x_vals, recent))
        den = sum((x - x_mean) ** 2 for x in x_vals)
        slope = num / den if den else 0
    else:
        slope = 0

    last_sales = values[-1] if values else 0
    forecasts = []
    for i in range(1, forecast_days + 1):
        fd = datetime.now() + timedelta(days=i)
        f_dow = fd.weekday()
        trend_component = last_sales + slope * i
        dow_component = dow_avg[f_dow]
        forecast = (trend_component * 0.3 + dow_component * 0.7)
        forecasts.append({
            "date": fd.strftime("%Y-%m-%d"),
            "dow": f_dow,
            "forecast": round(forecast, 2)
        })

    # Historical data as sorted list
    historical = [v for v in data.values()]

    return {
        "historical": historical,
        "ma7": [{"date": k, "ma7": v} for k, v in zip(data.keys(), ma7) if v is not None],
        "forecast": forecasts,
        "dow_averages": [{"dow": i, "avg": round(dow_avg[i], 2)} for i in range(7)],
        "slope": round(slope, 2),
        "total_historical": round(sum(values), 2),
        "total_forecast": round(sum(f["forecast"] for f in forecasts), 2)
    }


@router.get("/yoy-comparison")
def yoy_comparison(days: int = 30, branch_id: int = 0, db: Session = Depends(get_db)):
    now = datetime.now()
    current_end = now
    current_start = now - timedelta(days=days)
    last_year_end = current_start - timedelta(seconds=1)
    last_year_start = current_start - timedelta(days=days)

    def _period_sales(dt_start, dt_end):
        q = db.query(func.coalesce(func.sum(Payment.amount), 0)).filter(
            Payment.created_at >= dt_start, Payment.created_at < dt_end
        )
        if branch_id:
            q = q.join(Order, Payment.order_id == Order.id).filter(Order.branch_id == branch_id)
        return float(q.scalar())

    def _period_order_count(dt_start, dt_end):
        q = db.query(func.count(Order.id)).filter(
            Order.closed_at >= dt_start, Order.closed_at < dt_end, Order.status == "closed"
        )
        if branch_id:
            q = q.filter(Order.branch_id == branch_id)
        return q.scalar() or 0

    def _period_orders_by_dow(dt_start, dt_end):
        q = db.query(
            func.strftime('%w', Order.closed_at).label('dow'),
            func.count(Order.id).label('cnt')
        ).filter(Order.closed_at >= dt_start, Order.closed_at < dt_end, Order.status == "closed")
        if branch_id:
            q = q.filter(Order.branch_id == branch_id)
        return {int(r.dow): r.cnt for r in q.group_by('dow').all()}

    # Daily breakdown
    current_daily = []
    last_year_daily = []
    days_of_week = ["Ned", "Pon", "Tor", "Sre", "Čet", "Pet", "Sob"]

    for i in range(days):
        ds = current_start + timedelta(days=i)
        de = ds + timedelta(days=1)
        cur_sales = _period_sales(ds, de)

        lys = last_year_start + timedelta(days=i)
        lye = lys + timedelta(days=1)
        ly_sales = _period_sales(lys, lye)

        current_daily.append({"date": ds.strftime("%Y-%m-%d"), "sales": cur_sales, "dow": ds.weekday()})
        last_year_daily.append({"date": lys.strftime("%Y-%m-%d"), "sales": ly_sales, "dow": lys.weekday()})

    cur_sales = _period_sales(current_start, current_end)
    ly_sales = _period_sales(last_year_start, last_year_end)
    cur_orders = _period_order_count(current_start, current_end)
    ly_orders = _period_order_count(last_year_start, last_year_end)
    cur_dow = _period_orders_by_dow(current_start, current_end)
    ly_dow = _period_orders_by_dow(last_year_start, last_year_end)

    return {
        "current": {
            "date_from": current_start.strftime("%Y-%m-%d"),
            "date_to": current_end.strftime("%Y-%m-%d"),
            "sales": round(cur_sales, 2),
            "orders": cur_orders,
            "avg_order": round(cur_sales / cur_orders, 2) if cur_orders else 0,
            "daily": current_daily,
            "dow": [{"dow": i, "label": days_of_week[i], "count": cur_dow.get(i, 0)} for i in range(7)]
        },
        "last_year": {
            "date_from": last_year_start.strftime("%Y-%m-%d"),
            "date_to": last_year_end.strftime("%Y-%m-%d"),
            "sales": round(ly_sales, 2),
            "orders": ly_orders,
            "avg_order": round(ly_sales / ly_orders, 2) if ly_orders else 0,
            "daily": last_year_daily,
            "dow": [{"dow": i, "label": days_of_week[i], "count": ly_dow.get(i, 0)} for i in range(7)]
        },
        "changes": {
            "sales_pct": round(((cur_sales - ly_sales) / ly_sales) * 100, 1) if ly_sales else 0,
            "orders_pct": round(((cur_orders - ly_orders) / ly_orders) * 100, 1) if ly_orders else 0,
            "sales_diff": round(cur_sales - ly_sales, 2),
        }
    }


@router.get("/customer-rfm")
def customer_rfm(branch_id: int = 0, min_orders: int = 1, db: Session = Depends(get_db)):
    now = datetime.now()
    customers = db.query(Customer).all()
    if not customers:
        return {"segments": {}, "customers": [], "summary": {}}

    # Gather order stats per customer
    from collections import defaultdict
    stats: dict[int, dict] = {}
    cust_ids = [c.id for c in customers]
    all_orders_q = db.query(Order).filter(
        Order.customer_id.in_(cust_ids), Order.status == "closed"
    )
    if branch_id:
        all_orders_q = all_orders_q.filter(Order.branch_id == branch_id)
    all_orders = all_orders_q.all()
    orders_by_customer: dict[int, list] = {}
    for o in all_orders:
        orders_by_customer.setdefault(o.customer_id, []).append(o)
    for c in customers:
        orders = sorted(orders_by_customer.get(c.id, []), key=lambda o: o.closed_at or o.created_at, reverse=True)
        if len(orders) < min_orders:
            continue
        last_order = orders[0].closed_at or orders[0].created_at
        recency = (now - last_order).days
        stats[c.id] = {
            "customer_id": c.id, "name": c.name, "phone": c.phone, "email": c.email,
            "recency": recency,
            "frequency": len(orders),
            "monetary": sum(o.total or 0 for o in orders),
            "avg_order": round(sum(o.total or 0 for o in orders) / len(orders), 2),
            "last_order": str(last_order),
            "loyalty_points": c.loyalty_points or 0,
            "is_member": c.is_member
        }

    if not stats:
        return {"segments": {}, "customers": [], "summary": {}}

    vals = list(stats.values())
    r_vals = sorted(set(s["recency"] for s in vals))
    f_vals = sorted(set(s["frequency"] for s in vals))
    m_vals = sorted(set(s["monetary"] for s in vals))

    def _score(val, sorted_vals, reverse=False):
        if len(sorted_vals) <= 1:
            return 3
        n = len(sorted_vals)
        if reverse:
            rank = sum(1 for v in sorted_vals if v >= val)
        else:
            rank = sum(1 for v in sorted_vals if v <= val)
        pct = rank / n
        if pct >= 0.67: return 5
        if pct >= 0.33: return 3
        return 1

    SEGMENTS = [
        ("champions", lambda r, f, m: r >= 4 and f >= 4 and m >= 4, "🏆 Prvaki", "Visoka vrednost, aktivni, redni"),
        ("loyal", lambda r, f, m: f >= 4 and m >= 4, "💎 Zvesti", "Pogosto kupujejo, visoka vrednost"),
        ("potential", lambda r, f, m: r >= 4 and f >= 3 and m >= 3, "🌟 Potencialni", "Nedavni, srednja vrednost"),
        ("new", lambda r, f, m: r >= 4 and f <= 2, "🆕 Novi", "Nedavni, malo nakupov"),
        ("at_risk", lambda r, f, m: r <= 2 and f >= 3, "⚠️ Ogroženi", "Ni jih bilo že nekaj časa"),
        ("dormant", lambda r, f, m: r <= 2 and f <= 2, "💤 Speči", "Ni jih bilo že dolgo"),
        ("need_attention", lambda r, f, m: r <= 3, "👀 Pozornost", "Potrebujejo pozornost"),
    ]

    segments: dict = {}
    for cid, s in stats.items():
        rs = _score(s["recency"], r_vals, reverse=True)
        fs = _score(s["frequency"], f_vals)
        ms = _score(s["monetary"], m_vals)
        s["r_score"] = rs
        s["f_score"] = fs
        s["m_score"] = ms
        s["rfm"] = f"{rs}{fs}{ms}"

        seg_key = "other"
        for key, cond, _, _ in SEGMENTS:
            if cond(rs, fs, ms):
                seg_key = key
                break
        s["segment"] = seg_key
        if seg_key not in segments:
            si = next((x for x in SEGMENTS if x[0] == seg_key), None)
            segments[seg_key] = {
                "label": si[1] if si else seg_key,
                "desc": si[2] if si else "",
                "count": 0, "total_spent": 0, "avg_recency": 0, "customers": []
            }
        seg = segments[seg_key]
        seg["count"] += 1
        seg["total_spent"] += s["monetary"]
        seg["customers"].append(cid)

    for v in segments.values():
        v["total_spent"] = round(v["total_spent"], 2) if v["total_spent"] else 0
        v["avg_recency"] = round(sum(stats[c]["recency"] for c in v["customers"]) / v["count"]) if v["count"] else 0

    return {
        "segments": segments,
        "customers": sorted(stats.values(), key=lambda x: x["monetary"], reverse=True),
        "summary": {
            "total_customers": len(stats),
            "total_spent": round(sum(s["monetary"] for s in vals), 2),
            "avg_frequency": round(sum(s["frequency"] for s in vals) / len(vals), 1),
            "avg_recency": round(sum(s["recency"] for s in vals) / len(vals), 0),
            "avg_order_value": round(sum(s["avg_order"] for s in vals) / len(vals), 2),
        }
    }


@router.get("/inventory-forecast")
def inventory_forecast(forecast_days: int = 7, branch_id: int = 0, db: Session = Depends(get_db)):
    # Get recent sales data per menu item (last 30 days)
    since = datetime.now() - timedelta(days=30)
    sales_q = db.query(
        OrderItem.menu_item_id,
        func.sum(OrderItem.quantity).label('qty')
    ).join(Order).filter(
        Order.closed_at >= since,
        Order.status == "closed",
        OrderItem.menu_item_id > 0
    )
    if branch_id:
        sales_q = sales_q.filter(Order.branch_id == branch_id)
    sales_rows = sales_q.group_by(OrderItem.menu_item_id).all()
    item_sales = {r.menu_item_id: int(r.qty) for r in sales_rows}
    total_qty = sum(item_sales.values()) or 1

    # Per-ingredient usage calculation
    recipes = db.query(RecipeItem).all()
    ingredients = {i.id: i for i in db.query(Ingredient).all()}

    # Usage per 30 days
    ing_usage: dict[int, float] = {}
    for ri in recipes:
        if ri.menu_item_id in item_sales:
            ing_usage[ri.ingredient_id] = ing_usage.get(ri.ingredient_id, 0) + ri.quantity * item_sales[ri.menu_item_id]

    # Daily avg × forecast days
    results = []
    total_forecast_cost = 0
    for ing_id, usage_30d in ing_usage.items():
        ing = ingredients.get(ing_id)
        if not ing:
            continue
        daily_avg = usage_30d / 30
        forecast_usage = daily_avg * forecast_days
        remaining_stock = ing.stock or 0
        days_remaining = round(remaining_stock / daily_avg, 1) if daily_avg > 0 else 999
        will_run_out = days_remaining < forecast_days and daily_avg > 0
        need_to_order = remaining_stock <= ing.min_stock or (daily_avg > 0 and remaining_stock / daily_avg < 7)
        cost_at_risk = max(0, forecast_usage - remaining_stock) * (ing.cost_per_unit or 0) if will_run_out else 0
        total_forecast_cost += cost_at_risk

        results.append({
            "ingredient_id": ing.id,
            "ingredient_name": ing.name,
            "unit": ing.unit,
            "category": ing.category,
            "current_stock": remaining_stock,
            "min_stock": ing.min_stock,
            "cost_per_unit": ing.cost_per_unit,
            "daily_usage": round(daily_avg, 2),
            "forecast_usage_7d": round(daily_avg * 7, 1),
            "forecast_usage": round(forecast_usage, 1),
            "days_remaining": days_remaining,
            "will_run_out": will_run_out,
            "need_to_order": need_to_order,
            "cost_at_risk": round(cost_at_risk, 2),
        })

    results.sort(key=lambda r: (not r["will_run_out"], -r["cost_at_risk"]))

    return {
        "ingredients": results,
        "summary": {
            "total_ingredients": len(results),
            "will_run_out": sum(1 for r in results if r["will_run_out"]),
            "need_to_order": sum(1 for r in results if r["need_to_order"]),
            "total_cost_at_risk": round(total_forecast_cost, 2),
            "forecast_days": forecast_days,
            "total_stock_value": round(sum(
                r["current_stock"] * (r["cost_per_unit"] or 0) for r in results
            ), 2),
        }
    }


@router.get("/recipe-optimizer")
def recipe_optimizer(branch_id: int = 0, db: Session = Depends(get_db)):
    q = db.query(MenuItem).filter(MenuItem.is_active == True, MenuItem.price > 0)
    if branch_id:
        q = q.filter(MenuItem.branch_id == branch_id)
    items = q.all()

    all_ings = db.query(Ingredient).filter(Ingredient.cost_per_unit > 0).all()
    ing_by_unit: dict[str, list[Ingredient]] = {}
    for ing in all_ings:
        unit = (ing.unit or "").lower()
        if unit not in ing_by_unit:
            ing_by_unit[unit] = []
        ing_by_unit[unit].append(ing)

    results = []
    item_ids = [item.id for item in items]
    all_recipes = db.query(RecipeItem).filter(RecipeItem.menu_item_id.in_(item_ids)).all() if item_ids else []
    ing_ids = list({r.ingredient_id for r in all_recipes})
    all_ingredients = {i.id: i for i in db.query(Ingredient).filter(Ingredient.id.in_(ing_ids)).all()} if ing_ids else {}
    cat_ids = list({item.category_id for item in items if item.category_id})
    all_categories = {c.id: c for c in db.query(Category).filter(Category.id.in_(cat_ids)).all()} if cat_ids else {}
    recipes_by_item: dict[int, list] = {}
    for r in all_recipes:
        recipes_by_item.setdefault(r.menu_item_id, []).append(r)

    for item in items:
        item_recipes = recipes_by_item.get(item.id, [])
        if not item_recipes:
            continue
        current_cost = 0
        suggestions = []
        for r in item_recipes:
            ing = all_ingredients.get(r.ingredient_id)
            if not ing or not ing.cost_per_unit:
                current_cost += r.quantity * 0
                continue
            ing_cost = r.quantity * ing.cost_per_unit
            current_cost += ing_cost
            unit = (ing.unit or "").lower()
            alt_ings = ing_by_unit.get(unit, [])
            best_alt = None
            best_saving = 0
            for alt in alt_ings:
                if alt.id == ing.id or not alt.cost_per_unit:
                    continue
                alt_cost = r.quantity * alt.cost_per_unit
                saving = ing_cost - alt_cost
                if saving > 0 and saving > best_saving:
                    best_saving = saving
                    best_alt = alt
            if best_alt:
                suggestions.append({
                    "current_ingredient": ing.name,
                    "current_cost_per_unit": ing.cost_per_unit,
                    "quantity": r.quantity,
                    "current_line_cost": round(ing_cost, 2),
                    "suggested_ingredient": best_alt.name,
                    "suggested_cost_per_unit": best_alt.cost_per_unit,
                    "suggested_line_cost": round(r.quantity * best_alt.cost_per_unit, 2),
                    "saving": round(best_saving, 2)
                })
        if current_cost == 0:
            continue
        optimized_cost = current_cost - sum(s["saving"] for s in suggestions)
        margin = item.price - current_cost
        opt_margin = item.price - optimized_cost
        cat_obj = all_categories.get(item.category_id) if item.category_id else None
        cat_name = cat_obj.name if cat_obj else "?"
        results.append({
            "id": item.id,
            "name": item.name,
            "category": cat_name,
            "price": item.price,
            "current_cost": round(current_cost, 2),
            "current_margin": round(margin, 2),
            "current_margin_pct": round((margin / item.price) * 100, 1) if item.price else 0,
            "optimized_cost": round(optimized_cost, 2),
            "optimized_margin": round(opt_margin, 2),
            "optimized_margin_pct": round((opt_margin / item.price) * 100, 1) if item.price else 0,
            "potential_saving": round(current_cost - optimized_cost, 2),
            "saving_pct": round(((current_cost - optimized_cost) / current_cost) * 100, 1) if current_cost else 0,
            "suggestions": suggestions,
            "suggestion_count": len(suggestions)
        })

    results.sort(key=lambda r: -r["potential_saving"])
    total_current = sum(r["current_cost"] for r in results)
    total_optimized = sum(r["optimized_cost"] for r in results)
    return {
        "items": results,
        "summary": {
            "total_items": len(results),
            "total_current_cost": round(total_current, 2),
            "total_optimized_cost": round(total_optimized, 2),
            "total_potential_saving": round(total_current - total_optimized, 2),
            "saving_pct": round(((total_current - total_optimized) / total_current) * 100, 1) if total_current else 0,
            "items_with_savings": sum(1 for r in results if r["potential_saving"] > 0)
        }
    }


@router.get("/prep-list")
def prep_list(date_str: str = "", branch_id: int = 0, db: Session = Depends(get_db)):
    try:
        target = datetime.strptime(date_str, "%Y-%m-%d") if date_str else datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    except (ValueError, TypeError):
        target = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    next_day = target + timedelta(days=1)
    dow = target.weekday()

    # Historical avg for this day of week (last 4 weeks)
    four_weeks_ago = target - timedelta(weeks=4)
    hist_items: dict[int, int] = {}
    hist_q = db.query(
        OrderItem.menu_item_id, func.sum(OrderItem.quantity)
    ).join(Order, OrderItem.order_id == Order.id).filter(
        Order.created_at >= four_weeks_ago, Order.created_at < target, Order.status == "closed"
    )
    if branch_id:
        hist_q = hist_q.filter(Order.branch_id == branch_id)
    for item_id, qty in hist_q.group_by(OrderItem.menu_item_id).all():
        hist_items[item_id] = qty or 0

    hist_avg = {k: round(v / 4) for k, v in hist_items.items()}

    # Scheduled orders for today
    scheduled: dict[int, int] = {}
    sq = db.query(OrderItem.menu_item_id, func.sum(OrderItem.quantity)).join(Order, OrderItem.order_id == Order.id).filter(
        Order.scheduled_at >= target, Order.scheduled_at < next_day, Order.status == "open"
    )
    if branch_id:
        sq = sq.filter(Order.branch_id == branch_id)
    for item_id, qty in sq.group_by(OrderItem.menu_item_id).all():
        scheduled[item_id] = (qty or 0)

    # Reservations today
    res_count = db.query(func.sum(Reservation.guests)).filter(
        Reservation.reservation_time >= target, Reservation.reservation_time < next_day,
        Reservation.status.in_(["confirmed", "seated"])
    )
    if branch_id:
        res_count = res_count.filter(Reservation.branch_id == branch_id)
    total_guests = res_count.scalar() or 0

    # Estimate extra items from reservations (assume ~1.5 items per guest)
    res_extra = round(total_guests * 1.5)

    # All active menu items
    items_q = db.query(MenuItem).filter(MenuItem.is_active == True)
    if branch_id:
        items_q = items_q.filter(MenuItem.branch_id == branch_id)
    menu_items = items_q.all()

    # Recipes lookup
    recipes = db.query(RecipeItem).all()
    recipes_by_item: dict[int, list] = {}
    for r in recipes:
        recipes_by_item.setdefault(r.menu_item_id, []).append(r)

    # Ingredients lookup
    ings_map: dict[int, any] = {i.id: i for i in db.query(Ingredient).all()}

    results = []
    all_ingredient_needs: dict[int, float] = {}
    total_forecast = 0

    for mi in menu_items:
        hist = hist_avg.get(mi.id, 0)
        sched = scheduled.get(mi.id, 0)
        # Distribute reservation extras proportionally based on popularity
        res_share = round(res_extra * (hist / max(sum(hist_avg.values()), 1)))
        total = max(hist, sched) + res_share
        if total <= 0:
            continue
        total_forecast += total
        item_recipes = recipes_by_item.get(mi.id, [])
        ingredients_list = []
        for r in item_recipes:
            ing = ings_map.get(r.ingredient_id)
            if not ing:
                continue
            req = r.quantity * total
            low = ing.stock < req
            all_ingredient_needs[r.ingredient_id] = all_ingredient_needs.get(r.ingredient_id, 0) + req
            ingredients_list.append({
                "ingredient_id": ing.id,
                "name": ing.name,
                "required_qty": round(req, 2),
                "stock": ing.stock,
                "unit": ing.unit,
                "low": low
            })

        results.append({
            "item_id": mi.id,
            "item_name": mi.name,
            "price": mi.price,
            "forecast_qty": hist,
            "scheduled_qty": sched,
            "reservation_extra": res_share,
            "total_qty": total,
            "has_recipe": len(item_recipes) > 0,
            "ingredients": ingredients_list
        })

    results.sort(key=lambda x: x["total_qty"], reverse=True)

    low_stock = []
    for ing_id, req in all_ingredient_needs.items():
        ing = ings_map.get(ing_id)
        if ing and ing.stock < req:
            low_stock.append({
                "ingredient_id": ing.id,
                "name": ing.name,
                "required": round(req, 2),
                "stock": ing.stock,
                "unit": ing.unit,
                "shortage": round(req - ing.stock, 2)
            })

    return {
        "date": target.strftime("%Y-%m-%d"),
        "total_guests_reservations": total_guests,
        "items": results,
        "summary": {
            "total_items": len(results),
            "total_forecast": total_forecast,
            "items_with_recipes": sum(1 for r in results if r["has_recipe"]),
            "items_without_recipes": sum(1 for r in results if not r["has_recipe"]),
            "low_stock_ingredients": low_stock
        }
    }


@router.get("/recipe-scale")
def recipe_scale(item_id: int, portions: int = 1, db: Session = Depends(get_db)):
    item = db.query(MenuItem).filter(MenuItem.id == item_id).first()
    if not item:
        raise HTTPException(404, "Artikel ne obstaja")

    recipes = db.query(RecipeItem).filter(RecipeItem.menu_item_id == item_id).all()
    ings_map = {i.id: i for i in db.query(Ingredient).all()}

    ingredients = []
    total_cost = 0
    for r in recipes:
        ing = ings_map.get(r.ingredient_id)
        if not ing:
            continue
        required = r.quantity * portions
        cost = required * (ing.cost_per_unit or 0)
        total_cost += cost
        ingredients.append({
            "ingredient_id": ing.id,
            "name": ing.name,
            "unit": ing.unit,
            "qty_per_unit": r.quantity,
            "required_qty": round(required, 2),
            "stock": ing.stock,
            "cost": round(cost, 4),
            "low": ing.stock < required,
            "shortage": round(max(0, required - ing.stock), 2) if ing.stock < required else 0
        })

    return {
        "item_id": item.id,
        "item_name": item.name,
        "price": item.price,
        "portions": portions,
        "total_cost": round(total_cost, 2),
        "cost_per_portion": round(total_cost / portions, 2) if portions else 0,
        "margin_pct": round(((item.price - (total_cost / portions)) / item.price) * 100, 1) if item.price and portions else 0,
        "ingredients": ingredients
    }


from app.models.payment import Payment

@router.get("/sales-targets")
def sales_targets(db: Session = Depends(get_db)):
    settings = db.query(Setting).filter(Setting.key.in_([
        "daily_sales_target", "monthly_sales_target"
    ])).all()
    targets = {}
    for s in settings:
        try:
            targets[s.key] = float(s.value)
        except (ValueError, TypeError):
            targets[s.key] = 0
    daily_target = targets.get("daily_sales_target", 0)
    monthly_target = targets.get("monthly_sales_target", 0)

    today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    tomorrow = today + timedelta(days=1)
    month_start = today.replace(day=1)

    daily_actual = float(db.query(func.coalesce(func.sum(Payment.amount), 0))
        .filter(Payment.created_at >= today, Payment.created_at < tomorrow).scalar())
    monthly_actual = float(db.query(func.coalesce(func.sum(Payment.amount), 0))
        .filter(Payment.created_at >= month_start, Payment.created_at < tomorrow).scalar())

    day_of_month = (datetime.now() - month_start).days + 1
    days_in_month = (datetime.now().replace(month=datetime.now().month % 12 + 1, day=1) - timedelta(days=1)).day \
        if datetime.now().month < 12 else 31  # rough
    # proper days_in_month
    next_month = month_start.replace(day=28) + timedelta(days=4)
    days_in_month = (next_month - timedelta(days=next_month.day)).day

    monthly_pace = (monthly_target / days_in_month) * day_of_month if monthly_target and days_in_month else 0

    return {
        "daily_target": daily_target,
        "daily_actual": round(daily_actual, 2),
        "daily_pct": round((daily_actual / daily_target * 100), 1) if daily_target else 0,
        "daily_remaining": round(max(0, daily_target - daily_actual), 2),
        "monthly_target": monthly_target,
        "monthly_actual": round(monthly_actual, 2),
        "monthly_pct": round((monthly_actual / monthly_target * 100), 1) if monthly_target else 0,
        "monthly_remaining": round(max(0, monthly_target - monthly_actual), 2),
        "monthly_pace": round(monthly_pace, 2),
        "days_in_month": days_in_month,
        "day_of_month": day_of_month
    }


@router.put("/sales-targets")
def update_sales_targets(data: UpdateSalesTargets, db: Session = Depends(get_db)):
    keys_to_update = [k for k in ["daily_sales_target", "monthly_sales_target"] if getattr(data, k, None) is not None]
    if keys_to_update:
        existing_settings = {s.key: s for s in db.query(Setting).filter(Setting.key.in_(keys_to_update)).all()}
        for key in keys_to_update:
            val = getattr(data, key, None)
            if val is not None:
                if key in existing_settings:
                    existing_settings[key].value = str(val)
                else:
                    db.add(Setting(key=key, value=str(val)))
    db.commit()
    return {"ok": True}


@router.get("/sales-compare")
def sales_comparison(branch_id: int = 0, db: Session = Depends(get_db)):
    today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    tomorrow = today + timedelta(days=1)
    yesterday = today - timedelta(days=1)
    last_week = today - timedelta(days=7)
    last_week_end = last_week + timedelta(days=1)

    def _sales(day_start: datetime, day_end: datetime) -> float:
        q = db.query(func.coalesce(func.sum(Payment.amount), 0)).filter(
            Payment.created_at >= day_start, Payment.created_at < day_end
        )
        if branch_id:
            q = q.join(Order, Payment.order_id == Order.id).filter(Order.branch_id == branch_id)
        return float(q.scalar())

    today_sales = _sales(today, tomorrow)
    yesterday_sales = _sales(yesterday, today)
    last_week_sales = _sales(last_week, last_week_end)

    def _pct(a: float, b: float) -> float | None:
        if b == 0: return None
        return round((a - b) / b * 100, 1)

    return {
        "today": round(today_sales, 2),
        "yesterday": round(yesterday_sales, 2),
        "last_week": round(last_week_sales, 2),
        "vs_yesterday_pct": _pct(today_sales, yesterday_sales),
        "vs_last_week_pct": _pct(today_sales, last_week_sales),
    }
