from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.rating import Rating
from app.schemas.rating import RatingSubmit
from datetime import datetime, timedelta

router = APIRouter(prefix="/ratings", tags=["ratings"])


@router.post("/public")
def submit_rating(data: RatingSubmit, db: Session = Depends(get_db)):
    r = Rating(
        order_id=data.order_id,
        branch_id=data.branch_id,
        customer_name=data.customer_name,
        score=data.score,
        food_quality=data.food_quality,
        service_quality=data.service_quality,
        ambiance=data.ambiance,
        comment=data.comment.strip() if data.comment else None,
    )
    db.add(r)
    db.commit()
    return {"ok": True, "id": r.id}


@router.get("")
def list_ratings(days: int = 30, db: Session = Depends(get_db)):
    cutoff = datetime.now() - timedelta(days=days)
    ratings = db.query(Rating).filter(Rating.created_at >= cutoff).order_by(Rating.created_at.desc()).all()
    total = len(ratings)
    avg = round(sum(r.score for r in ratings) / total, 1) if total else 0
    distribution = {i: sum(1 for r in ratings if r.score == i) for i in range(1, 6)}
    food = [r for r in ratings if r.food_quality]
    svc = [r for r in ratings if r.service_quality]
    amb = [r for r in ratings if r.ambiance]
    return {
        "total": total,
        "average": avg,
        "distribution": distribution,
        "avg_food": round(sum(r.food_quality for r in food) / len(food), 1) if food else 0,
        "avg_service": round(sum(r.service_quality for r in svc) / len(svc), 1) if svc else 0,
        "avg_ambiance": round(sum(r.ambiance for r in amb) / len(amb), 1) if amb else 0,
        "recent": [{"id": r.id, "customer_name": r.customer_name, "score": r.score, "comment": r.comment, "created_at": r.created_at.isoformat() if r.created_at else None} for r in ratings[:20]],
    }
