from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.database import get_db
from app.models.rating import Rating
from app.models.settings import Setting
from datetime import datetime, timedelta
import json

router = APIRouter(prefix="/feedback", tags=["feedback"])


@router.get("/analytics")
def feedback_analytics(days: int = 30, db: Session = Depends(get_db)):
    cutoff = datetime.now() - timedelta(days=days)
    ratings = db.query(Rating).filter(Rating.created_at >= cutoff).order_by(Rating.created_at.desc()).all()
    total = len(ratings)

    if total == 0:
        return {
            "total": 0, "average": 0, "sentiment_breakdown": {"positive": 0, "neutral": 0, "negative": 0},
            "trends": [], "top_keywords": [], "response_rate": 0,
            "avg_food": 0, "avg_service": 0, "avg_ambiance": 0,
            "nps_score": 0, "recommendation": "Začnite zbirati ocene za analizo"
        }

    avg = round(sum(r.score for r in ratings) / total, 1)

    positive = sum(1 for r in ratings if r.score >= 4)
    neutral = sum(1 for r in ratings if r.score == 3)
    negative = sum(1 for r in ratings if r.score <= 2)

    promoters = sum(1 for r in ratings if r.score >= 5)
    detractors = sum(1 for r in ratings if r.score <= 2)
    nps = round(((promoters - detractors) / total) * 100) if total > 0 else 0

    food_ratings = [r for r in ratings if r.food_quality]
    service_ratings = [r for r in ratings if r.service_quality]
    ambiance_ratings = [r for r in ratings if r.ambiance]

    comments = [r.comment for r in ratings if r.comment]
    keywords = _extract_keywords(comments)

    trends = _daily_trends(ratings, days)

    weekly_sentiment = _weekly_sentiment(ratings)

    return {
        "total": total,
        "average": avg,
        "sentiment_breakdown": {
            "positive": positive,
            "neutral": neutral,
            "negative": negative,
            "positive_pct": round(positive / total * 100, 1) if total else 0,
            "negative_pct": round(negative / total * 100, 1) if total else 0
        },
        "nps_score": nps,
        "nps_label": "odlično" if nps > 50 else "dobro" if nps > 0 else "slabo",
        "avg_food": round(sum(r.food_quality for r in food_ratings) / len(food_ratings), 1) if food_ratings else 0,
        "avg_service": round(sum(r.service_quality for r in service_ratings) / len(service_ratings), 1) if service_ratings else 0,
        "avg_ambiance": round(sum(r.ambiance for r in ambiance_ratings) / len(ambiance_ratings), 1) if ambiance_ratings else 0,
        "trends": trends,
        "top_keywords": keywords,
        "weekly_sentiment": weekly_sentiment,
        "recent_comments": [
            {"id": r.id, "name": r.customer_name, "score": r.score, "comment": r.comment,
             "sentiment": "positive" if r.score >= 4 else "negative" if r.score <= 2 else "neutral",
             "date": r.created_at.isoformat() if r.created_at else None}
            for r in ratings if r.comment
        ][:20]
    }


@router.get("/trends")
def feedback_trends(days: int = 90, db: Session = Depends(get_db)):
    cutoff = datetime.now() - timedelta(days=days)
    ratings = db.query(Rating).filter(Rating.created_at >= cutoff).order_by(Rating.created_at.asc()).all()
    return _daily_trends(ratings, days)


@router.get("/sentiment/{rating_id}")
def analyze_sentiment(rating_id: int, db: Session = Depends(get_db)):
    r = db.query(Rating).filter(Rating.id == rating_id).first()
    if not r:
        return {"error": "Rating not found"}

    sentiment = "neutral"
    confidence = 0.5
    if r.score >= 4:
        sentiment = "positive"
        confidence = 0.8 if r.score == 5 else 0.6
    elif r.score <= 2:
        sentiment = "negative"
        confidence = 0.8 if r.score == 1 else 0.6

    return {
        "id": r.id, "score": r.score, "sentiment": sentiment,
        "confidence": confidence, "comment": r.comment,
        "suggested_response": _suggest_response(sentiment, r.score)
    }


