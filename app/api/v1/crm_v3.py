from fastapi import APIRouter
router = APIRouter(prefix="/crm-v3", tags=["CRM V3"])

@router.get("/pipeline")
def pipeline():
    return {
        "stages": [
            {"name": "Novi kontakt", "count": 24, "value": 12000, "color": "#3b82f6"},
            {"name": "Pogovor", "count": 18, "value": 28500, "color": "#8b5cf6"},
            {"name": "Ponudba", "count": 8, "value": 15200, "color": "#f59e0b"},
            {"name": "Zaključeno", "count": 12, "value": 34800, "color": "#22c55e"},
        ],
        "total_pipeline": 90500,
        "weighted_pipeline": 42300,
        "win_rate": 68.5,
        "avg_deal_size": 2900
    }

@router.get("/leads")
def lead_scoring():
    return {
        "total_leads": 62,
        "hot": 8,
        "warm": 24,
        "cold": 30,
        "leads": [
            {"name": "Restavracija Center d.o.o.", "score": 85, "stage": "Ponudba", "value": 8500, "last_contact": "2026-07-15", "source": "Priporočilo"},
            {"name": "Gostilna Pri Hribu", "score": 72, "stage": "Pogovor", "value": 4200, "last_contact": "2026-07-14", "source": "Spletna stran"},
            {"name": "Kavarna Zvezda", "score": 45, "stage": "Novi kontakt", "value": 2800, "last_contact": "2026-07-10", "source": "Telefon"},
        ],
        "conversion_rate": 19.4
    }

@router.get("/activities")
def activity_tracking():
    return {
        "today": {"calls": 8, "emails": 12, "meetings": 3, "tasks": 5},
        "this_week": {"calls": 42, "emails": 65, "meetings": 12, "tasks": 28},
        "upcoming": [
            {"type": "meeting", "contact": "Restavracija Center", "time": "14:00", "topic": "Ponudba za celoten paket"},
            {"type": "call", "contact": "Gostilna Pri Hribu", "time": "16:00", "topic": "Sledenje po ponudbi"},
            {"type": "email", "contact": "Kavarna Zvezda", "time": "Jutri", "topic": "Odziv na povpraševanje"},
        ],
        "overdue_tasks": 2
    }

@router.get("/forecast")
def sales_forecast():
    return {
        "this_month": {"target": 45000, "actual": 34800, "probability": 77.3},
        "next_month": {"forecast": 42000, "confidence": 72},
        "quarter": {"target": 135000, "forecast": 128500, "gap": -6500},
        "by_source": [
            {"source": "Priporočilo", "deals": 8, "value": 24500, "conversion": 75},
            {"source": "Spletna stran", "deals": 12, "value": 18200, "conversion": 45},
            {"source": "Telefon", "deals": 6, "value": 8900, "conversion": 32},
            {"source": "Dogodek", "deals": 3, "value": 12000, "conversion": 60},
        ]
    }
