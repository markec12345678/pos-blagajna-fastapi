from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.v1.auth import get_current_user

router = APIRouter(prefix="/menu-v7", tags=["menu-v7"])

@router.get("/dynamic-pricing")
def get_dynamic_pricing(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"pricing": {
        "rules": [
            {"name": "Happy Hour", "condition": "14:00-16:00", "discount_pct": 15, "items": ["Pijače", "Sladice"], "active": True, "revenue_impact": 450},
            {"name": "Early Bird", "condition": "17:00-18:00", "discount_pct": 10, "items": ["Vse"], "active": True, "revenue_impact": 320},
            {"name": "Deževni dan", "condition": "Dež vreme", "discount_pct": 20, "items": ["Topli obroki"], "active": True, "revenue_impact": 280},
            {"name": "Sezonsko", "condition": "Poletje", "discount_pct": 0, "items": ["Koktajli"], "active": True, "revenue_impact": 650, "surcharge_pct": 5},
        ],
        "avg_discount": 11.2,
        "total_impact": 1700
    }}

@router.get("/menu-performance-deep")
def get_menu_performance_deep(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"performance": [
        {"item": "Pizza Margherita", "category": "Pizza", "popularity_score": 95, "profitability_score": 65, "quadrant": "Star", "recommendation": "Obdržati kot glavni artikel"},
        {"item": "Grilled Salmon", "category": "Meso/Ribe", "popularity_score": 70, "profitability_score": 85, "quadrant": "Star", "recommendation": "Promovirati, visoka marža"},
        {"item": "Caesar Salad", "category": "Solate", "popularity_score": 80, "profitability_score": 75, "quadrant": "Star", "recommendation": "Obdržati, uravnoteženo"},
        {"item": "Testenine Carbonara", "category": "Testenine", "popularity_score": 55, "profitability_score": 45, "quadrant": "Dog", "recommendation": "Razmisliti o odstranitvi ali prenovi"},
        {"item": "Rižota", "category": "Testenine", "popularity_score": 35, "profitability_score": 60, "quadrant": "Puzzle", "recommendation": "Promovirati ali znižati ceno"},
        {"item": "Solata s tune", "category": "Solate", "popularity_score": 25, "profitability_score": 30, "quadrant": "Dog", "recommendation": "Odstraniti iz menija"},
    ], "avg_popularity": 60, "avg_profitability": 60}

@router.get("/allergen-management")
def get_allergen_management(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"allergens": {
        "items_with_allergens": 45,
        "allergen_distribution": [
            {"allergen": "Gluten", "items": 28, "percentage": 62.2},
            {"allergen": "Mlečni izdelki", "items": 22, "percentage": 48.9},
            {"allergen": "Oreščki", "items": 8, "percentage": 17.8},
            {"allergen": "Ribe", "items": 5, "percentage": 11.1},
            {"allergen": "Jajca", "items": 15, "percentage": 33.3},
            {"allergen": "Soja", "items": 3, "percentage": 6.7},
        ],
        "substitution_options": [
            {"original": "Gluten", "substitute": "Brezglutensko testo", "cost_increase": 1.50},
            {"original": "Mlečni izdelki", "substitute": "Rastlinsko mleko", "cost_increase": 0.80},
            {"original": "Jajca", "substitute": "Veganska omaka", "cost_increase": 0.50},
        ]
    }}

@router.get("/recipe-optimization")
def get_recipe_optimization(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"optimizations": [
        {"item": "Pizza Margherita", "current_cost": 3.25, "optimized_cost": 2.90, "savings": 0.35, "changes": ["Manjša količina mocarele", "Domači paradižnik"], "quality_impact": "minimal", "annual_savings": 1015},
        {"item": "Caesar Salad", "current_cost": 2.25, "optimized_cost": 2.10, "savings": 0.15, "changes": ["Manjša količina parmezana"], "quality_impact": "brez", "annual_savings": 293},
        {"item": "Grilled Salmon", "current_cost": 4.90, "optimized_cost": 4.60, "savings": 0.30, "changes": ["Lokalni losos namesto uvoženega"], "quality_impact": "pozitiven", "annual_savings": 426},
    ], "total_annual_savings": 1734}

@router.get("/digital-menu")
def get_digital_menu(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"digital_menu": {
        "qr_scans_today": 85,
        "online_views": 320,
        "top_viewed_items": [
            {"item": "Pizza Margherita", "views": 180, "orders": 45},
            {"item": "Grilled Salmon", "views": 120, "orders": 28},
            {"item": "Caesar Salad", "views": 95, "orders": 22},
        ],
        "avg_time_on_menu": 2.8,
        "conversion_rate": 28.5,
        "mobile_share": 78,
        "feedback_submitted": 12
    }}

@router.get("/ingredient-substitution")
def get_ingredient_substitution(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"substitutions": [
        {"original": "Mocarela (bivoli)", "alternative": "Mocarela (kravji)", "cost_diff": -0.80, "quality_diff": "manjše", "items_affected": ["Pizza Margherita", "Caprese"]},
        {"original": "Paradižnik sveži", "alternative": "Paradižnik konzervirani", "cost_diff": -0.30, "quality_diff": "minimalna", "items_affected": ["Pizza", "Salsa"]},
        {"original": "Losos norveški", "alternative": "Losos slovenski", "cost_diff": -1.20, "quality_diff": "pozitivna", "items_affected": ["Grilled Salmon"]},
        {"original": "Bazilika sveža", "alternative": "Bazilika sušena", "cost_diff": -0.15, "quality_diff": "negativna", "items_affected": ["Pizza", "Pasta"]},
    ], "total_potential_savings": 2.45}
