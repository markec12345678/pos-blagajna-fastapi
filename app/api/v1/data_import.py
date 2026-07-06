from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.customer import Customer
from app.models.menu_item import MenuItem
from app.models.inventory import Ingredient
from app.models.category import Category
from app.models.branch import Branch
import csv, io

router = APIRouter(prefix="/import", tags=["import"])


@router.post("/customers")
def import_customers(file: UploadFile = File(...), db: Session = Depends(get_db)):
    content = file.file.read().decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(content))
    cols = reader.fieldnames or []
    required = ["name"]
    for r in required:
        if r not in cols:
            raise HTTPException(400, f"Missing column: {r}. Got: {', '.join(cols)}")

    imported = 0
    errors = []
    for i, row in enumerate(reader, start=2):
        if not row.get("name", "").strip():
            errors.append(f"Row {i}: name is required")
            continue
        cust = Customer(
            name=row["name"].strip(),
            phone=row.get("phone", "").strip(),
            email=row.get("email", "").strip(),
            address=row.get("address", "").strip(),
            notes=row.get("notes", "").strip(),
            tags=row.get("tags", "").strip(),
            is_member=(row.get("is_member", "").strip().lower() in ("true", "1", "yes")),
            loyalty_points=int(row.get("loyalty_points", 0)) if row.get("loyalty_points", "").strip() else 0,
        )
        db.add(cust)
        imported += 1
    db.commit()
    return {"ok": True, "imported": imported, "errors": errors, "total_rows": imported + len(errors)}


@router.post("/menu-items")
def import_menu_items(file: UploadFile = File(...), db: Session = Depends(get_db)):
    content = file.file.read().decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(content))
    cols = reader.fieldnames or []
    required = ["name", "price"]
    for r in required:
        if r not in cols:
            raise HTTPException(400, f"Missing column: {r}. Got: {', '.join(cols)}")

    cat_cache: dict[str, int | None] = {}
    def get_cat_id(name: str) -> int | None:
        if not name:
            return None
        if name not in cat_cache:
            cat = db.query(Category).filter(Category.name == name).first()
            cat_cache[name] = cat.id if cat else None
        return cat_cache[name]

    imported = 0
    errors = []
    for i, row in enumerate(reader, start=2):
        name = row.get("name", "").strip()
        if not name:
            errors.append(f"Row {i}: name is required")
            continue
        try:
            price = float(row["price"])
        except (ValueError, KeyError):
            errors.append(f"Row {i}: invalid price")
            continue
        item = MenuItem(
            name=name,
            price=price,
            description=row.get("description", "").strip(),
            category_id=get_cat_id(row.get("category", "").strip()),
            is_active=row.get("is_active", "true").strip().lower() in ("true", "1", "yes"),
            is_favorite=row.get("is_favorite", "").strip().lower() in ("true", "1", "yes"),
            plu_code=row.get("plu_code", "").strip() or None,
            tax_rate=float(row["tax_rate"]) if row.get("tax_rate", "").strip() else 0,
            allergens=row.get("allergens", "").strip() or None,
        )
        db.add(item)
        imported += 1
    db.commit()
    return {"ok": True, "imported": imported, "errors": errors, "total_rows": imported + len(errors)}


@router.post("/ingredients")
def import_ingredients(file: UploadFile = File(...), db: Session = Depends(get_db)):
    content = file.file.read().decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(content))
    cols = reader.fieldnames or []
    required = ["name", "unit"]
    for r in required:
        if r not in cols:
            raise HTTPException(400, f"Missing column: {r}. Got: {', '.join(cols)}")

    imported = 0
    errors = []
    for i, row in enumerate(reader, start=2):
        name = row.get("name", "").strip()
        unit = row.get("unit", "").strip()
        if not name or not unit:
            errors.append(f"Row {i}: name and unit are required")
            continue
        ing = Ingredient(
            name=name,
            unit=unit,
            category=row.get("category", "food").strip(),
            stock=float(row["stock"]) if row.get("stock", "").strip() else 0,
            min_stock=float(row["min_stock"]) if row.get("min_stock", "").strip() else 0,
            cost_per_unit=float(row["cost_per_unit"]) if row.get("cost_per_unit", "").strip() else 0,
            barcode=row.get("barcode", "").strip(),
        )
        db.add(ing)
        imported += 1
    db.commit()
    return {"ok": True, "imported": imported, "errors": errors, "total_rows": imported + len(errors)}
