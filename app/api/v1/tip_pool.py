from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, Date
from app.core.database import get_db
from app.models.tip_pool import TipPool, TipDistribution
from app.models.user import User
from app.models.shift import EmployeeShift
from app.models.payment import Payment
from app.models.order import Order
from app.schemas.tip_pool import CreatePool, PayDistributions
from datetime import datetime, date

router = APIRouter(prefix="/tips", tags=["tips"])

ROLE_WEIGHTS = {
    "manager": 1.5,
    "admin": 1.5,
    "cashier": 1.0,
    "staff": 0.8,
    "waiter": 1.0,
    "chef": 1.2,
    "kitchen": 0.9,
    "bartender": 1.0,
}


def get_role_weight(role: str) -> float:
    return ROLE_WEIGHTS.get(role.lower(), 1.0)


@router.get("/pools")
def list_pools(
    branch_id: int = None,
    date_from: str = None,
    date_to: str = None,
    status: str = None,
    db: Session = Depends(get_db),
):
    q = db.query(TipPool)
    if branch_id:
        q = q.filter(TipPool.branch_id == branch_id)
    if date_from:
        q = q.filter(TipPool.date >= datetime.strptime(date_from, "%Y-%m-%d").date())
    if date_to:
        q = q.filter(TipPool.date <= datetime.strptime(date_to, "%Y-%m-%d").date())
    if status:
        q = q.filter(TipPool.status == status)
    pools = q.order_by(TipPool.date.desc()).all()
    return [
        {
            "id": p.id,
            "date": str(p.date),
            "branch_id": p.branch_id,
            "total_tips": p.total_tips,
            "method": p.method,
            "status": p.status,
            "distributions_count": len(p.distributions),
            "created_at": str(p.created_at),
            "distributed_at": str(p.distributed_at) if p.distributed_at else None,
        }
        for p in pools
    ]


@router.post("/pools")
def create_pool(data: CreatePool, db: Session = Depends(get_db)):
    pool_date_str = data.date or str(date.today())
    pool_date = datetime.strptime(pool_date_str, "%Y-%m-%d").date()
    branch_id = data.branch_id
    method = data.method

    existing = db.query(TipPool).filter(
        TipPool.date == pool_date,
        TipPool.branch_id == branch_id,
        TipPool.status == "open",
    ).first()
    if existing:
        raise HTTPException(400, "Open pool already exists for this date/branch")

    start = datetime.combine(pool_date, datetime.min.time())
    end = datetime.combine(pool_date, datetime.max.time())

    tip_sum = (
        db.query(func.coalesce(func.sum(Payment.tip), 0))
        .join(Order)
        .filter(
            Order.branch_id == branch_id if branch_id else True,
            Payment.created_at >= start,
            Payment.created_at <= end,
        )
        .scalar()
    )

    pool = TipPool(
        date=pool_date,
        branch_id=branch_id,
        total_tips=float(tip_sum),
        method=method,
        status="open",
    )
    db.add(pool)

    shifts = (
        db.query(
            EmployeeShift.user_id,
            func.sum(
                func.julianday(func.coalesce(EmployeeShift.clock_out, datetime.now()))
                - func.julianday(EmployeeShift.clock_in)
            ) * 24,
        )
        .filter(
            func.date(EmployeeShift.clock_in) == pool_date,
            EmployeeShift.status == "completed",
        )
        .group_by(EmployeeShift.user_id)
        .all()
    )

    total_weighted_hours = 0
    user_data = []
    for uid, hours in shifts:
        if hours is None or hours <= 0:
            continue
        user = db.query(User).filter(User.id == uid).first()
        if not user or not user.is_active:
            continue
        weight = get_role_weight(user.role)
        weighted = hours * weight
        total_weighted_hours += weighted
        user_data.append({"user_id": uid, "hours": hours, "weight": weight, "weighted_hours": weighted})

    if total_weighted_hours > 0 and pool.total_tips > 0:
        for ud in user_data:
            share = pool.total_tips * (ud["weighted_hours"] / total_weighted_hours)
            dist = TipDistribution(
                pool_id=pool.id,
                user_id=ud["user_id"],
                amount=round(share, 2),
                hours_worked=round(ud["hours"], 2),
                role_weight=ud["weight"],
            )
            db.add(dist)

    db.commit()
    db.refresh(pool)
    return {
        "id": pool.id,
        "date": str(pool.date),
        "total_tips": pool.total_tips,
        "method": pool.method,
        "status": pool.status,
        "staff_count": len(user_data),
    }


@router.get("/pools/{pool_id}")
def get_pool(pool_id: int, db: Session = Depends(get_db)):
    pool = db.query(TipPool).filter(TipPool.id == pool_id).first()
    if not pool:
        raise HTTPException(404, "Pool not found")
    dists = []
    for d in pool.distributions:
        user = db.query(User).filter(User.id == d.user_id).first()
        dists.append({
            "id": d.id,
            "user_id": d.user_id,
            "user_name": user.full_name if user else "Unknown",
            "user_role": user.role if user else "",
            "amount": d.amount,
            "hours_worked": d.hours_worked,
            "role_weight": d.role_weight,
            "paid": d.paid,
            "paid_at": str(d.paid_at) if d.paid_at else None,
        })
    return {
        "id": pool.id,
        "date": str(pool.date),
        "branch_id": pool.branch_id,
        "total_tips": pool.total_tips,
        "method": pool.method,
        "status": pool.status,
        "notes": pool.notes,
        "created_at": str(pool.created_at),
        "distributed_at": str(pool.distributed_at) if pool.distributed_at else None,
        "distributions": dists,
    }


@router.post("/pools/{pool_id}/distribute")
def distribute_pool(pool_id: int, db: Session = Depends(get_db)):
    pool = db.query(TipPool).filter(TipPool.id == pool_id).first()
    if not pool:
        raise HTTPException(404, "Pool not found")
    if pool.status != "open":
        raise HTTPException(400, "Pool is already distributed")
    pool.status = "distributed"
    pool.distributed_at = datetime.now()
    db.commit()
    return {"status": "distributed", "pool_id": pool.id}


@router.post("/pools/{pool_id}/pay")
def pay_distributions(pool_id: int, data: PayDistributions = None, db: Session = Depends(get_db)):
    pool = db.query(TipPool).filter(TipPool.id == pool_id).first()
    if not pool:
        raise HTTPException(404, "Pool not found")
    user_ids = data.user_ids if data else None
    q = db.query(TipDistribution).filter(TipDistribution.pool_id == pool_id, TipDistribution.paid == False)
    if user_ids:
        q = q.filter(TipDistribution.user_id.in_(user_ids))
    now = datetime.now()
    for d in q.all():
        d.paid = True
        d.paid_at = now
    db.commit()
    return {"paid": q.count()}
