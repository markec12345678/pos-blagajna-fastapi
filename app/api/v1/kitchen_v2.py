from fastapi import APIRouter
router = APIRouter(prefix="/kitchen-v2", tags=["Kitchen V2"])

@router.get("/orders")
def kitchen_orders():
    return {
        "orders": [
            {"id": 101, "table": "5", "items": ["Risotto", "Tiramisu"], "status": "preparing", "priority": "normal", "chef": "Ana", "elapsed_min": 8, "est_min": 12},
            {"id": 102, "table": "12", "items": ["Grilled Salmon"], "status": "ready", "priority": "rush", "chef": "Marko", "elapsed_min": 15, "est_min": 0},
            {"id": 103, "table": "3", "items": ["Caesar Salad", "Steak"], "status": "new", "priority": "normal", "chef": "", "elapsed_min": 0, "est_min": 18},
        ],
        "summary": {"new": 1, "preparing": 1, "ready": 1, "served": 0}
    }

@router.get("/stations")
def kitchen_stations():
    return {
        "stations": [
            {"id": 1, "name": "Topli obrok", "chef": "Ana", "status": "busy", "orders": 3, "avg_time_min": 14},
            {"id": 2, "name": "Hladni obrok", "chef": "Luka", "status": "idle", "orders": 0, "avg_time_min": 6},
            {"id": 3, "name": "Pecivo", "chef": "Maja", "status": "busy", "orders": 2, "avg_time_min": 8},
            {"id": 4, "name": "Pijače", "chef": "Sara", "status": "idle", "orders": 1, "avg_time_min": 3},
        ]
    }

@router.get("/timing")
def kitchen_timing():
    return {
        "avg_prep_time_min": 12.4,
        "avg_ticket_time_min": 18.7,
        "longest_wait_min": 24,
        "rush_orders_today": 8,
        "on_time_rate": 87.5,
        "by_hour": [
            {"hour": "11:00", "orders": 12, "avg_min": 10},
            {"hour": "12:00", "orders": 28, "avg_min": 14},
            {"hour": "13:00", "orders": 22, "avg_min": 16},
            {"hour": "19:00", "orders": 18, "avg_min": 13},
            {"hour": "20:00", "orders": 25, "avg_min": 15},
            {"hour": "21:00", "orders": 15, "avg_min": 12},
        ]
    }

@router.get("/performance")
def kitchen_performance():
    return {
        "chefs": [
            {"name": "Ana", "orders": 45, "avg_min": 11.2, "on_time": 91, "rating": 4.8},
            {"name": "Marko", "orders": 38, "avg_min": 13.5, "on_time": 84, "rating": 4.5},
            {"name": "Luka", "orders": 32, "avg_min": 9.8, "on_time": 94, "rating": 4.7},
            {"name": "Maja", "orders": 28, "avg_min": 7.6, "on_time": 96, "rating": 4.9},
        ],
        "summary": {"total_chefs": 4, "avg_efficiency": 91.2, "best_performer": "Maja"}
    }
