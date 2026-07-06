from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import PlainTextResponse
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.order import Order, OrderItem
from app.models.inventory import Ingredient
from app.models.waste import WasteRecord
from app.models.shift import EmployeeShift
from app.models.user import User
from datetime import datetime, timedelta
import csv, io

router = APIRouter(prefix="/export", tags=["export"])


@router.get("/{export_type}")
def export_csv(export_type: str, days: int = 30, branch_id: int = 0, db: Session = Depends(get_db)):
    since = datetime.now() - timedelta(days=days)
    buf = io.StringIO()
    w = csv.writer(buf)

    if export_type == "sales":
        w.writerow(["ID", "Datum", "Tip", "Miza", "Stranka", "Skupaj", "Status", "Postavke"])
        q = db.query(Order).filter(Order.created_at >= since)
        if branch_id:
            q = q.filter(Order.branch_id == branch_id)
        for o in q.order_by(Order.created_at.desc()).all():
            items = ", ".join(f"{oi.item_name}x{oi.quantity}" for oi in (o.items or []))
            w.writerow([o.id, str(o.created_at), o.order_type, o.table_id or "", o.customer_name or "", o.total or 0, o.status, items])

    elif export_type == "inventory":
        w.writerow(["ID", "Sestavina", "Kategorija", "Zaloga", "Min. zaloga", "Enota", "Cena/enoto", "Vrednost"])
        q = db.query(Ingredient)
        if branch_id:
            q = q.filter(Ingredient.branch_id == branch_id)
        for i in q.order_by(Ingredient.name).all():
            w.writerow([i.id, i.name, i.category, i.stock, i.min_stock, i.unit, i.cost_per_unit, round(i.stock * (i.cost_per_unit or 0), 2)])

    elif export_type == "waste":
        w.writerow(["ID", "Sestavina", "Kolicina", "Strosek", "Vzrok", "Opombe", "Datum"])
        q = db.query(WasteRecord).filter(WasteRecord.created_at >= since)
        for r in q.order_by(WasteRecord.created_at.desc()).all():
            ing = db.query(Ingredient).filter(Ingredient.id == r.ingredient_id).first()
            w.writerow([r.id, ing.name if ing else "?", r.quantity, r.cost, r.reason, r.notes or "", str(r.created_at)])

    elif export_type == "labor":
        w.writerow(["ID", "Uporabnik", "Vloga", "Prihod", "Odhod", "Ure", "Urna postavka", "Strosek"])
        q = db.query(EmployeeShift).filter(
            EmployeeShift.clock_in >= since, EmployeeShift.clock_out != None
        )
        if branch_id:
            bu = {u.id for u in db.query(User).filter(User.branch_id == branch_id).all()}
            q = q.filter(EmployeeShift.user_id.in_(bu))
        for s in q.order_by(EmployeeShift.clock_in.desc()).all():
            u = db.query(User).filter(User.id == s.user_id).first()
            hrs = round((s.clock_out - s.clock_in).total_seconds() / 3600, 2) if s.clock_in and s.clock_out else 0
            rate = u.hourly_rate or 10 if u else 10
            w.writerow([s.id, u.full_name if u else f"#{s.user_id}", u.role if u else "",
                        str(s.clock_in), str(s.clock_out), hrs, rate, round(hrs * rate, 2)])

    else:
        raise HTTPException(400, "Invalid export type. Choose: sales, inventory, waste, labor")

    return PlainTextResponse(buf.getvalue(), media_type="text/csv",
                             headers={"Content-Disposition": f"attachment; filename={export_type}_{days}d.csv"})
