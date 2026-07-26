from fastapi import APIRouter
router = APIRouter(prefix="/reservations-v3", tags=["Reservations V3"])

@router.get("/calendar")
def reservation_calendar():
    return {
        "today": [
            {"id": 1, "name": "Novak", "time": "12:00", "party": 4, "table": "T5", "status": "confirmed", "vip": False, "notes": "Okno"},
            {"id": 2, "name": "Horvat", "time": "12:30", "party": 2, "table": "T2", "status": "seated", "vip": True, "notes": "Alergija na oreščke"},
            {"id": 3, "name": "Kovač", "time": "19:00", "party": 8, "table": "T12", "status": "confirmed", "vip": False, "notes": "Rojstni dan"},
            {"id": 4, "name": "Zupan", "time": "19:30", "party": 6, "table": "T8", "status": "pending", "vip": True, "notes": "Poslovna večerja"},
        ],
        "capacity": {"total": 48, "reserved": 32, "available": 16, "utilization_pct": 66.7}
    }

@router.get("/preferences")
def customer_preferences():
    return {
        "vip_customers": [
            {"name": "Horvat", "visits": 42, "avg_spend": 85.50, "favorite_table": "T2", "dietary": ["Brez glutena"], "last_visit": "2026-07-15"},
            {"name": "Zupan", "visits": 28, "avg_spend": 120.00, "favorite_table": "T8", "dietary": [], "last_visit": "2026-07-10"},
            {"name": "Mlinar", "visits": 35, "avg_spend": 92.30, "favorite_table": "T6", "dietary": ["Vegetarijansko"], "last_visit": "2026-07-14"},
        ],
        "regular_customers": 156,
        "new_customers_this_month": 23
    }

@router.get("/special-requests")
def special_requests():
    return {
        "requests": [
            {"reservation_id": 2, "type": "dietary", "description": "Alergija na oreščke", "handled": True},
            {"reservation_id": 3, "type": "celebration", "description": "Rojstni dan — torta ob 20:00", "handled": False},
            {"reservation_id": 4, "type": "business", "description": "Projektor in Bela tabela", "handled": False},
        ],
        "pending": 2,
        "completed_today": 5
    }

@router.get("/analytics")
def reservation_analytics():
    return {
        "no_show_rate": 4.2,
        "avg_party_size": 3.8,
        "peak_day": "Sobota",
        "peak_time": "19:00",
        "online_vs_phone": {"online": 62, "phone": 38},
        "repeat_rate": 74.5,
        "cancellation_rate": 6.8,
        "avg_lead_time_days": 3.2
    }
