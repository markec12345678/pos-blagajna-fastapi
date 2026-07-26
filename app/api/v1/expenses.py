from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.database import get_db
from app.models.expense import Expense
from app.schemas.expense import ExpenseCreate, ExpenseUpdate
from datetime import datetime, timedelta
from app.models.user import User
from app.api.v1.auth import get_current_user

router = APIRouter(prefix="/expenses", tags=["expenses"])

CATEGORIES = ["rent", "utilities", "marketing", "maintenance", "supplies", "insurance", "salaries", "licenses", "software", "other"]
CATEGORY_LABELS = {c: c.capitalize() for c in CATEGORIES}
CATEGORY_LABELS.update({"rent": "Najemnina", "utilities": "Storitve", "marketing": "Marketing",
                         "maintenance": "Vzdrževanje", "supplies": "Material", "insurance": "Zavarovanje",
                         "salaries": "Plače", "licenses": "Licence", "software": "Programska oprema", "other": "Drugo"})


@router.post("")
def create_expense(data: ExpenseCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    exp = Expense(
        name=data.name, amount=float(data.amount),
        category=data.category,
        expense_date=datetime.fromisoformat((data.expense_date or str(datetime.now().date())).split("T")[0]).date(),
        notes=data.notes, branch_id=data.branch_id,
        created_by=data.created_by
    )
    db.add(exp); db.commit(); db.refresh(exp)
    return {"id": exp.id, "name": exp.name, "amount": exp.amount, "category": exp.category}


@router.get("")
def list_expenses(days: int = 30, category: str = "", branch_id: int = 0, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    since = datetime.now() - timedelta(days=days)
    q = db.query(Expense).filter(Expense.created_at >= since)
    if category:
        q = q.filter(Expense.category == category)
    if branch_id:
        q = q.filter(Expense.branch_id == branch_id)
    exps = q.order_by(Expense.expense_date.desc()).all()
    return [{"id": e.id, "name": e.name, "amount": e.amount, "category": e.category,
             "category_label": CATEGORY_LABELS.get(e.category, e.category),
             "expense_date": str(e.expense_date), "notes": e.notes,
             "branch_id": e.branch_id, "created_by": e.created_by, "created_at": str(e.created_at)} for e in exps]


@router.put("/{expense_id}")
def update_expense(expense_id: int, data: ExpenseUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    e = db.query(Expense).filter(Expense.id == expense_id).first()
    if not e:
        raise HTTPException(404, "Expense not found")
    for k in ("name", "amount", "category", "expense_date", "notes"):
        v = getattr(data, k)
        if v is not None:
            if k == "expense_date":
                v = datetime.fromisoformat(v.split("T")[0]).date()
            setattr(e, k, v)
    db.commit()
    return {"ok": True}


@router.delete("/{expense_id}")
def delete_expense(expense_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    e = db.query(Expense).filter(Expense.id == expense_id).first()
    if not e:
        raise HTTPException(404, "Expense not found")
    db.delete(e); db.commit()
    return {"ok": True}


@router.get("/analytics")
def expense_analytics(days: int = 30, branch_id: int = 0, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    since = datetime.now() - timedelta(days=days)
    q = db.query(Expense).filter(Expense.created_at >= since)
    if branch_id:
        q = q.filter(Expense.branch_id == branch_id)
    exps = q.all()
    total = sum(e.amount for e in exps)

    by_cat = {}
    for e in exps:
        by_cat.setdefault(e.category, {"amount": 0, "count": 0, "label": CATEGORY_LABELS.get(e.category, e.category)})
        by_cat[e.category]["amount"] += e.amount
        by_cat[e.category]["count"] += 1

    by_month = {}
    for e in exps:
        mk = str(e.expense_date)[:7]
        by_month[mk] = by_month.get(mk, 0) + e.amount

    return {
        "total": round(total, 2),
        "count": len(exps),
        "by_category": {k: {**v, "amount": round(v["amount"], 2)} for k, v in sorted(by_cat.items(), key=lambda x: x[1]["amount"], reverse=True)},
        "by_month": {k: round(v, 2) for k, v in sorted(by_month.items())},
        "days": days
    }
