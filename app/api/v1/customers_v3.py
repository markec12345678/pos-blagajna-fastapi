from fastapi import APIRouter
router = APIRouter(prefix="/customers-v3", tags=["Customers V3"])

@router.get("/profiles")
def customer_profiles():
    return {
        "total": 456,
        "active": 366,
        "vip": 28,
        "new_this_month": 23,
        "profiles": [
            {"id": 1, "name": "Janez Novak", "email": "janez@example.com", "phone": "+386 40 123 456", "visits": 42, "total_spent": 2145.00, "last_visit": "2026-07-15", "segment": "Redni", "vip": True},
            {"id": 2, "name": "Ana Horvat", "email": "ana@example.com", "phone": "+386 31 234 567", "visits": 28, "total_spent": 1520.00, "last_visit": "2026-07-12", "segment": "Redni", "vip": True},
            {"id": 3, "name": "Marko Kovač", "email": "marko@example.com", "phone": "+386 40 345 678", "visits": 12, "total_spent": 580.00, "last_visit": "2026-07-08", "segment": "Priložnostni", "vip": False},
            {"id": 4, "name": "Maja Zupan", "email": "maja@example.com", "phone": "+386 31 456 789", "visits": 5, "total_spent": 210.00, "last_visit": "2026-06-20", "segment": "Novi", "vip": False},
        ]
    }

@router.get("/preferences")
def customer_preferences():
    return {
        "dietary_preferences": [
            {"type": "Vegetarijansko", "count": 45, "pct": 9.9},
            {"type": "Brez glutena", "count": 32, "pct": 7.0},
            {"type": "Vegansko", "count": 18, "pct": 3.9},
            {"type": "Brez laktoze", "count": 15, "pct": 3.3},
        ],
        "favorite_categories": [
            {"name": "Mesne jedi", "pct": 35.2},
            {"name": "Ribe", "pct": 22.8},
            {"name": "Testenine", "pct": 18.4},
            {"name": "Solate", "pct": 12.6},
            {"name": "Desserti", "pct": 11.0},
        ],
        "avg_party_size": 3.2,
        "preferred_time": "19:00-20:00"
    }

@router.get("/ltv")
def customer_ltv():
    return {
        "avg_ltv": 335.00,
        "median_ltv": 280.00,
        "top_10pct_ltv": 890.00,
        "ltv_distribution": [
            {"range": "0-100 €", "count": 120, "pct": 26.3},
            {"range": "100-300 €", "count": 165, "pct": 36.2},
            {"range": "300-500 €", "count": 98, "pct": 21.5},
            {"range": "500-1000 €", "count": 58, "pct": 12.7},
            {"range": "1000+ €", "count": 15, "pct": 3.3},
        ],
        "predicted_12mo": {"total": 152400, "growth": 12.5}
    }

@router.get("/segmentation")
def segmentation():
    return {
        "rfm": [
            {"segment": "Champions", "count": 42, "description": "Nakupujejo pogosto in dragoceno", "action": "Nagradi in ohranjaj"},
            {"segment": "Loyal", "count": 85, "description": "Redni gostje z dobrim AOV", "action": "Cross-sell"},
            {"segment": "Potential", "count": 120, "description": "Nedavno prvič nakupili", "action": "Welcome kampanja"},
            {"segment": "At Risk", "count": 35, "description": "Niso obiskali 60+ dni", "action": "Win-back kampanja"},
            {"segment": "Lost", "count": 18, "description": "Niso obiskali 90+ dni", "action": "Velika popust"},
        ]
    }
