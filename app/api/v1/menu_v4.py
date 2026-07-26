from fastapi import APIRouter
router = APIRouter(prefix="/menu-v4", tags=["Menu V4"])

@router.get("/analytics")
def menu_analytics():
    return {
        "total_items": 68,
        "active_items": 62,
        "avg_margin": 68.4,
        "best_seller": {"name": "Risotto ai Funghi", "orders": 342, "revenue": 5472.00, "margin": 72.1},
        "worst_seller": {"name": "Solata z Rakci", "orders": 12, "revenue": 216.00, "margin": 45.2},
        "by_category": [
            {"name": "Predjedi", "items": 12, "avg_price": 8.90, "avg_margin": 71.2, "popularity": 78},
            {"name": "Glavne jedi", "items": 18, "avg_price": 16.50, "avg_margin": 65.8, "popularity": 92},
            {"name": "Testenine", "items": 8, "avg_price": 13.20, "avg_margin": 69.4, "popularity": 85},
            {"name": "Ribe", "items": 6, "avg_price": 18.90, "avg_margin": 58.2, "popularity": 72},
            {"name": "Desserti", "items": 8, "avg_price": 7.50, "avg_margin": 74.6, "popularity": 65},
            {"name": "Pijače", "items": 16, "avg_price": 4.80, "avg_margin": 78.3, "popularity": 88},
        ]
    }

@router.get("/ab-testing")
def ab_testing():
    return {
        "active_tests": 2,
        "completed_tests": 8,
        "tests": [
            {"id": 1, "name": "Novi opis Tiramisu", "status": "active", "variant_a": "Klasični Tiramisu", "variant_b": "Tiramisu z domačim mascarponeom", "start": "2026-07-10", "lift_pct": 15.2, "confidence": 78},
            {"id": 2, "name": "Cena Caesarske", "status": "active", "variant_a": "8.90 €", "variant_b": "9.90 €", "start": "2026-07-12", "lift_pct": -2.1, "confidence": 62},
            {"id": 3, "name": "Fotografija jedi", "status": "completed", "winner": "B", "lift_pct": 22.4, "confidence": 95},
        ]
    }

@router.get("/seasonal")
def seasonal_menu():
    return {
        "current_season": "Poletje",
        "seasonal_items": [
            {"name": "Hladna lubenica", "category": "Predjedi", "price": 6.90, "season": "Poletje", "status": "active"},
            {"name": "Losos na žaru", "category": "Ribe", "price": 18.90, "season": "Poletje", "status": "active"},
            {"name": "Sladoledni meni", "category": "Desserti", "price": 5.50, "season": "Poletje", "status": "active"},
        ],
        "upcoming": [
            {"name": "Bučna juha", "category": "Predjedi", "season": "Jesen", "start": "2026-09-21"},
            {"name": "Divjačina", "category": "Glavne jedi", "season": "Jesen", "start": "2026-09-21"},
        ],
        "seasonal_revenue_pct": 18.4
    }

@router.get("/optimization")
def menu_optimization():
    return {
        "suggestions": [
            {"title": "Odstrani 'Solato z Rakci'", "reason": "Nizka prodaja (12 naročil/mesec)", "impact": "+€180/mesec", "confidence": 88},
            {"title": "Povečaj ceno Risotta za 1 €", "reason": "Visoka priljubljenost, dobra marža", "impact": "+€342/mesec", "confidence": 82},
            {"title": "Dodaj 3 nove testenine", "reason": "Testenine imajo visoko maržo (69.4%)", "impact": "+€520/mesec", "confidence": 75},
        ],
        "price_elasticity": -1.2,
        "menuengineering_matrix": {"stars": 8, "puzzles": 5, "plow_horses": 12, "dogs": 3}
    }
