"""
Predictive Analytics Engine — AI-powered demand forecasting, waste prediction,
staff scheduling recommendations, and revenue prediction.
"""
import math
import json
import logging
from datetime import datetime, timedelta, date
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import func

logger = logging.getLogger(__name__)


def forecast_demand(db: Session, branch_id: int = 0, days_ahead: int = 7) -> dict:
    """Forecast daily demand using weighted moving average + day-of-week patterns + trend."""
    today = date.today()
    history_days = 90

    q = db.query(
        func.date(Order.created_at).label("day"),
        func.sum(Order.total).label("revenue"),
        func.count(Order.id).label("orders")
    ).filter(
        Order.created_at >= datetime.now() - timedelta(days=history_days),
        Order.status.in_(["closed", "paid"])
    ).group_by(func.date(Order.created_at)).order_by(func.date(Order.created_at))

    if branch_id:
        q = q.filter(Order.branch_id == branch_id)

    rows = q.all()
    if not rows:
        return {"forecast": [], "confidence": 0, "method": "insufficient_data"}

    daily_data = {}
    for r in rows:
        daily_data[str(r.day)] = {"revenue": r.revenue or 0, "orders": r.orders or 0}

    revenues = [daily_data[str(d)]["revenue"] for d in sorted(daily_data.keys())]
    orders_list = [daily_data[str(d)]["orders"] for d in sorted(daily_data.keys())]

    dow_revenues = {i: [] for i in range(7)}
    for d_str, data in daily_data.items():
        d = date.fromisoformat(d_str)
        dow_revenues[d.weekday()].append(data["revenue"])

    dow_avg = {}
    for dow, vals in dow_revenues.items():
        dow_avg[dow] = sum(vals) / len(vals) if vals else 0

    overall_avg = sum(revenues) / len(revenues) if revenues else 0

    n = len(revenues)
    if n >= 14:
        weights = [max(0.1, 1 - i * 0.05) for i in range(min(n, 30))]
        weights = weights[:n]
        w_sum = sum(weights)
        weighted_avg = sum(revenues[-n:] * (weights[i] if i < len(weights) else 0.1) for i, r in enumerate(revenues[-n:])) / w_sum if w_sum else overall_avg
    else:
        weighted_avg = overall_avg

    if n >= 7:
        recent_7 = sum(revenues[-7:]) / 7
        prev_7 = sum(revenues[-14:-7]) / 7 if n >= 14 else overall_avg
        trend = (recent_7 - prev_7) / prev_7 if prev_7 > 0 else 0
    else:
        trend = 0

    forecast = []
    confidence_factors = []

    for i in range(1, days_ahead + 1):
        f_date = today + timedelta(days=i)
        dow = f_date.weekday()

        trend_component = weighted_avg * (1 + trend * i / 30)
        dow_component = dow_avg.get(dow, overall_avg)
        seasonal_factor = 1.0
        month = f_date.month
        if month in [6, 7, 8]:
            seasonal_factor = 1.15
        elif month in [11, 12, 1]:
            seasonal_factor = 1.08
        elif month in [2, 3]:
            seasonal_factor = 0.92

        predicted = (trend_component * 0.3 + dow_component * 0.7) * seasonal_factor

        days_from_now = i
        confidence = max(0.4, 1.0 - days_from_now * 0.04)

        forecast.append({
            "date": f_date.isoformat(),
            "revenue": round(predicted, 2),
            "orders": round(predicted / (overall_avg / max(1, sum(orders_list) / len(orders_list))) if overall_avg > 0 else 0),
            "dow": dow,
            "confidence": round(confidence, 2)
        })
        confidence_factors.append(confidence)

    avg_confidence = sum(confidence_factors) / len(confidence_factors) if confidence_factors else 0

    return {
        "forecast": forecast,
        "historical_avg": round(overall_avg, 2),
        "trend": round(trend * 100, 1),
        "dow_averages": {str(k): round(v, 2) for k, v in dow_avg.items()},
        "confidence": round(avg_confidence, 2),
        "total_forecast": round(sum(f["revenue"] for f in forecast), 2),
        "method": "weighted_moving_average+dow+seasonal"
    }


