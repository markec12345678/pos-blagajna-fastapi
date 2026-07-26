from fastapi import APIRouter
router = APIRouter(prefix="/revenue-v2", tags=["Revenue V2"])

@router.get("/overview")
def revenue_overview():
    return {
        "today": 2847.50,
        "yesterday": 2654.30,
        "this_week": 18245.00,
        "last_week": 17892.40,
        "this_month": 72450.80,
        "last_month": 68920.15,
        "trend": "up",
        "change_pct": 5.1
    }

@router.get("/by-category")
def revenue_by_category():
    return {
        "categories": [
            {"name": "Hrana", "amount": 1820.40, "pct": 63.9, "trend": "up"},
            {"name": "Pijače", "amount": 645.20, "pct": 22.7, "trend": "up"},
            {"name": "Desserti", "amount": 245.80, "pct": 8.6, "trend": "down"},
            {"name": "Druge", "amount": 136.10, "pct": 4.8, "trend": "stable"},
        ]
    }

@router.get("/forecast")
def revenue_forecast():
    return {
        "today_forecast": 2950.00,
        "week_forecast": 19200.00,
        "confidence": 82,
        "factors": [
            {"factor": "Vreme", "impact": "+3%", "weight": 0.3},
            {"factor": "Dan v tednu", "impact": "+5%", "weight": 0.4},
            {"factor": "Dogodki", "impact": "+8%", "weight": 0.3},
        ],
        "daily_forecast": [
            {"day": "Pon", "forecast": 2800, "low": 2400, "high": 3200},
            {"day": "Tor", "forecast": 2950, "low": 2500, "high": 3400},
            {"day": "Sre", "forecast": 3100, "low": 2600, "high": 3600},
            {"day": "Čet", "forecast": 3200, "low": 2700, "high": 3700},
            {"day": "Pet", "forecast": 3800, "low": 3200, "high": 4400},
            {"day": "Sob", "forecast": 4200, "low": 3600, "high": 4800},
            {"day": "Ned", "forecast": 3900, "low": 3300, "high": 4500},
        ]
    }

@router.get("/optimization")
def revenue_optimization():
    return {
        "suggestions": [
            {"title": "Povečaj ceno artikla 'Tiramisu'", "impact": "+€120/teden", "confidence": 85, "category": "Cene"},
            {"title": "Dodaj 'Dnevno ponudbo' ob 12:00", "impact": "+€200/teden", "confidence": 78, "category": "Meni"},
            {"title": "Optimiziraj urne konice z dodatnim osebjem", "impact": "+€350/teden", "confidence": 72, "category": "Osebje"},
        ],
        "revenue_per_seat": 34.20,
        "revenue_per_hour": 285.40,
        "table_turnover": 2.8,
        "peak_hours": ["12:00-13:00", "19:00-21:00"]
    }
