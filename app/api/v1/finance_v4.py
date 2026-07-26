from fastapi import APIRouter
router = APIRouter(prefix="/finance-v4", tags=["Finance V4"])

@router.get("/multi-currency")
def multi_currency():
    return {
        "base_currency": "EUR",
        "rates": {"USD": 1.09, "GBP": 0.86, "CHF": 0.97, "HRK": 7.53},
        "transactions": [
            {"id": 1, "amount": 2500, "currency": "USD", "eur_value": 2293.58, "date": "2026-07-15", "type": "prihodek"},
            {"id": 2, "amount": 1800, "currency": "GBP", "eur_value": 2093.02, "date": "2026-07-14", "type": "odhodek"},
        ],
        "exposure": {"USD": 12500, "GBP": 8200, "total_eur": 22508}
    }

@router.get("/tax")
def tax_optimization():
    return {
        "current_tax_rate": 22,
        "estimated_annual_tax": 5280.00,
        "optimizations": [
            {"title": "Davek na promet", "saving": 1200, "complexity": "Nizka", "status": "na voljo"},
            {"title": "Investicijska olajšava", "saving": 3400, "complexity": "Srednja", "status": "na voljo"},
            {"title": "Znižana stopnja za hrano", "saving": 850, "complexity": "Nizka", "status": "izkoriščeno"},
        ],
        "compliance": {"status": "Skladen", "last_filing": "2026-06-30", "next_filing": "2026-07-31"}
    }

@router.get("/audit")
def audit_trail():
    return {
        "total_entries": 12450,
        "today": 48,
        "recent": [
            {"time": "15:42", "user": "Ana", "action": "Ustvaril račun", "amount": 125.80, "type": "transakcija"},
            {"time": "15:30", "user": "Marko", "action": "Spremenil ceno artikla", "detail": "Tiramisu: 7.50 → 8.50", "type": "sprememba"},
            {"time": "15:15", "user": "Ana", "action": "Odpravil zalogo", "detail": "Losos: -5 kg", "type": "inventura"},
            {"time": "14:50", "user": "Sistem", "action": "Samodejno naročilo", "detail": "Moka: 20 kg", "type": "auto"},
        ],
        "by_type": {"transakcije": 4520, "spremembe": 3280, "inventura": 2150, "uporabniki": 2500}
    }

@router.get("/planning")
def financial_planning():
    return {
        "budget": {"monthly": 65000, "actual": 58200, "variance": -6800, "pct": 89.5},
        "forecasts": [
            {"month": "Avg", "revenue": 62000, "costs": 41000, "profit": 21000},
            {"month": "Sep", "revenue": 58000, "costs": 39000, "profit": 19000},
            {"month": "Okt", "revenue": 55000, "costs": 38000, "profit": 17000},
        ],
        "scenarios": [
            {"name": "Optimistični", "revenue_pct": 15, "probability": 25},
            {"name": "Realistični", "revenue_pct": 0, "probability": 55},
            {"name": "Pesimistični", "revenue_pct": -10, "probability": 20},
        ]
    }
