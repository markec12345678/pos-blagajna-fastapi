from fastapi import APIRouter
router = APIRouter(prefix="/analytics-v3", tags=["Analytics V3"])

@router.get("/realtime")
def realtime():
    return {
        "active_tables": 12,
        "active_orders": 18,
        "revenue_today": 2847.50,
        "guests_today": 67,
        "avg_order_value": 42.50,
        "orders_per_hour": 8.4,
        "live_feed": [
            {"time": "20:15", "event": "Miza #5 naročila", "type": "order"},
            {"time": "20:12", "event": "Plačilo miza #8 — 67.40 €", "type": "payment"},
            {"time": "20:10", "event": "Nova rezervacija — Horvat, 6 oseb", "type": "reservation"},
        ]
    }

@router.get("/cohort")
def cohort():
    return {
        "cohorts": [
            {"month": "Jan 2026", "customers": 45, "retention_30d": 62, "retention_90d": 48, "avg_ltv": 320},
            {"month": "Feb 2026", "customers": 52, "retention_30d": 58, "retention_90d": 42, "avg_ltv": 295},
            {"month": "Mar 2026", "customers": 61, "retention_30d": 65, "retention_90d": 51, "avg_ltv": 340},
            {"month": "Apr 2026", "customers": 48, "retention_30d": 60, "retention_90d": 45, "avg_ltv": 310},
            {"month": "Maj 2026", "customers": 55, "retention_30d": 68, "retention_90d": 54, "avg_ltv": 365},
            {"month": "Jun 2026", "customers": 63, "retention_30d": 72, "retention_90d": None, "avg_ltv": 380},
        ],
        "summary": {"avg_retention_30d": 64.2, "avg_ltv": 335, "best_cohort": "Jun 2026"}
    }

@router.get("/funnel")
def funnel():
    return {
        "steps": [
            {"name": "Obisk spletne strani", "count": 2450, "pct": 100},
            {"name": "Pregled menija", "count": 1820, "pct": 74.3},
            {"name": "Rezervacija/Online naročilo", "count": 340, "pct": 13.9},
            {"name": "Dokončano naročilo", "count": 285, "pct": 11.6},
            {"name": "Ponovni obisk", "count": 142, "pct": 5.8},
        ],
        "conversion_rate": 11.6,
        "biggest_drop": "Pregled menija → Rezervacija"
    }

@router.get("/segments")
def segments():
    return {
        "segments": [
            {"name": "Redni gostje", "count": 156, "pct": 34.2, "avg_spend": 48.50, "frequency": "Tedensko", "color": "#22c55e"},
            {"name": "Priložnostni", "count": 210, "pct": 46.1, "avg_spend": 35.20, "frequency": "Mesečno", "color": "#3b82f6"},
            {"name": "Novi", "count": 68, "pct": 14.9, "avg_spend": 42.00, "frequency": "1-krat", "color": "#f59e0b"},
            {"name": "Neaktivni", "count": 22, "pct": 4.8, "avg_spend": 28.40, "frequency": "Več kot 90 dni", "color": "#ef4444"},
        ],
        "total_customers": 456
    }
