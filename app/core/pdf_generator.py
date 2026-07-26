"""PDF Generator for restaurant reports — dnevna, tedenska, mesečna poročila."""
from io import BytesIO
from datetime import datetime, timedelta
from sqlalchemy.orm import Session


def generate_daily_report(db: Session, date: datetime, branch_id: int = None) -> BytesIO:
    """Generiraj dnevno poročilo za PDF."""
    from app.models.order import Order
    from app.models.payment import Payment
    from app.models.menu_item import MenuItem

    buffer = BytesIO()

    # Query orders for the day
    start = date.replace(hour=0, minute=0, second=0, microsecond=0)
    end = start + timedelta(days=1)

    q = db.query(Order).filter(
        Order.created_at >= start,
        Order.created_at < end,
        Order.status.in_(['closed', 'paid'])
    )
    if branch_id:
        q = q.filter(Order.branch_id == branch_id)

    orders = q.all()
    total_revenue = sum(float(o.total or 0) for o in orders)
    total_orders = len(orders)
    avg_order = total_revenue / total_orders if total_orders > 0 else 0

    # Payment methods
    payments = db.query(Payment).filter(
        Payment.created_at >= start,
        Payment.created_at < end
    ).all()

    payment_methods = {}
    for p in payments:
        method = getattr(p, 'payment_method', 'gotovina') or 'gotovina'
        payment_methods[method] = payment_methods.get(method, 0) + float(p.amount or 0)

    # Top items
    item_counts = {}
    for order in orders:
        for oi in (order.items or []):
            name = getattr(oi, 'name', 'Neznano') or 'Neznano'
            qty = getattr(oi, 'quantity', 1) or 1
            item_counts[name] = item_counts.get(name, 0) + qty

    top_items = sorted(item_counts.items(), key=lambda x: x[1], reverse=True)[:10]

    # Staff performance
    staff_stats = {}
    for order in orders:
        cashier = getattr(order, 'cashier_id', None)
        if cashier:
            if cashier not in staff_stats:
                staff_stats[cashier] = {'orders': 0, 'revenue': 0}
            staff_stats[cashier]['orders'] += 1
            staff_stats[cashier]['revenue'] += float(order.total or 0)

    # Build report data
    report = {
        'type': 'daily',
        'date': date.strftime('%d.%m.%Y'),
        'generated_at': datetime.now().strftime('%d.%m.%Y %H:%M'),
        'branch_id': branch_id,
        'summary': {
            'total_revenue': round(total_revenue, 2),
            'total_orders': total_orders,
            'avg_order': round(avg_order, 2),
        },
        'payment_methods': {k: round(v, 2) for k, v in payment_methods.items()},
        'top_items': [{'name': name, 'quantity': qty} for name, qty in top_items],
        'staff_performance': staff_stats,
        'hourly_breakdown': _get_hourly_breakdown(orders),
    }

    return report


def generate_weekly_report(db: Session, start_date: datetime, branch_id: int = None) -> dict:
    """Generiraj tedensko poročilo."""
    from app.models.order import Order

    end_date = start_date + timedelta(days=7)

    q = db.query(Order).filter(
        Order.created_at >= start_date,
        Order.created_at < end_date,
        Order.status.in_(['closed', 'paid'])
    )
    if branch_id:
        q = q.filter(Order.branch_id == branch_id)

    orders = q.all()

    daily_data = {}
    for order in orders:
        day = order.created_at.strftime('%Y-%m-%d')
        if day not in daily_data:
            daily_data[day] = {'orders': 0, 'revenue': 0}
        daily_data[day]['orders'] += 1
        daily_data[day]['revenue'] += float(order.total or 0)

    # Compare with previous week
    prev_start = start_date - timedelta(days=7)
    prev_orders = db.query(Order).filter(
        Order.created_at >= prev_start,
        Order.created_at < start_date,
        Order.status.in_(['closed', 'paid'])
    ).all()
    prev_revenue = sum(float(o.total or 0) for o in prev_orders)

    current_revenue = sum(d['revenue'] for d in daily_data.values())
    growth = ((current_revenue - prev_revenue) / prev_revenue * 100) if prev_revenue > 0 else 0

    return {
        'type': 'weekly',
        'period': f"{start_date.strftime('%d.%m')} - {(end_date - timedelta(days=1)).strftime('%d.%m.%Y')}",
        'generated_at': datetime.now().strftime('%d.%m.%Y %H:%M'),
        'summary': {
            'total_revenue': round(current_revenue, 2),
            'total_orders': len(orders),
            'avg_order': round(current_revenue / len(orders), 2) if orders else 0,
            'prev_week_revenue': round(prev_revenue, 2),
            'growth_pct': round(growth, 1),
        },
        'daily_breakdown': daily_data,
        'best_day': max(daily_data.items(), key=lambda x: x[1]['revenue']) if daily_data else None,
        'worst_day': min(daily_data.items(), key=lambda x: x[1]['revenue']) if daily_data else None,
    }


def generate_monthly_report(db: Session, year: int, month: int, branch_id: int = None) -> dict:
    """Generiraj mesečno poročilo."""
    from app.models.order import Order

    start = datetime(year, month, 1)
    if month == 12:
        end = datetime(year + 1, 1, 1)
    else:
        end = datetime(year, month + 1, 1)

    q = db.query(Order).filter(
        Order.created_at >= start,
        Order.created_at < end,
        Order.status.in_(['closed', 'paid'])
    )
    if branch_id:
        q = q.filter(Order.branch_id == branch_id)

    orders = q.all()
    total_revenue = sum(float(o.total or 0) for o in orders)

    # Daily breakdown
    daily = {}
    for o in orders:
        day = o.created_at.day
        daily[day] = daily.get(day, 0) + float(o.total or 0)

    # Best/worst days
    best_day_num = max(daily, key=daily.get) if daily else 0
    worst_day_num = min(daily, key=daily.get) if daily else 0

    return {
        'type': 'monthly',
        'period': f"{month}/{year}",
        'generated_at': datetime.now().strftime('%d.%m.%Y %H:%M'),
        'summary': {
            'total_revenue': round(total_revenue, 2),
            'total_orders': len(orders),
            'avg_order': round(total_revenue / len(orders), 2) if orders else 0,
            'days_in_month': (end - start).days,
        },
        'daily_breakdown': {str(k): round(v, 2) for k, v in daily.items()},
        'best_day': {'day': best_day_num, 'revenue': round(daily.get(best_day_num, 0), 2)} if best_day_num else None,
        'worst_day': {'day': worst_day_num, 'revenue': round(daily.get(worst_day_num, 0), 2)} if worst_day_num else None,
        'avg_daily_revenue': round(total_revenue / (end - start).days, 2) if (end - start).days > 0 else 0,
    }


def _get_hourly_breakdown(orders: list) -> dict:
    """Razdeli naročila po urah."""
    hourly = {}
    for o in orders:
        h = o.created_at.hour
        hourly[h] = hourly.get(h, {'orders': 0, 'revenue': 0})
        hourly[h]['orders'] += 1
        hourly[h]['revenue'] += float(o.total or 0)
    return {str(k): v for k, v in sorted(hourly.items())}
