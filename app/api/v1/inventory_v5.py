from fastapi import APIRouter
router = APIRouter(prefix="/inventory-v5", tags=["Inventory V5"])

@router.get("/demand-forecast")
def demand_forecast():
    return {
        "forecast_accuracy": 84,
        "items_forecasted": 45,
        "top_forecasts": [
            {"item": "Losos", "current_stock": 8, "forecast_demand_7d": 15, "reorder_point": 10, "status": "reorder"},
            {"item": "Moka", "current_stock": 25, "forecast_demand_7d": 18, "reorder_point": 20, "status": "ok"},
            {"item": "Paradižnik", "current_stock": 12, "forecast_demand_7d": 20, "reorder_point": 15, "status": "reorder"},
            {"item": "Olive", "current_stock": 18, "forecast_demand_7d": 8, "reorder_point": 10, "status": "ok"},
        ],
        "seasonal_items": ["Lubenica", "Buča", "Kostanj"]
    }

@router.get("/supplier-scores")
def supplier_scorecards():
    return {
        "suppliers": [
            {"name": "Kmetija Rojc", "score": 92, "quality": 4.8, "delivery": 95, "price": 88, "communication": 90},
            {"name": "Mlin Kovač", "score": 87, "quality": 4.6, "delivery": 85, "price": 90, "communication": 82},
            {"name": "Jadranske ribe", "score": 84, "quality": 4.7, "delivery": 80, "price": 82, "communication": 88},
            {"name": "Olinar", "score": 89, "quality": 4.5, "delivery": 92, "price": 86, "communication": 85},
        ],
        "avg_score": 88,
        "improvement_needed": 1
    }

@router.get("/dead-stock")
def dead_stock():
    return {
        "dead_stock_value": 1250.00,
        "items_count": 8,
        "items": [
            {"name": "Posušeni paradižnik", "stock": 5, "unit": "kg", "days_since_use": 45, "value": 180, "action": "Uporabi v posebni ponudbi"},
            {"name": "Rdeče vino (odprto)", "stock": 3, "unit": "steklenice", "days_since_use": 30, "value": 75, "action": "Znižaj ceno"},
            {"name": "Specialna omaka", "stock": 8, "unit": "L", "days_since_use": 60, "value": 320, "action": "Daruj zaposlenim"},
        ],
        "monthly_trend": [
            {"month": "Jan", "value": 800}, {"month": "Feb", "value": 650}, {"month": "Mar", "value": 920},
            {"month": "Apr", "value": 780}, {"month": "Maj", "value": 1100}, {"month": "Jun", "value": 1250},
        ]
    }

@router.get("/par-levels")
def par_level_optimization():
    return {
        "optimized_items": 35,
        "total_savings": 2400.00,
        "items": [
            {"item": "Moka", "current_par": 30, "optimized_par": 25, "saving": 150, "frequency": "Tedensko"},
            {"item": "Jajca", "current_par": 50, "optimized_par": 40, "saving": 200, "frequency": "Tedensko"},
            {"item": "Maslo", "current_par": 15, "optimized_par": 12, "saving": 180, "frequency": "Tedensko"},
            {"item": "Sol", "current_par": 10, "optimized_par": 8, "saving": 40, "frequency": "Mesečno"},
        ]
    }