def predict_waste(db: Session, branch_id: int = 0, days_ahead: int = 7) -> list:
    """Predict which ingredients are at risk of waste based on usage patterns and shelf life."""
    today = date.today()

    ingredients = db.query(Ingredient).filter(Ingredient.is_active != False)
    if branch_id:
        ingredients = ingredients.filter(Ingredient.branch_id == branch_id)
    ingredients = ingredients.all()

    results = []
    for ing in ingredients:
        usage_7d = db.query(func.sum(StockTransaction.quantity)).filter(
            StockTransaction.ingredient_id == ing.id,
            StockTransaction.type == "usage",
            StockTransaction.created_at >= datetime.now() - timedelta(days=7)
        ).scalar() or 0

        daily_usage = usage_7d / 7 if usage_7d else 0

        days_remaining = ing.stock / daily_usage if daily_usage > 0 else 999

        cost_at_risk = 0
        if daily_usage > 0:
            predicted_waste = max(0, ing.stock - (daily_usage * days_ahead))
            cost_at_risk = predicted_waste * (ing.cost_per_unit or 0)

        if daily_usage > 0 and days_remaining < days_ahead + 3:
            results.append({
                "ingredient_id": ing.id,
                "name": ing.name,
                "current_stock": ing.stock,
                "unit": ing.unit,
                "daily_usage": round(daily_usage, 2),
                "days_remaining": round(days_remaining, 1),
                "predicted_waste": round(max(0, ing.stock - daily_usage * days_ahead), 2),
                "cost_at_risk": round(cost_at_risk, 2),
                "urgency": "critical" if days_remaining < 2 else "warning" if days_remaining < 5 else "normal",
                "suggestion": _waste_suggestion(ing, daily_usage, days_remaining, cost_at_risk)
            })

    results.sort(key=lambda x: x["days_remaining"])
    return results


def suggest_staffing(db: Session, branch_id: int = 0, target_date: Optional[date] = None) -> dict:
    """Suggest staffing levels based on predicted demand."""
    if not target_date:
        target_date = date.today() + timedelta(days=1)

    dow = target_date.weekday()
    forecast = forecast_demand(db, branch_id, days_ahead=14)

    dow_key = str(dow)
    dow_avg_revenue = forecast.get("dow_averages", {}).get(dow_key, 0)

    peak_hours = _get_peak_hours(db, branch_id, dow)

    revenue_per_waiter = 800
    revenue_per_chef = 1200

    recommended_waiters = max(2, math.ceil(dow_avg_revenue / revenue_per_waiter)) if dow_avg_revenue > 0 else 2
    recommended_chefs = max(1, math.ceil(dow_avg_revenue / revenue_per_chef)) if dow_avg_revenue > 0 else 1

    return {
        "date": target_date.isoformat(),
        "day_of_week": dow,
        "predicted_revenue": round(dow_avg_revenue, 2),
        "recommended_staff": {
            "waiters": min(recommended_waiters, 8),
            "chefs": min(recommended_chefs, 4),
            "total": min(recommended_waiters + recommended_chefs, 12)
        },
        "peak_hours": peak_hours,
        "confidence": forecast.get("confidence", 0.5),
        "notes": _staffing_notes(dow, dow_avg_revenue, peak_hours)
    }


def predict_revenue(db: Session, branch_id: int = 0, period: str = "month") -> dict:
    """Predict revenue for upcoming period with scenarios."""
    forecast = forecast_demand(db, branch_id, days_ahead=30)

    total_forecast = forecast.get("total_forecast", 0)
    confidence = forecast.get("confidence", 0.5)

    optimistic = total_forecast * 1.15
    pessimistic = total_forecast * 0.85
    best_case = total_forecast * 1.25
    worst_case = total_forecast * 0.75

    daily_avg = total_forecast / 30 if total_forecast else 0

    prev_month = db.query(func.sum(Order.total)).filter(
        Order.created_at >= datetime.now() - timedelta(days=60),
        Order.created_at < datetime.now() - timedelta(days=30),
        Order.status.in_(["closed", "paid"])
    ).scalar() or 0

    growth = ((total_forecast - prev_month) / prev_month * 100) if prev_month > 0 else 0

    return {
        "period": period,
        "forecast": round(total_forecast, 2),
        "daily_average": round(daily_avg, 2),
        "scenarios": {
            "optimistic": round(optimistic, 2),
            "base": round(total_forecast, 2),
            "pessimistic": round(pessimistic, 2),
            "best_case": round(best_case, 2),
            "worst_case": round(worst_case, 2)
        },
        "growth_vs_last_month": round(growth, 1),
        "confidence": confidence,
        "factors": _revenue_factors(db, branch_id)
    }


