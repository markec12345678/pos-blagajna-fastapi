from fastapi import APIRouter, Depends
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from app.core.database import get_db, engine, Base, SessionLocal
from app.models.user import User
from app.models.category import Category
from app.models.menu_item import MenuItem
from app.models.table_model import TableModel
from app.models.order import Order, OrderItem
from app.models.payment import Payment
from app.models.inventory import Ingredient, StockTransaction, RecipeItem
from app.models.settings import Setting
from app.models.audit_log import AuditLog
from app.models.cash_register import CashRegister, CashMovement
from app.models.branch import Branch
from app.models.customer import Customer
from app.models.modifiers import ModifierGroup, ModifierOption, MenuItemModifierLink
from app.models.menu_course import MenuCourse
from app.models.supplier import Supplier, PurchaseOrder, PurchaseOrderItem
from app.models.reservation import Reservation
from app.models.shift import EmployeeShift
from app.models.gift_card import GiftCard, GiftCardTransaction
from app.models.promotion import Promotion
from app.models.rating import Rating
from app.models.loyalty import LoyaltyTransaction
from app.models.delivery import DeliveryOrder
import json, tempfile, os, shutil, glob, threading, time
from datetime import datetime, timedelta
from pathlib import Path
from app.core.cloud_backup import s3_upload, s3_list, s3_download, s3_delete, gdrive_upload, gdrive_list, gdrive_download, gdrive_delete

router = APIRouter(prefix="/backup", tags=["backup"])

MODELS = {
    "users": User, "categories": Category, "menu_items": MenuItem,
    "tables": TableModel, "orders": Order, "order_items": OrderItem,
    "payments": Payment, "ingredients": Ingredient,
    "stock_transactions": StockTransaction, "recipe_items": RecipeItem,
    "settings": Setting, "audit_logs": AuditLog,
    "cash_registers": CashRegister, "cash_movements": CashMovement,
    "branches": Branch, "customers": Customer,
    "modifier_groups": ModifierGroup, "modifier_options": ModifierOption,
    "menu_item_modifier_links": MenuItemModifierLink,
    "menu_courses": MenuCourse,
    "suppliers": Supplier, "purchase_orders": PurchaseOrder,
    "purchase_order_items": PurchaseOrderItem,
    "reservations": Reservation, "employee_shifts": EmployeeShift,
    "gift_cards": GiftCard, "gift_card_transactions": GiftCardTransaction,
    "promotions": Promotion,
    "ratings": Rating,
    "loyalty_transactions": LoyaltyTransaction,
    "delivery_orders": DeliveryOrder,
}

BACKUP_DIR = Path(__file__).parent.parent.parent / "backups"
BACKUP_DIR.mkdir(exist_ok=True)


def get_setting(key: str, default: str = "") -> str:
    try:
        db = SessionLocal()
        s = db.query(Setting).filter(Setting.key == key).first()
        db.close()
        return s.value if s else default
    except:
        return default


def create_backup_file() -> str:
    db = SessionLocal()
    data = {}
    for name, model in MODELS.items():
        rows = db.query(model).all()
        cols = [c.name for c in model.__table__.columns]
        data[name] = [[getattr(r, c) for c in cols] for r in rows]
        data[name + "_cols"] = cols
    db.close()
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = BACKUP_DIR / f"pos-backup-{timestamp}.json"
    with open(filename, "w", encoding="utf-8") as f:
        json.dump(data, f, default=str, indent=2)
    return str(filename)


def rotate_backups(retain_days: int = 30):
    cutoff = datetime.now() - timedelta(days=retain_days)
    for f in glob.glob(str(BACKUP_DIR / "pos-backup-*.json")):
        try:
            fname = Path(f)
            parts = fname.stem.split("-")
            if len(parts) >= 3:
                filedate = datetime.strptime(parts[-1], "%Y%m%d_%H%M%S")
                if filedate < cutoff:
                    fname.unlink()
        except:
            pass


@router.get("")
def export_backup(db: Session = Depends(get_db)):
    data = {}
    for name, model in MODELS.items():
        rows = db.query(model).all()
        cols = [c.name for c in model.__table__.columns]
        data[name] = [[getattr(r, c) for c in cols] for r in rows]
        data[name + "_cols"] = cols
    tmp = tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False)
    json.dump(data, tmp, default=str, indent=2)
    tmp.close()
    return FileResponse(tmp.name, filename=f"pos-backup-{datetime.now().strftime('%Y%m%d')}.json")


@router.post("/auto")
def create_auto_backup(db: Session = Depends(get_db)):
    path = create_backup_file()
    retain = int(get_setting("backup_retention_days", "30"))
    rotate_backups(retain)
    return {"ok": True, "path": path, "size_kb": round(os.path.getsize(path) / 1024, 1)}


@router.get("/list")
def list_backups(db: Session = Depends(get_db)):
    files = []
    for f in sorted(glob.glob(str(BACKUP_DIR / "pos-backup-*.json")), reverse=True):
        fpath = Path(f)
        files.append({
            "name": fpath.name,
            "size_kb": round(fpath.stat().st_size / 1024, 1),
            "created_at": datetime.fromtimestamp(fpath.stat().st_mtime).isoformat(),
        })
    return files


@router.get("/download/{filename}")
def download_backup(filename: str):
    fpath = BACKUP_DIR / filename
    if not fpath.exists() or not fpath.is_file():
        return {"error": "File not found"}
    return FileResponse(str(fpath), filename=filename)


