from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.v1.auth import get_current_user

router = APIRouter(prefix="/menu-v6", tags=["menu-v6"])

@router.get("/performance")
def get_menu_performance(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"performance": [
        {"item": "Margherita", "orders": 500, "revenue": 4250, "margin": 70.0, "popularity": 92, "trend": "up"},
        {"item": "Pepperoni", "orders": 480, "revenue": 5040, "margin": 65.0, "popularity": 88, "trend": "stable"},
        {"item": "Capricciosa", "orders": 420, "revenue": 4620, "margin": 62.0, "popularity": 85, "trend": "up"},
        {"item": "Caesar Salad", "orders": 350, "revenue": 2625, "margin": 70.0, "popularity": 78, "trend": "stable"},
        {"item": "Grilled Salmon", "orders": 280, "revenue": 4340, "margin": 60.0, "popularity": 72, "trend": "up"},
        {"item": "Steak", "orders": 220, "revenue": 3960, "margin": 60.0, "popularity": 65, "trend": "down"},
        {"item": "Tiramisu", "orders": 300, "revenue": 1650, "margin": 70.0, "popularity": 75, "trend": "stable"},
        {"item": "Bruschetta", "orders": 260, "revenue": 1170, "margin": 68.0, "popularity": 70, "trend": "up"},
    ], "avg_orders_per_item": 350}

@router.get("/suggestions")
def get_suggestions(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"suggestions": [
        {"id": 1, "type": "price_increase", "item": "Steak", "current_price": 18.00, "suggested_price": 19.50, "reason": "Nizka marža, povpraševanje stabilno", "impact": "+€330/mesec"},
        {"id": 2, "type": "remove", "item": "Calamari", "reason": "Nizka prodaja, visoka strošek sestavin", "impact": "Prihranek €450/mesec"},
        {"id": 3, "type": "bundle", "items": ["Caesar Salad", "Grilled Salmon"], "discount": 10, "reason": "Pogosto naročana skupaj", "impact": "+€800/mesec"},
        {"id": 4, "type": "rename", "item": "Pepperoni Pizza", "new_name": "Pizza Pepperoni Special", "reason": "Izboljšaj prepoznavnost", "impact": "+5% prodaje"},
    ]}

@router.get("/allergen-map")
def get_allergen_map(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"allergens": {
        "gluten": {"items": ["Margherita", "Pepperoni", "Capricciosa", "Bruschetta", "Calamari"], "count": 5},
        "dairy": {"items": ["Margherita", "Pepperoni", "Capricciosa", "Caesar Salad", "Tiramisu", "Panna Cotta"], "count": 6},
        "fish": {"items": ["Grilled Salmon"], "count": 1},
        "shellfish": {"items": ["Calamari"], "count": 1},
        "eggs": {"items": ["Caesar Salad", "Tiramisu"], "count": 2},
        "nuts": {"items": [], "count": 0},
    }}

@router.get("/seasonal-analysis")
def get_seasonal_analysis(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"seasonal": {
        "current_season": "Poletje",
        "trending_up": ["Caesar Salad", "Greek Salad", "Panna Cotta"],
        "trending_down": ["Steak", "Tiramisu"],
        "recommendations": [
            "Povečaj zaloge solat in svežih jedi",
            "Dodaj poletne koktajle na menu",
            "Zmanjšaj porcije toplih jedi",
            "Uvedi hladne predjedi",
        ],
        "weather_impact": {
            "vroče": {"up": ["Solata", "Sveži sokovi"], "down": ["Juhe", "Gorče jedi"]},
            "hladno": {"up": ["Juhe", "Tople jedi"], "down": ["Solata", "Sladoled"]},
        }
    }}

@router.get("/combo-analysis")
def get_combo_analysis(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"combos": [
        {"name": "Pizza + Pijača", "items": ["Margherita", "Coca Cola"], "price": 11.00, "savings": 0.00, "orders": 320, "popularity": 85},
        {"name": "Solata + Glavna jed", "items": ["Caesar Salad", "Grilled Salmon"], "price": 21.00, "savings": 2.00, "orders": 180, "popularity": 72},
        {"name": "Predjed + Glavna", "items": ["Bruschetta", "Steak"], "price": 21.00, "savings": 1.50, "orders": 150, "popularity": 65},
        {"name": "Sladica + Kava", "items": ["Tiramisu", "Kava"], "price": 8.00, "savings": 1.00, "orders": 220, "popularity": 78},
    ]}

@router.get("/menu-cost-breakdown")
def get_menu_cost_breakdown(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"costs": [
        {"item": "Margherita", "ingredients": 2.55, "labor": 1.20, "packaging": 0.30, "total_cost": 4.05, "price": 8.50},
        {"item": "Pepperoni", "ingredients": 3.25, "labor": 1.30, "packaging": 0.30, "total_cost": 4.85, "price": 10.50},
        {"item": "Capricciosa", "ingredients": 3.55, "labor": 1.40, "packaging": 0.30, "total_cost": 5.25, "price": 11.00},
        {"item": "Caesar Salad", "ingredients": 2.10, "labor": 0.80, "packaging": 0.20, "total_cost": 3.10, "price": 7.50},
        {"item": "Grilled Salmon", "ingredients": 5.80, "labor": 2.00, "packaging": 0.40, "total_cost": 8.20, "price": 15.50},
        {"item": "Steak", "ingredients": 6.20, "labor": 2.50, "packaging": 0.40, "total_cost": 9.10, "price": 18.00},
    ]}

@router.get("/cross-sell-suggestions")
def get_cross_sell(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"cross_sell": [
        {"main": "Margherita", "suggestion": "Caesar Salad", "confidence": 45, "lift": 2.1},
        {"main": "Grilled Salmon", "suggestion": "Greek Salad", "confidence": 38, "lift": 1.8},
        {"main": "Steak", "suggestion": "Tiramisu", "confidence": 32, "lift": 1.5},
        {"main": "Capricciosa", "suggestion": "Bruschetta", "confidence": 28, "lift": 1.3},
    ]}

@router.get("/menu-card-heatmap")
def get_menu_heatmap(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"heatmap": {
        "hotspots": [
            {"zone": "top-left", "item": "Margherita", "clicks": 1200, "orders": 500},
            {"zone": "top-right", "item": "Pepperoni", "clicks": 1100, "orders": 480},
            {"zone": "center", "item": "Grilled Salmon", "clicks": 800, "orders": 280},
            {"zone": "bottom-left", "item": "Tiramisu", "clicks": 600, "orders": 300},
        ],
        "coldspots": [
            {"zone": "bottom-right", "item": "Calamari", "clicks": 200, "orders": 80},
        ],
        "recommendations": [
            "Premakni Calamari na vidnejše mesto",
            "Dodaj sliko k Grilled Salmon",
            "Poudari Margherita kot bestseller",
        ]
    }}
