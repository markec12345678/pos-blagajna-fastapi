from fastapi import APIRouter
router = APIRouter(prefix="/delivery-v3", tags=["Delivery V3"])

@router.get("/tracking")
def delivery_tracking():
    return {
        "active_deliveries": 4,
        "completed_today": 12,
        "avg_delivery_time_min": 28,
        "deliveries": [
            {"id": 1001, "customer": "Novak", "address": "Glavna 15, Ljubljana", "items": 3, "status": "in_transit", "driver": "Peter", "eta_min": 12, "distance_km": 4.2},
            {"id": 1002, "customer": "Horvat", "address": "Dunajska 42, Ljubljana", "items": 1, "status": "preparing", "driver": "", "eta_min": 25, "distance_km": 6.8},
            {"id": 1003, "customer": "Kovač", "address": "Šmartinska 8, Ljubljana", "items": 5, "status": "in_transit", "driver": "Peter", "eta_min": 8, "distance_km": 2.1},
            {"id": 1004, "customer": "Zupan", "address": "Trubarjeva 22, Ljubljana", "items": 2, "status": "delivered", "driver": "Ana", "eta_min": 0, "distance_km": 3.5},
        ]
    }

@router.get("/drivers")
def driver_management():
    return {
        "active_drivers": 3,
        "available_drivers": 1,
        "drivers": [
            {"name": "Peter K.", "status": "delivering", "deliveries_today": 5, "avg_time_min": 26, "rating": 4.8, "vehicle": "Motor"},
            {"name": "Ana M.", "status": "delivering", "deliveries_today": 4, "avg_time_min": 30, "rating": 4.6, "vehicle": "Kolo"},
            {"name": "Luka B.", "status": "available", "deliveries_today": 3, "avg_time_min": 28, "rating": 4.7, "vehicle": "Motor"},
        ]
    }

@router.get("/routes")
def route_optimization():
    return {
        "optimized_routes": 3,
        "fuel_saved_liters": 2.4,
        "time_saved_min": 18,
        "routes": [
            {"id": 1, "driver": "Peter", "stops": 4, "distance_km": 12.5, "time_min": 35, "efficiency": 92},
            {"id": 2, "driver": "Ana", "stops": 3, "distance_km": 8.2, "time_min": 28, "efficiency": 88},
            {"id": 3, "driver": "Luka", "stops": 2, "distance_km": 5.8, "time_min": 18, "efficiency": 95},
        ]
    }

@router.get("/analytics")
def delivery_analytics():
    return {
        "total_deliveries_month": 245,
        "avg_delivery_time_min": 28,
        "on_time_rate": 91.2,
        "customer_satisfaction": 4.6,
        "revenue_delivery": 8920.00,
        "by_hour": [
            {"hour": "11:00-12:00", "orders": 8, "avg_min": 22},
            {"hour": "12:00-13:00", "orders": 15, "avg_min": 32},
            {"hour": "18:00-19:00", "orders": 12, "avg_min": 26},
            {"hour": "19:00-20:00", "orders": 18, "avg_min": 30},
            {"hour": "20:00-21:00", "orders": 10, "avg_min": 24},
        ]
    }