@router.post("/respond/{rating_id}")
def respond_to_rating(rating_id: int, response: str, db: Session = Depends(get_db)):
    r = db.query(Rating).filter(Rating.id == rating_id).first()
    if not r:
        return {"error": "Rating not found"}
    return {"ok": True, "message": f"Odgovor na oceno #{rating_id} poslan"}


@router.get("/summary")
def feedback_summary(db: Session = Depends(get_db)):
    last_30 = db.query(Rating).filter(Rating.created_at >= datetime.now() - timedelta(days=30)).all()
    prev_30 = db.query(Rating).filter(
        Rating.created_at >= datetime.now() - timedelta(days=60),
        Rating.created_at < datetime.now() - timedelta(days=30)
    ).all()

    current_avg = round(sum(r.score for r in last_30) / len(last_30), 1) if last_30 else 0
    prev_avg = round(sum(r.score for r in prev_30) / len(prev_30), 1) if prev_30 else 0

    return {
        "current_avg": current_avg,
        "prev_avg": prev_avg,
        "change": round(current_avg - prev_avg, 1),
        "total_reviews": len(last_30),
        "trend": "gor" if current_avg > prev_avg else "dol" if current_avg < prev_avg else "enako"
    }


def _extract_keywords(comments: list) -> list:
    word_count = {}
    skip_words = {"je", "in", "na", "za", "se", "so", "to", "bil", "bila", "bilo", "ter", "ali", "pa", "ko", "že", "ker", "mi", "vi", "nam", "vam", "ni", "bilo", "bo", "bi", "bilo"}

    for comment in comments:
        words = comment.lower().split()
        for w in words:
            w = w.strip(".,!?;:'\"()[]{}")
            if len(w) > 3 and w not in skip_words:
                word_count[w] = word_count.get(w, 0) + 1

    sorted_words = sorted(word_count.items(), key=lambda x: x[1], reverse=True)
    return [{"word": w, "count": c} for w, c in sorted_words[:15]]


def _daily_trends(ratings: list, days: int) -> list:
    daily = {}
    for r in ratings:
        if r.created_at:
            day = r.created_at.strftime("%Y-%m-%d")
            if day not in daily:
                daily[day] = {"count": 0, "total_score": 0, "scores": []}
            daily[day]["count"] += 1
            daily[day]["total_score"] += r.score
            daily[day]["scores"].append(r.score)

    trends = []
    for day_str in sorted(daily.keys()):
        d = daily[day_str]
        trends.append({
            "date": day_str,
            "count": d["count"],
            "avg_score": round(d["total_score"] / d["count"], 1) if d["count"] else 0
        })

    return trends


def _weekly_sentiment(ratings: list) -> list:
    weekly = {}
    for r in ratings:
        if r.created_at:
            week = r.created_at.strftime("%Y-W%W")
            if week not in weekly:
                weekly[week] = {"positive": 0, "neutral": 0, "negative": 0, "total": 0}
            weekly[week]["total"] += 1
            if r.score >= 4:
                weekly[week]["positive"] += 1
            elif r.score == 3:
                weekly[week]["neutral"] += 1
            else:
                weekly[week]["negative"] += 1

    return [{"week": k, **v} for k, v in sorted(weekly.items())]


def _suggest_response(sentiment: str, score: int) -> str:
    if sentiment == "positive" and score == 5:
        return "Hvala za odlično oceno! Veseli nas, da ste uživali. Nasvidenje! 🌟"
    if sentiment == "positive":
        return "Hvala za pozitivno oceno! Radi vas vidimo nazaj. 😊"
    if sentiment == "negative" and score <= 2:
        return "Oprostite za slabšo izkušnjo. Radi bi slišali več in izboljšali naše storitve. Prosimo, kontaktirajte nas."
    return "Hvala za povratno informacijo. Vaše mnenje nam pomaga pri izboljšanju."
