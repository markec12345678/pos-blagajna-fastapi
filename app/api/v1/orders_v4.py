from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.v1.auth import get_current_user

router = APIRouter(prefix="/orders-v4", tags=["orders-v4"])

@router.get("/batch-processing")
def get_batch_processing(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"batches": [
        {"id": 1, "name": "Kosilo - 12:00", "orders": 18, "items": 45, "avg_prep_time": 12.5, "status": "completed", "started": "12:00", "finished": "12:35"},
        {"id": 2, "name": "Popoldne - 15:00", "orders": 8, "items": 15, "avg_prep_time": 8.2, "status": "completed", "started": "15:00", "finished": "15:18"},
        {"id": 3, "name": "Večerja - 19:00", "orders": 32, "items": 88, "avg_prep_time": 14.8, "status": "in_progress", "started": "19:00", "finished": None},
    ], "today_summary": {"total_batches": 3, "total_orders": 58, "total_items": 148, "avg_batch_time": 25.0}}

@router.get("/order-prioritization")
def get_order_prioritization(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"orders": [
        {"id": 1001, "table": "T5", "priority": "high", "items": 6, "time_waiting": 8, "type": "dine_in", "vip": True, "special_notes": "Alergija na gluten"},
        {"id": 1002, "table": "T12", "priority": "medium", "items": 3, "time_waiting": 12, "type": "dine_in", "vip": False, "special_notes": None},
        {"id": 1003, "table": None, "priority": "low", "items": 2, "time_waiting": 5, "type": "takeaway", "vip": False, "special_notes": None},
        {"id": 1004, "table": "T8", "priority": "critical", "items": 8, "time_waiting": 22, "type": "dine_in", "vip": False, "special_notes": "Praznovanje rojstnega dne"},
    ], "queue_stats": {"critical": 1, "high": 2, "medium": 5, "low": 3, "avg_wait": 11.5}}

@router.get("/course-management")
def get_course_management(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"courses": [
        {"table": "T3", "courses": [
            {"course": 1, "items": ["Jabolčnik", "Solata"], "status": "served", "served_at": "19:15"},
            {"course": 2, "items": ["Ribji file", "Steak"], "status": "preparing", "started_at": "19:25"},
            {"course": 3, "items": ["Tiramisu", "Sladoled"], "status": "pending", "estimated": "19:50"},
        ], "guests": 4, "started": "19:00"},
        {"table": "T7", "courses": [
            {"course": 1, "items": ["Bruschetta"], "status": "served", "served_at": "19:20"},
            {"course": 2, "items": ["Pizza Margherita", "Pasta Carbonara"], "status": "preparing", "started_at": "19:30"},
        ], "guests": 2, "started": "19:10"},
    ]}

@router.get("/order-modifications")
def get_order_modifications(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"modifications": [
        {"order_id": 1001, "original": "Pizza Margherita", "modified_to": "Brez glutena, z mocarelo", "modifier": "Luka Z.", "time": "19:05", "price_change": 2.00},
        {"order_id": 1003, "original": "Kava", "modified_to": "Velika kava, z mlekom", "modifier": "Ana K.", "time": "19:08", "price_change": 0.50},
        {"order_id": 1005, "original": "Steak medium", "modified_to": "Steak well done", "modifier": "Peter K.", "time": "19:12", "price_change": 0},
    ], "total_modifications_today": 12, "avg_per_order": 0.21}

@router.get("/kitchen-flow")
def get_kitchen_flow(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"flow": {
        "stations": [
            {"name": "Krušna peč", "orders_in_queue": 5, "avg_time": 8.0, "utilization": 85, "current_item": "Pizza Quattro Formaggi"},
            {"name": "Gril", "orders_in_queue": 3, "avg_time": 12.0, "utilization": 72, "current_item": "Losos"},
            {"name": "Omara", "orders_in_queue": 2, "avg_time": 5.0, "utilization": 45, "current_item": "Caesar Salad"},
            {"name": "Sladice", "orders_in_queue": 1, "avg_time": 3.0, "utilization": 30, "current_item": "Tiramisu"},
        ],
        "bottleneck": "Krušna peč",
        "overall_utilization": 58,
        "orders_per_hour": 22
    }}

@router.get("/special-requests")
def get_special_requests(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"requests": [
        {"id": 1, "order_id": 1001, "type": "alergija", "detail": "Gluten", "severity": "high", "table": "T5", "handled": True, "handled_by": "Luka Z."},
        {"id": 2, "order_id": 1006, "type": "diet", "detail": "Vegansko", "severity": "medium", "table": "T9", "handled": True, "handled_by": "Ana K."},
        {"id": 3, "order_id": 1008, "type": "praznovanje", "detail": "Rojstni dan - presenetite z torto", "severity": "low", "table": "T8", "handled": False, "handled_by": None},
        {"id": 4, "order_id": 1010, "type": "alergija", "detail": "Oreščki", "severity": "high", "table": "T2", "handled": True, "handled_by": "Peter K."},
    ], "pending_requests": 1, "completed_today": 15}

@router.get("/order-accuracy")
def get_order_accuracy(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"accuracy": {
        "total_orders_today": 58,
        "correct_orders": 55,
        "accuracy_rate": 94.8,
        "errors": [
            {"type": "Napačen artikel", "count": 2, "percentage": 3.4},
            {"type": "Manjkajoči artikel", "count": 1, "percentage": 1.7},
            {"type": "Napačna priprava", "count": 0, "percentage": 0},
        ],
        "trend": [
            {"day": "Pon", "rate": 96.2},
            {"day": "Tor", "rate": 95.5},
            {"day": "Sre", "rate": 97.1},
            {"day": "Čet", "rate": 94.8},
            {"day": "Pet", "rate": 93.5},
            {"day": "Sob", "rate": 95.0},
            {"day": "Ned", "rate": 94.8},
        ]
    }}

@router.get("/table-rotation")
def get_table_rotation(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"rotation": [
        {"table": "T1", "seatings": 4, "avg_duration": 62, "revenue": 185.00, "turnover_rate": 1.2},
        {"table": "T3", "seatings": 3, "avg_duration": 75, "revenue": 220.00, "turnover_rate": 0.9},
        {"table": "T5", "seatings": 2, "avg_duration": 45, "revenue": 120.00, "turnover_rate": 1.5},
        {"table": "T7", "seatings": 5, "avg_duration": 90, "revenue": 350.00, "turnover_rate": 0.7},
        {"table": "T8", "seatings": 4, "avg_duration": 55, "revenue": 195.00, "turnover_rate": 1.1},
    ], "avg_turnover": 1.08, "peak_turnover": 1.5, "optimal_duration": 60}