@router.post("/restore")
def import_backup(data: dict, db: Session = Depends(get_db)):
    for name, model in MODELS.items():
        cols = data.get(name + "_cols", [])
        rows = data.get(name, [])
        db.query(model).delete()
        for row in rows:
            kwargs = {c: v for c, v in zip(cols, row) if c in [cc.name for cc in model.__table__.columns]}
            db.add(model(**kwargs))
    db.commit()
    return {"ok": True, "restored": list(MODELS.keys())}


# ── Auto-backup scheduler ──
_scheduler_running = False


def _auto_backup_loop():
    global _scheduler_running
    _scheduler_running = True
    while True:
        try:
            enabled = get_setting("enable_auto_backup", "false")
            if enabled == "true":
                path = create_backup_file()
                retain = int(get_setting("backup_retention_days", "30"))
                rotate_backups(retain)
        except:
            pass
        interval_hours = float(get_setting("backup_interval_hours", "6"))
        time.sleep(interval_hours * 3600)


def start_auto_backup():
    if not _scheduler_running:
        t = threading.Thread(target=_auto_backup_loop, daemon=True)
        t.start()


# ── Cloud backup endpoints ──

def _cloud_settings(db: Session):
    def g(k: str, d: str = "") -> str:
        s = db.query(Setting).filter(Setting.key == k).first()
        return s.value if s else d
    return {
        "s3_endpoint": g("cloud_s3_endpoint"),
        "s3_bucket": g("cloud_s3_bucket"),
        "s3_access_key": g("cloud_s3_access_key"),
        "s3_secret_key": g("cloud_s3_secret_key"),
        "s3_region": g("cloud_s3_region", "us-east-1"),
        "gdrive_token": g("cloud_gdrive_token"),
        "gdrive_folder": g("cloud_gdrive_folder"),
        "cloud_provider": g("cloud_provider", "none"),
    }


@router.get("/cloud/settings")
def get_cloud_settings(db: Session = Depends(get_db)):
    cs = _cloud_settings(db)
    # Mask secrets
    for k in ["s3_secret_key", "gdrive_token"]:
        v = cs.get(k, "")
        cs[k] = v[:4] + "..." if len(v) > 8 else ""
    return cs


@router.post("/cloud/settings")
def save_cloud_settings(data: dict, db: Session = Depends(get_db)):
    for key, value in data.items():
        existing = db.query(Setting).filter(Setting.key == key).first()
        if existing:
            existing.value = str(value)
        else:
            db.add(Setting(key=key, value=str(value)))
    db.commit()
    return {"ok": True}


@router.post("/cloud/upload")
def cloud_upload(db: Session = Depends(get_db)):
    cs = _cloud_settings(db)
    local = create_backup_file()
    provider = cs["cloud_provider"]
    ok = False

    if provider == "s3":
        ok = s3_upload(local,
                       endpoint=cs["s3_endpoint"], bucket=cs["s3_bucket"],
                       access_key=cs["s3_access_key"], secret_key=cs["s3_secret_key"],
                       region=cs["s3_region"])
    elif provider == "gdrive":
        ok = gdrive_upload(local,
                           access_token=cs["gdrive_token"],
                           folder_id=cs["gdrive_folder"])

    if ok:
        log_action(db, "cloud_backup", "backup", 0, details=f"Cloud backup uploaded to {provider}")
    return {"ok": ok, "provider": provider}


@router.get("/cloud/list")
def cloud_list(db: Session = Depends(get_db)):
    cs = _cloud_settings(db)
    provider = cs["cloud_provider"]
    files = []

    if provider == "s3":
        files = s3_list(bucket=cs["s3_bucket"], prefix="pos-backup-",
                        endpoint=cs["s3_endpoint"],
                        access_key=cs["s3_access_key"], secret_key=cs["s3_secret_key"],
                        region=cs["s3_region"])
    elif provider == "gdrive":
        files = gdrive_list(access_token=cs["gdrive_token"],
                            folder_id=cs["gdrive_folder"])

    return files


@router.post("/cloud/download/{key:path}")
def cloud_download(key: str, db: Session = Depends(get_db)):
    cs = _cloud_settings(db)
    provider = cs["cloud_provider"]
    local = BACKUP_DIR / os.path.basename(key)
    ok = False

    if provider == "s3":
        ok = s3_download(key, str(local),
                         endpoint=cs["s3_endpoint"], bucket=cs["s3_bucket"],
                         access_key=cs["s3_access_key"], secret_key=cs["s3_secret_key"],
                         region=cs["s3_region"])
    elif provider == "gdrive":
        ok = gdrive_download(key, str(local),
                             access_token=cs["gdrive_token"])

    if ok:
        return {"ok": True, "path": str(local), "name": os.path.basename(key)}
    return {"ok": False, "error": "Download failed"}


@router.post("/cloud/delete/{key:path}")
def cloud_delete(key: str, db: Session = Depends(get_db)):
    cs = _cloud_settings(db)
    provider = cs["cloud_provider"]

    if provider == "s3":
        ok = s3_delete(key, bucket=cs["s3_bucket"],
                       endpoint=cs["s3_endpoint"],
                       access_key=cs["s3_access_key"], secret_key=cs["s3_secret_key"],
                       region=cs["s3_region"])
        return {"ok": ok}
    elif provider == "gdrive":
        ok = gdrive_delete(key, access_token=cs["gdrive_token"])
        return {"ok": ok}

    return {"ok": False, "error": "No cloud provider configured"}
