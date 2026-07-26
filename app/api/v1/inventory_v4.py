from fastapi import APIRouter
router = APIRouter(prefix="/inventory-v4", tags=["Inventory V4"])

@router.get("/sensors")
def iot_sensors():
    return {
        "total_sensors": 12,
        "active": 11,
        "alerts": 1,
        "sensors": [
            {"id": "T1", "type": "temperature", "location": "Hladilnik 1", "value": 3.2, "unit": "°C", "status": "ok", "battery": 85},
            {"id": "T2", "type": "temperature", "location": "Hladilnik 2", "value": 2.8, "unit": "°C", "status": "ok", "battery": 72},
            {"id": "H1", "type": "humidity", "location": "Skladišče", "value": 45, "unit": "%", "status": "ok", "battery": 90},
            {"id": "W1", "type": "weight", "location": "Vaga oljčnega olja", "value": 12.4, "unit": "L", "status": "low", "battery": 60},
        ],
        "daily_readings": 1440,
        "anomalies_detected": 1
    }

@router.get("/auto-order")
def automated_ordering():
    return {
        "rules_active": 8,
        "orders_generated_today": 3,
        "pending_approval": 1,
        "auto_orders": [
            {"id": 1, "item": "Moka", "qty": 20, "unit": "kg", "supplier": "Mlin Kovač", "cost": 45.00, "status": "ordered", "auto": True},
            {"id": 2, "item": "Oljčno olje", "qty": 10, "unit": "L", "supplier": "Olinar", "cost": 89.00, "status": "ordered", "auto": True},
            {"id": 3, "item": "Kruh", "qty": 30, "unit": "hleb", "supplier": "Pekarna d.o.o.", "cost": 120.00, "status": "pending", "auto": False},
        ],
        "savings_this_month": 340.00
    }

@router.get("/supplier-portal")
def supplier_portal():
    return {
        "connected_suppliers": 8,
        "pending_invoices": 3,
        "portal_orders": 12,
        "suppliers": [
            {"name": "Kmetija Rojc", "connected": True, "last_sync": "2026-07-16 08:00", "catalog_items": 45, "pending_orders": 2},
            {"name": "Mlin Kovač", "connected": True, "last_sync": "2026-07-16 07:30", "catalog_items": 32, "pending_orders": 1},
            {"name": "Jadranske ribe", "connected": True, "last_sync": "2026-07-15 16:00", "catalog_items": 28, "pending_orders": 0},
            {"name": "Olinar", "connected": True, "last_sync": "2026-07-16 09:00", "catalog_items": 18, "pending_orders": 0},
        ]
    }

@router.get("/cost-optimization")
def cost_optimization():
    return {
        "total_spend_month": 12450.80,
        "potential_savings": 1850.00,
        "suggestions": [
            {"title": "Preidi na večjo embalažo za moko", "saving": 420, "item": "Moka", "confidence": 92},
            {"title": "Pogodba z ribičem direktno", "saving": 680, "item": "Losos", "confidence": 78},
            {"title": "Sezonsko zmanjšaj zalogo zelenjave", "saving": 350, "item": "Zelenjava", "confidence": 85},
            {"title": "Optimiziraj naročila po tednih", "saving": 400, "item": "Splošno", "confidence": 70},
        ],
        "price_trends": [
            {"item": "Moka", "trend": "stable", "change_pct": 0.2},
            {"item": "Losos", "trend": "up", "change_pct": 8.5},
            {"item": "Paradižnik", "trend": "down", "change_pct": -12.3},
        ]
    }
