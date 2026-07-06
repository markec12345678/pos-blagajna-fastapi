from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.budget import Budget
from app.models.order import Order, OrderItem
from app.models.payment import Payment
from app.models.shift import EmployeeShift
from app.models.user import User
from app.models.menu_item import MenuItem
from app.models.inventory import RecipeItem, Ingredient
from app.models.expense import Expense
from app.models.settings import Setting
from datetime import datetime, timedelta, date
from sqlalchemy import func

router = APIRouter(prefix="/budgets", tags=["budgets"])

BUDGET_CATEGORIES = ["revenue", "cogs", "labor", "expenses", "net_profit"]
CAT_LABELS = {"revenue": "Prihodki", "cogs": "Stroški živil", "labor": "Stroški dela", "expenses": "Operativni stroški", "net_profit": "Čisti dobiček"}

@router.post("")
def create_budget(data: dict, db: Session = Depends(get_db)):
    b = Budget(month=data["month"], year=data["year"], category=data["category"], amount=float(data["amount"]), notes=data.get("notes", ""), created_by=data.get("created_by"))
    db.add(b); db.commit(); db.refresh(b)
    return {"id": b.id, "month": b.month, "year": b.year, "category": b.category, "amount": b.amount}

@router.get("")
def list_budgets(year: int = 0, month: int = 0, db: Session = Depends(get_db)):
    q = db.query(Budget)
    if year: q = q.filter(Budget.year == year)
    if month: q = q.filter(Budget.month == month)
    return [{"id": b.id, "month": b.month, "year": b.year, "category": b.category, "amount": b.amount, "notes": b.notes, "created_at": str(b.created_at)} for b in q.order_by(Budget.year, Budget.month).all()]

@router.put("/{budget_id}")
def update_budget(budget_id: int, data: dict, db: Session = Depends(get_db)):
    b = db.query(Budget).filter(Budget.id == budget_id).first()
    if not b: raise HTTPException(404, "Budget not found")
    for k in ("month", "year", "category", "amount", "notes"):
        if k in data: setattr(b, k, data[k])
    db.commit()
    return {"ok": True}

@router.delete("/{budget_id}")
def delete_budget(budget_id: int, db: Session = Depends(get_db)):
    b = db.query(Budget).filter(Budget.id == budget_id).first()
    if not b: raise HTTPException(404, "Budget not found")
    db.delete(b); db.commit()
    return {"ok": True}

@router.get("/actual-vs-budget")
def actual_vs_budget(year: int = 0, month: int = 0, db: Session = Depends(get_db)):
    now = datetime.now()
    y = year or now.year
    m = month or now.month

    # Get start/end of month
    dt_start = datetime(y, m, 1)
    if m == 12:
        dt_end = datetime(y + 1, 1, 1)
    else:
        dt_end = datetime(y, m + 1, 1)

    # Revenue
    rev_q = db.query(func.coalesce(func.sum(Payment.amount), 0)).filter(
        Payment.created_at >= dt_start, Payment.created_at < dt_end
    )
    revenue = round(float(rev_q.scalar()), 2)

    # COGS
    items_q = db.query(OrderItem).join(Order).filter(
        Order.closed_at >= dt_start, Order.closed_at < dt_end,
        Order.status == "closed"
    ).all()
    cogs = 0
    menu_item_ids = set()
    recipe_cache = {}
    recipe_rows = db.query(RecipeItem).all()
    for r in recipe_rows:
        recipe_cache.setdefault(r.menu_item_id, []).append(r)
    cost_rows = db.query(
        RecipeItem.menu_item_id,
        (RecipeItem.quantity * Ingredient.cost_per_unit).label("cost")
    ).join(Ingredient, RecipeItem.ingredient_id == Ingredient.id).filter(
        Ingredient.cost_per_unit > 0
    ).all()
    item_cost_map = {}
    for row in cost_rows:
        item_cost_map[row.menu_item_id] = item_cost_map.get(row.menu_item_id, 0) + float(row.cost)
    for oi in items_q:
        cogs += item_cost_map.get(oi.menu_item_id, 0) * (oi.quantity or 0)
    cogs = round(cogs, 2)

    # Labor
    sq = db.query(EmployeeShift).filter(
        EmployeeShift.clock_in >= dt_start, EmployeeShift.clock_in < dt_end,
        EmployeeShift.clock_out != None
    ).all()
    secs = sum(int((s.clock_out - s.clock_in).total_seconds()) for s in sq if s.clock_in and s.clock_out)
    labor_hours = round(secs / 3600, 1)
    wage_setting = db.query(func.max(func.nullif(Setting.value, ''))).filter(Setting.key == 'hourly_wage').scalar()
    hourly_wage = float(wage_setting) if wage_setting else 10
    labor_cost = round(labor_hours * hourly_wage, 2)

    # Operating expenses
    op_sum = db.query(func.coalesce(func.sum(Expense.amount), 0)).filter(
        Expense.expense_date >= dt_start.date(), Expense.expense_date < dt_end.date()
    ).scalar()
    operating_expenses = round(float(op_sum), 2)

    net_profit = round(revenue - cogs - labor_cost - operating_expenses, 2)

    # Budgets
    budgets = db.query(Budget).filter(Budget.year == y, Budget.month == m).all()
    budget_map = {b.category: b.amount for b in budgets}

    actuals = {
        "revenue": revenue, "cogs": cogs, "labor": labor_cost,
        "expenses": operating_expenses, "net_profit": net_profit
    }

    results = []
    for cat in BUDGET_CATEGORIES:
        budgeted = budget_map.get(cat)
        actual = actuals[cat]
        pct = round((actual / budgeted) * 100, 1) if budgeted and budgeted > 0 else None
        diff = round(actual - budgeted, 2) if budgeted else None
        is_favorable = None
        if diff is not None:
            if cat in ("revenue", "net_profit"):
                is_favorable = diff >= 0
            else:
                is_favorable = diff <= 0
        results.append({
            "category": cat, "label": CAT_LABELS.get(cat, cat),
            "budgeted": budgeted, "actual": actual,
            "pct": pct, "diff": diff, "favorable": is_favorable
        })

    return {"data": results, "year": y, "month": m, "month_name": ["Januar","Februar","Marec","April","Maj","Junij","Julij","Avgust","September","Oktober","November","December"][m-1]}

