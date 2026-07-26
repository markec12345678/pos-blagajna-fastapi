from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.v1.auth import get_current_user

router = APIRouter(prefix="/inventory-v6", tags=["inventory-v6"])

@router.get("/demand-forecasting")
def get_demand_forecasting(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"forecast": [
        {"item": "Mocarela", "current_stock": 15, "daily_usage": 3.2, "lead_time_days": 2, "safety_stock": 10, "reorder_point": 16.4, "recommended_order": 25, "confidence": 0.92, "status": "reorder"},
        {"item": "Sveže testo", "current_stock": 8, "daily_usage": 5.0, "lead_time_days": 1, "safety_stock": 5, "reorder_point": 10, "recommended_order": 20, "confidence": 0.95, "status": "critical"},
        {"item": "Losos", "current_stock": 12, "daily_usage": 1.8, "lead_time_days": 3, "safety_stock": 8, "reorder_point": 13.4, "recommended_order": 15, "confidence": 0.88, "status": "reorder"},
        {"item": "Solata", "current_stock": 20, "daily_usage": 4.0, "lead_time_days": 1, "safety_stock": 8, "reorder_point": 12, "recommended_order": 0, "confidence": 0.90, "status": "ok"},
        {"item": "Olive", "current_stock": 5, "daily_usage": 1.5, "lead_time_days": 4, "safety_stock": 6, "reorder_point": 12, "recommended_order": 20, "confidence": 0.85, "status": "critical"},
    ], "total_reorder_items": 3, "estimated_cost": 850}

@router.get("/supplier-performance")
def get_supplier_performance(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"suppliers": [
        {"name": "Kmetija Kranjc", "orders": 24, "on_time": 23, "accuracy": 98, "quality_score": 4.8, "lead_time_avg": 1.2, "cost_trend": "stable", "issues": 0, "score": 96},
        {"name": "Meso Žabar", "orders": 18, "on_time": 16, "accuracy": 94, "quality_score": 4.5, "lead_time_avg": 2.1, "cost_trend": "up", "issues": 2, "score": 88},
        {"name": "Pečarna Hleb", "orders": 30, "on_time": 30, "accuracy": 100, "quality_score": 4.7, "lead_time_avg": 0.5, "cost_trend": "stable", "issues": 0, "score": 98},
        {"name": "Vino Bizeljsko", "orders": 12, "on_time": 12, "accuracy": 100, "quality_score": 4.9, "lead_time_avg": 3.0, "cost_trend": "stable", "issues": 0, "score": 99},
        {"name": "Mlekarne Kozjek", "orders": 15, "on_time": 13, "accuracy": 92, "quality_score": 4.3, "lead_time_avg": 2.5, "cost_trend": "down", "issues": 3, "score": 82},
    ], "avg_score": 92.6}

@router.get("/waste-analytics")
def get_waste_analytics(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"analytics": {
        "total_waste_kg": 28.5,
        "total_cost": 185.50,
        "waste_per_order": 0.15,
        "waste_trend": [
            {"week": "Teden 1", "kg": 32.0, "cost": 210},
            {"week": "Teden 2", "kg": 29.5, "cost": 195},
            {"week": "Teden 3", "kg": 28.0, "cost": 180},
            {"week": "Teden 4", "kg": 28.5, "cost": 185.50},
        ],
        "top_wasted": [
            {"item": "Solata", "kg": 5.2, "cost": 7.80, "reason": "Preveč pripravljeno", "preventable": True},
            {"item": "Kruh", "kg": 3.8, "cost": 3.80, "reason": "Sušenje", "preventable": True},
            {"item": "Zelenjava", "kg": 3.2, "cost": 4.80, "reason": "Poškodbe", "preventable": False},
        ],
        "prevention_savings": 45.00
    }}

@router.get("/recipe-costing")
def get_recipe_costing(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"recipes": [
        {"item": "Pizza Margherita", "ingredients": [{"name": "Testo", "qty": 0.25, "unit": "kg", "cost": 0.80}, {"name": "Mocarela", "qty": 0.15, "unit": "kg", "cost": 1.80}, {"name": "Paradižnik", "qty": 0.10, "unit": "kg", "cost": 0.50}, {"name": "Bazilika", "qty": 0.01, "unit": "kg", "cost": 0.15}], "total_cost": 3.25, "price": 8.50, "margin": 61.8, "food_cost_pct": 38.2},
        {"item": "Caesar Salad", "ingredients": [{"name": "Solata", "qty": 0.15, "unit": "kg", "cost": 0.60}, {"name": "Piščanec", "qty": 0.12, "unit": "kg", "cost": 1.20}, {"name": "Parmezan", "qty": 0.03, "unit": "kg", "cost": 0.45}], "total_cost": 2.25, "price": 7.50, "margin": 70.0, "food_cost_pct": 30.0},
        {"item": "Grilled Salmon", "ingredients": [{"name": "Losos", "qty": 0.20, "unit": "kg", "cost": 3.60}, {"name": "Zelenjava", "qty": 0.15, "unit": "kg", "cost": 0.90}, {"name": "Omaka", "qty": 0.05, "unit": "kg", "cost": 0.40}], "total_cost": 4.90, "price": 15.50, "margin": 68.4, "food_cost_pct": 31.6},
    ], "avg_margin": 66.7}

@router.get("/stock-alerts")
def get_stock_alerts(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"alerts": [
        {"item": "Sveže testo", "current": 8, "minimum": 10, "status": "critical", "expires": "2025-07-16", "supplier": "Pečarna Hleb"},
        {"item": "Olive", "current": 5, "minimum": 6, "status": "critical", "expires": "2025-07-20", "supplier": "Kmetija Kranjc"},
        {"item": "Losos", "current": 12, "minimum": 8, "status": "low", "expires": "2025-07-17", "supplier": "Meso Žabar"},
        {"item": "Mocarela", "current": 15, "minimum": 10, "status": "low", "expires": "2025-07-18", "supplier": "Mlekarne Kozjek"},
        {"item": "Jajca", "current": 24, "minimum": 20, "status": "ok", "expires": "2025-07-22", "supplier": "Kmetija Kranjc"},
    ], "critical_count": 2, "low_count": 2}

@router.get("/par-levels")
def get_par_levels(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"par_levels": [
        {"item": "Mocarela", "par": 30, "current": 15, "usage_rate": 3.2, "days_until_empty": 4.7, "reorder_suggested": True},
        {"item": "Sveže testo", "par": 25, "current": 8, "usage_rate": 5.0, "days_until_empty": 1.6, "reorder_suggested": True},
        {"item": "Solata", "par": 40, "current": 20, "usage_rate": 4.0, "days_until_empty": 5.0, "reorder_suggested": True},
        {"item": "Losos", "par": 20, "current": 12, "usage_rate": 1.8, "days_until_empty": 6.7, "reorder_suggested": False},
        {"item": "Piščanec", "par": 25, "current": 18, "usage_rate": 2.5, "days_until_empty": 7.2, "reorder_suggested": False},
        {"item": "Olive", "par": 15, "current": 5, "usage_rate": 1.5, "days_until_empty": 3.3, "reorder_suggested": True},
    ], "items_below_par": 4}
