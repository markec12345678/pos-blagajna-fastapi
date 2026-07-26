from fastapi import APIRouter
router = APIRouter(prefix="/orders-v3", tags=["Orders V3"])

@router.get("/patterns")
def order_patterns():
    return {
        "peak_hours": [{"hour": "12:00", "orders": 28}, {"hour": "19:00", "orders": 35}, {"hour": "20:00", "orders": 32}],
        "peak_days": [{"day": "Sobota", "orders": 85}, {"day": "Petek", "orders": 78}, {"day": "Nedelja", "orders": 72}],
        "avg_order_value": 42.50,
        "avg_items_per_order": 2.8,
        "popular_combos": [
            {"items": "Risotto + Tiramisu", "count": 45, "pct": 12.5},
            {"items": "Caesar + Losos", "count": 32, "pct": 8.9},
            {"items": "Pizza + Solata", "count": 28, "pct": 7.8},
        ],
        "seasonal_trends": [
            {"month": "Poletje", "top_item": "Lubenica", "trend": "up"},
            {"month": "Jesen", "top_item": "Bučna juha", "trend": "pending"},
        ]
    }

@router.get("/customization")
def order_customization():
    return {
        "total_customizations": 1240,
        "popular_customizations": [
            {"item": "Steak", "customizations": ["Rare: 25%", "Medium: 45%", "Well done: 30%"]},
            {"item": "Testenine", "customizations": ["Al dente: 60%", "Mehko: 40%"]},
            {"item": "Kava", "customizations": ["Brez mleka: 35%", "Sojino mleko: 15%", "Ovseno: 10%"]},
        ],
        "special_requests_rate": 18.5,
        "avg_prep_time_impact": "+2.4 min"
    }

@router.get("/customer-preferences")
def customer_order_preferences():
    return {
        "returning_customer_orders": 62,
        "avg_orders_per_customer": 4.2,
        "top_preferences": [
            {"customer": "Janez N.", "last_order": "Risotto ai Funghi", "frequency": 8, "avg_spend": 45},
            {"customer": "Ana H.", "last_order": "Grilled Salmon", "frequency": 6, "avg_spend": 52},
            {"customer": "Marko K.", "last_order": "Caesar Salad", "frequency": 5, "avg_spend": 38},
        ],
        "dietary_orders": {"vegetarian": 12, "gluten_free": 8, "vegan": 5}
    }

@router.get("/analytics")
def order_analytics():
    return {
        "total_orders_today": 67,
        "total_revenue_today": 2847.50,
        "avg_preparation_time": 14.2,
        "refund_rate": 1.2,
        "peak_wait_time": 18,
        "by_type": [
            {"type": "Na mestu", "count": 42, "pct": 62.7, "avg_value": 45.20},
            {"type": "Dostava", "count": 15, "pct": 22.4, "avg_value": 38.50},
            {"type": "Za s seboj", "count": 10, "pct": 14.9, "avg_value": 28.40},
        ]
    }