def auto_reorder_suggestions(db: Session, branch_id: int = 0) -> list:
    """Suggest purchase orders based on predicted demand and current stock."""
    waste = predict_waste(db, branch_id, days_ahead=14)
    suggestions = []

    for item in waste:
        if item["urgency"] in ("critical", "warning"):
            daily_usage = item["daily_usage"]
            optimal_stock = daily_usage * 14
            reorder_qty = max(0, optimal_stock - item["current_stock"])

            if reorder_qty > 0:
                suggestions.append({
                    "ingredient_id": item["ingredient_id"],
                    "name": item["name"],
                    "current_stock": item["current_stock"],
                    "reorder_quantity": round(reorder_qty, 1),
                    "estimated_cost": round(reorder_qty * (item.get("cost_per_unit", 0) or 0), 2),
                    "urgency": item["urgency"],
                    "reason": item["suggestion"]
                })

    suggestions.sort(key=lambda x: 0 if x["urgency"] == "critical" else 1)
    return suggestions


def _get_peak_hours(db: Session, branch_id: int, dow: int) -> list:
    from app.models.dynamic_menu import MenuItemDemand
    demands = db.query(
        MenuItemDemand.hour,
        func.sum(MenuItemDemand.order_count).label("total")
    ).filter(
        MenuItemDemand.day_of_week == dow
    ).group_by(MenuItemDemand.hour).order_by(func.sum(MenuItemDemand.order_count).desc()).limit(3).all()

    return [{"hour": d.hour, "orders": d.total} for d in demands]


def _waste_suggestion(ing, daily_usage, days_remaining, cost_at_risk) -> str:
    if days_remaining < 1:
        return f"⚠️ Kriticno: {ing.name} bo zmanjkalo danes! Nujno porabi ali prodaj."
    if days_remaining < 2:
        return f"🔥 {ing.name} bo zmanjkalo jutri. Pripravi posebno ponudbo."
    if cost_at_risk > 10:
        return f"📦 {cost_at_risk:.0f}€ tveganja — uporabi v dnevni ponudbi."
    return f"📊 Zaloga {ing.name}: {days_remaining:.0f} dni. Redno poraba."


def _staffing_notes(dow, revenue, peak_hours) -> str:
    day_names = ["ponedeljek", "torek", "sredo", "četrtek", "petek", "sobota", "nedelja"]
    notes = f"Pričakovani promet za {day_names[dow]}: {revenue:.0f}€. "
    if dow in [4, 5, 6]:
        notes += "Vikend — priporočamo dodatno osebje. "
    if peak_hours:
        peak = peak_hours[0]
        notes += f"Konica ob {peak['hour']}:00 ({peak['orders']} naročil)."
    return notes


def _revenue_factors(db: Session, branch_id: int) -> list:
    factors = []
    today = date.today()

    recent_orders = db.query(func.count(Order.id)).filter(
        Order.created_at >= datetime.now() - timedelta(days=7),
        Order.status.in_(["closed", "paid"])
    ).scalar() or 0

    prev_orders = db.query(func.count(Order.id)).filter(
        Order.created_at >= datetime.now() - timedelta(days=14),
        Order.created_at < datetime.now() - timedelta(days=7),
        Order.status.in_(["closed", "paid"])
    ).scalar() or 0

    if prev_orders > 0:
        change = ((recent_orders - prev_orders) / prev_orders) * 100
        if change > 10:
            factors.append(f"📈 +{change:.0f}% naročil v zadnjem tednu")
        elif change < -10:
            factors.append(f"📉 {change:.0f}% naročil v zadnjem tednu")

    if today.weekday() >= 4:
        factors.append("📅 Vikend — običajno višji promet")

    month = today.month
    if month in [6, 7, 8]:
        factors.append("☀️ Poletje — turistična sezona")
    elif month in [11, 12]:
        factors.append("🎄 Prazniki — višji promet")

    return factors


from app.models.order import Order
from app.models.inventory import Ingredient, StockTransaction