@router.get("/available-months")
def available_months(db: Session = Depends(get_db)):
    rows = db.query(Budget.year, Budget.month).distinct().order_by(Budget.year.desc(), Budget.month.desc()).all()
    return [{"year": r.year, "month": r.month} for r in rows]


@router.get("/alerts")
def budget_alerts(db: Session = Depends(get_db)):
    now = datetime.now()
    alerts = []
    for offset in range(2):  # current month and next month
        mo = now.month + offset
        yr = now.year
        if mo > 12:
            mo -= 12
            yr += 1
        dt_start = datetime(yr, mo, 1)
        if mo == 12:
            dt_end = datetime(yr + 1, 1, 1)
        else:
            dt_end = datetime(yr, mo + 1, 1)

        budgets = db.query(Budget).filter(Budget.year == yr, Budget.month == mo).all()
        if not budgets:
            continue
        budget_map = {b.category: b.amount for b in budgets}

        # Actuals for this period
        rev = round(float(db.query(func.coalesce(func.sum(Payment.amount), 0)).filter(Payment.created_at >= dt_start, Payment.created_at < dt_end).scalar()), 2)

        oi = db.query(OrderItem).join(Order).filter(Order.closed_at >= dt_start, Order.closed_at < dt_end, Order.status == "closed").all()
        cost_rows = db.query(RecipeItem.menu_item_id, func.sum(RecipeItem.quantity * Ingredient.cost_per_unit).label('cost')).join(Ingredient).filter(Ingredient.cost_per_unit > 0).group_by(RecipeItem.menu_item_id).all()
        item_cost = {r.menu_item_id: float(r.cost) for r in cost_rows}
        cogs = round(sum(item_cost.get(oi.menu_item_id, 0) * (oi.quantity or 0) for oi in oi), 2)

        sq = db.query(EmployeeShift).filter(EmployeeShift.clock_in >= dt_start, EmployeeShift.clock_in < dt_end, EmployeeShift.clock_out != None).all()
        secs = sum(int((s.clock_out - s.clock_in).total_seconds()) for s in sq if s.clock_in and s.clock_out)
        wage = float(db.query(func.max(func.nullif(Setting.value, ''))).filter(Setting.key == 'hourly_wage').scalar() or 10)
        labor = round(secs / 3600 * wage, 2)

        op_ex = round(float(db.query(func.coalesce(func.sum(Expense.amount), 0)).filter(Expense.expense_date >= dt_start.date(), Expense.expense_date < dt_end.date()).scalar()), 2)
        np = round(rev - cogs - labor - op_ex, 2)

        actuals = {"revenue": rev, "cogs": cogs, "labor": labor, "expenses": op_ex, "net_profit": np}

        for cat in BUDGET_CATEGORIES:
            budgeted = budget_map.get(cat)
            if not budgeted or budgeted <= 0:
                continue
            actual = actuals[cat]
            pct = round((actual / budgeted) * 100, 1)
            days_into_month = (now - dt_start).days + 1
            month_days = (dt_end - dt_start).days
            expected_pct = round((days_into_month / month_days) * 100, 1)
            diff = round(actual - budgeted, 2)

            is_critical = pct >= 100
            is_warning = pct >= 80 and not is_critical
            is_ahead = pct < expected_pct - 10 and cat in ("revenue", "net_profit")
            is_behind = pct < expected_pct - 15 and cat in ("cogs", "labor", "expenses")

            if is_critical or is_warning or is_ahead or is_behind:
                alerts.append({
                    "year": yr, "month": mo,
                    "month_name": ["Januar","Februar","Marec","April","Maj","Junij","Julij","Avgust","September","Oktober","November","December"][mo-1],
                    "category": cat, "label": CAT_LABELS.get(cat, cat),
                    "budgeted": budgeted, "actual": actual, "pct": pct,
                    "expected_pct": expected_pct, "diff": diff,
                    "level": "critical" if is_critical else "warning" if is_warning else "info" if is_ahead or is_behind else "ok"
                })

    return {"alerts": alerts, "count": len(alerts)}
