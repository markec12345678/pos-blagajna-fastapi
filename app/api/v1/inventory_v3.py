from fastapi import APIRouter
router = APIRouter(prefix="/inventory-v3", tags=["Inventory V3"])

@router.get("/auto-replenishment")
def auto_replenishment():
    return {
        "rules": [
            {"item": "Paradižnik", "min": 10, "max": 50, "current": 12, "supplier": "Kmetija Rojc", "lead_time_days": 2, "auto_order": True},
            {"item": "Moka", "min": 20, "max": 100, "current": 25, "supplier": "Mlin Kovač", "lead_time_days": 3, "auto_order": True},
            {"item": "Losos", "min": 5, "max": 20, "current": 3, "supplier": "Jadranske ribe", "lead_time_days": 1, "auto_order": False},
            {"item": "Olive", "min": 8, "max": 30, "current": 18, "supplier": "Olinar", "lead_time_days": 4, "auto_order": True},
        ],
        "pending_orders": 2,
        "auto_orders_this_week": 5
    }

@router.get("/waste")
def waste_tracking():
    return {
        "today": {"items": 8, "cost": 45.20, "pct_of_purchases": 3.2},
        "this_week": {"items": 52, "cost": 285.40, "pct_of_purchases": 3.8},
        "top_waste": [
            {"item": "Solata", "qty": 3.2, "unit": "kg", "cost": 12.80, "reason": "Prenarejena"},
            {"item": "Kruh", "qty": 2.8, "unit": "kg", "cost": 8.40, "reason": "Suho"},
            {"item": "Mleko", "qty": 4.0, "unit": "L", "cost": 5.60, "reason": "Poteklo"},
        ],
        "by_reason": [
            {"reason": "Poteklo rok", "pct": 35},
            {"reason": "Prenarejena", "pct": 28},
            {"reason": "Poškodba", "pct": 15},
            {"reason": "Odveč", "pct": 22},
        ]
    }

@router.get("/suppliers")
def supplier_integration():
    return {
        "active_suppliers": 12,
        "pending_deliveries": 3,
        "avg_delivery_days": 2.4,
        "on_time_rate": 89.5,
        "upcoming": [
            {"supplier": "Kmetija Rojc", "items": 5, "eta": "2026-07-17", "status": "confirmed"},
            {"supplier": "Mlin Kovač", "items": 3, "eta": "2026-07-18", "status": "pending"},
            {"supplier": "Jadranske ribe", "items": 2, "eta": "2026-07-17", "status": "in_transit"},
        ],
        "top_suppliers": [
            {"name": "Kmetija Rojc", "orders": 45, "on_time": 92, "quality": 4.8},
            {"name": "Mlin Kovač", "orders": 38, "on_time": 88, "quality": 4.6},
            {"name": "Jadranske ribe", "orders": 32, "on_time": 85, "quality": 4.7},
        ]
    }

@router.get("/cost-analysis")
def cost_analysis():
    return {
        "total_purchases_month": 12450.80,
        "cost_per_cover": 8.42,
        "food_cost_pct": 32.4,
        "trend": "stable",
        "by_category": [
            {"category": "Meso", "amount": 4250.00, "pct": 34.1, "trend": "up"},
            {"category": "Zelenjava", "amount": 2180.30, "pct": 17.5, "trend": "down"},
            {"category": "Mlečni izdelki", "amount": 1890.20, "pct": 15.2, "trend": "stable"},
            {"category": "Ribe", "amount": 2340.10, "pct": 18.8, "trend": "up"},
            {"category": "Ostalo", "amount": 1790.20, "pct": 14.4, "trend": "stable"},
        ]
    }
