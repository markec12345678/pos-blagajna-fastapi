from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, text
from app.core.database import get_db, engine
from app.models.order import Order
from app.models.customer import Customer
from app.models.menu_item import MenuItem
from app.models.inventory import Ingredient
from app.models.payment import Payment
from app.models.user import User
from datetime import datetime
import os, platform

router = APIRouter(prefix="/system", tags=["system"])
_start_time = datetime.now()


@router.get("/ping")
def ping():
    return {"status": "ok", "timestamp": datetime.now().isoformat()}


@router.get("/health")
def system_health(db: Session = Depends(get_db)):
    db_size = 0
    try:
        result = db.execute(text("PRAGMA page_count"))
        page_count = result.scalar() or 0
        result = db.execute(text("PRAGMA page_size"))
        page_size = result.scalar() or 0
        db_size = page_count * page_size
    except Exception:
        pass

    order_count = db.query(func.count(Order.id)).scalar() or 0
    customer_count = db.query(func.count(Customer.id)).scalar() or 0
    menu_count = db.query(func.count(MenuItem.id)).scalar() or 0
    ingredient_count = db.query(func.count(Ingredient.id)).scalar() or 0
    payment_count = db.query(func.count(Payment.id)).scalar() or 0
    user_count = db.query(func.count(User.id)).scalar() or 0
    open_orders = db.query(func.count(Order.id)).filter(Order.status == "open").scalar() or 0

    uptime = (datetime.now() - _start_time).total_seconds()
    uptime_str = f"{int(uptime // 3600)}h {int((uptime % 3600) // 60)}m {int(uptime % 60)}s"

    cpu = 0
    memory = 0
    try:
        import psutil
        cpu = psutil.cpu_percent(interval=0.1)
        memory = psutil.virtual_memory().percent
    except ImportError:
        pass

    backup_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "backups")
    backup_count = 0
    backup_size = 0
    if os.path.exists(backup_dir):
        for f in os.listdir(backup_dir):
            fp = os.path.join(backup_dir, f)
            if os.path.isfile(fp):
                backup_count += 1
                backup_size += os.path.getsize(fp)

    return {
        "server": {
            "uptime": uptime_str,
            "uptime_seconds": int(uptime),
            "started_at": _start_time.isoformat(),
            "cpu_percent": cpu,
            "memory_percent": memory,
            "platform": platform.platform(),
            "python_version": platform.python_version(),
        },
        "database": {
            "size_bytes": db_size,
            "size_mb": round(db_size / (1024 * 1024), 2),
            "type": "sqlite" if "sqlite" in str(engine.url).lower() else "postgresql",
        },
        "records": {
            "orders": order_count,
            "customers": customer_count,
            "menu_items": menu_count,
            "ingredients": ingredient_count,
            "payments": payment_count,
            "users": user_count,
            "open_orders": open_orders,
        },
        "backups": {
            "count": backup_count,
            "total_size_mb": round(backup_size / (1024 * 1024), 2),
        },
    }
