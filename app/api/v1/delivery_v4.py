from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.v1.auth import get_current_user

router = APIRouter(prefix="/delivery-v4", tags=["delivery-v4"])

@router.get("/fleet")
def get_fleet(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"fleet": [
        {"id": 1, "driver": "Luka K.", "vehicle": "Motor", "status": "on_delivery", "orders": 3, "avg_time": 25, "rating": 4.8, "location": {"lat": 45.95, "lng": 15.61}},
        {"id": 2, "driver": "Ana M.", "vehicle": "Avto", "status": "available", "orders": 0, "avg_time": 30, "rating": 4.6, "location": {"lat": 45.96, "lng": 15.62}},
        {"id": 3, "driver": "Marko P.", "vehicle": "Motor", "status": "on_delivery", "orders": 2, "avg_time": 22, "rating": 4.9, "location": {"lat": 45.94, "lng": 15.60}},
        {"id": 4, "driver": "Sara Z.", "vehicle": "Kolo", "status": "offline", "orders": 0, "avg_time": 35, "rating": 4.3, "location": None},
    ], "active_count": 2, "total_drivers": 4}

@router.get("/live-tracking")
def get_live_tracking(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"deliveries": [
        {"order_id": 1001, "driver": "Luka K.", "customer": "Janez Novak", "status": "in_transit", "eta": 12, "distance_km": 3.2, "progress": 65, "lat": 45.952, "lng": 15.612},
        {"order_id": 1002, "driver": "Marko P.", "customer": "Meta Kranjc", "status": "picked_up", "eta": 20, "distance_km": 5.1, "progress": 25, "lat": 45.948, "lng": 15.598},
        {"order_id": 1003, "driver": "Luka K.", "customer": "Peter Semec", "status": "in_transit", "eta": 8, "distance_km": 1.8, "progress": 80, "lat": 45.955, "lng": 15.608},
    ]}

@router.get("/zone-analytics")
def get_zone_analytics(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"zones": [
        {"name": "Center", "orders": 45, "avg_time": 22, "avg_distance": 2.1, "revenue": 1125, "satisfaction": 4.7},
        {"name": "Gradac", "orders": 32, "avg_time": 18, "avg_distance": 1.5, "revenue": 800, "satisfaction": 4.8},
        {"name": "Metlika", "orders": 28, "avg_time": 35, "avg_distance": 8.2, "revenue": 840, "satisfaction": 4.5},
        {"name": "Novo Mesto", "orders": 15, "avg_time": 45, "avg_distance": 12.5, "revenue": 525, "satisfaction": 4.3},
        {"name": "Črnomelj", "orders": 10, "avg_time": 55, "avg_distance": 18.0, "revenue": 350, "satisfaction": 4.1},
    ]}

@router.get("/platform-integration")
def get_platform_integration(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"platforms": [
        {"name": "Wolt", "orders_today": 28, "revenue": 840, "commission": 126, "avg_time": 28, "status": "active"},
        {"name": "Glovo", "orders_today": 22, "revenue": 660, "commission": 99, "avg_time": 30, "status": "active"},
        {"name": "FoodHub", "orders_today": 15, "revenue": 450, "commission": 67, "avg_time": 32, "status": "active"},
        {"name": "Lastna dostava", "orders_today": 35, "revenue": 1225, "commission": 0, "avg_time": 22, "status": "active"},
    ], "total_orders": 100, "total_revenue": 3175, "total_commission": 292}

@router.get("/driver-performance")
def get_driver_performance(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"drivers": [
        {"name": "Luka K.", "deliveries_today": 18, "avg_time": 24, "on_time_pct": 92, "rating": 4.8, "tip_avg": 2.50, "distance_km": 45},
        {"name": "Marko P.", "deliveries_today": 15, "avg_time": 22, "on_time_pct": 95, "rating": 4.9, "tip_avg": 3.00, "distance_km": 38},
        {"name": "Ana M.", "deliveries_today": 12, "avg_time": 30, "on_time_pct": 85, "rating": 4.6, "tip_avg": 2.00, "distance_km": 52},
        {"name": "Sara Z.", "deliveries_today": 8, "avg_time": 35, "on_time_pct": 80, "rating": 4.3, "tip_avg": 1.50, "distance_km": 30},
    ]}

@router.get("/delivery-issues")
def get_delivery_issues(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"issues": [
        {"id": 1, "order_id": 998, "type": "late_delivery", "delay_minutes": 15, "reason": "Prometna zastoj", "status": "resolved", "compensation": "5€ popust"},
        {"id": 2, "order_id": 1005, "type": "wrong_order", "reason": "Napačna postavka", "status": "pending", "compensation": "Ponovna dostava"},
        {"id": 3, "order_id": 1010, "type": "cold_food", "reason": "Dolga dostava", "status": "resolved", "compensation": "10€ popust"},
    ], "total_issues": 3, "resolution_rate": 66.7, "avg_resolution_time": 25}

@router.get("/route-optimization")
def get_route_optimization(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"optimization": {
        "current_routes": [
            {"driver": "Luka K.", "stops": 3, "total_distance": 8.5, "estimated_time": 35, "fuel_cost": 4.25},
            {"driver": "Marko P.", "stops": 2, "total_distance": 6.2, "estimated_time": 25, "fuel_cost": 3.10},
        ],
        "optimized_routes": [
            {"driver": "Luka K.", "stops": 3, "total_distance": 7.1, "estimated_time": 28, "fuel_cost": 3.55, "savings": "20%"},
            {"driver": "Marko P.", "stops": 2, "total_distance": 5.8, "estimated_time": 22, "fuel_cost": 2.90, "savings": "10%"},
        ],
        "total_savings": {"distance_km": 1.8, "time_min": 10, "fuel_eur": 0.90}
    }}

@router.get("/weather-impact")
def get_weather_impact(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"weather": {
        "current": {"condition": "Deževeno", "temp": 18, "wind_kmh": 15},
        "impact": {"delivery_time_increase": 15, "order_increase": 25, "driver_availability": 75},
        "forecast": [
            {"day": "Pon", "condition": "Dež", "impact": "Počasnejše dostave"},
            {"day": "Tor", "condition": "Sončno", "impact": "Normalne dostave"},
            {"day": "Sre", "condition": "Sončno", "impact": "Povečano povpraševanje"},
        ]
    }}
