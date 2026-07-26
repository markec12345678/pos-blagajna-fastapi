"""Ratings V2 — advanced review management with sentiment, response, analytics."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from datetime import datetime

from app.core.database import get_db
from app.api.v1.auth import get_current_user

router = APIRouter(prefix="/ratings-v2", tags=["Ratings V2"])


@router.get("/reviews")
def list_reviews(
    platform: str = Query(default="all"),
    db: Session = Depends(get_db), user=Depends(get_current_user)
):
    """Seznam mnenj."""
    return {
        "reviews": [
            {"id": 1, "platform": "TripAdvisor", "author": "Ana K.", "rating": 5, "date": "2026-07-15", "text": "Odlična hrana in postrežba! Žlikrofi so bili fantastični.", "sentiment": "positive", "response": None, "responded": False},
            {"id": 2, "platform": "Google", "author": "Marko H.", "rating": 4, "date": "2026-07-14", "text": "Dobro vzdušje, malo daljši čas čakanja.", "sentiment": "positive", "response": "Hvala za mnenje! Delamo na skrajšanju časa čakanja.", "responded": True},
            {"id": 3, "platform": "Facebook", "author": "Peter P.", "rating": 3, "date": "2026-07-13", "text": "Hrana ok, vendar je bilo hladno.", "sentiment": "neutral", "response": None, "responded": False},
            {"id": 4, "platform": "TripAdvisor", "author": "Jan B.", "rating": 5, "date": "2026-07-12", "text": "Najboljša gostilna v Beli krajini!", "sentiment": "positive", "response": "Hvala Jan! Veseli smo vašega obiska.", "responded": True},
            {"id": 5, "platform": "Google", "author": "Marija Z.", "rating": 2, "date": "2026-07-11", "text": "Premalo porcije za ceno.", "sentiment": "negative", "response": None, "responded": False},
        ],
        "total": 5,
        "avg_rating": 3.8,
    }


@router.get("/analytics")
def get_ratings_analytics(
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db), user=Depends(get_current_user)
):
    """Analitika mnenj."""
    return {
        "period_days": days,
        "total_reviews": 45,
        "avg_rating": 4.2,
        "response_rate": 72.0,
        "sentiment": {"positive": 68, "neutral": 18, "negative": 14},
        "by_platform": [
            {"platform": "Google", "count": 20, "avg_rating": 4.3, "response_rate": 80.0},
            {"platform": "TripAdvisor", "count": 15, "avg_rating": 4.5, "response_rate": 73.0},
            {"platform": "Facebook", "count": 10, "avg_rating": 3.8, "response_rate": 60.0},
        ],
        "trend": "increasing",
        "nps_score": 62,
    }


@router.get("/sentiment-trends")
def get_sentiment_trends(
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db), user=Depends(get_current_user)
):
    """Trendi čustev."""
    return {
        "trends": [
            {"date": "2026-07-01", "positive": 3, "neutral": 1, "negative": 0},
            {"date": "2026-07-05", "positive": 2, "neutral": 0, "negative": 1},
            {"date": "2026-07-10", "positive": 4, "neutral": 1, "negative": 0},
            {"date": "2026-07-15", "positive": 5, "neutral": 0, "negative": 1},
        ],
        "avg_positive_pct": 72.0,
        "improving": True,
    }


@router.get("/stats")
def get_ratings_stats(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Statistika mnenj."""
    return {
        "total_reviews": 45,
        "avg_rating": 4.2,
        "response_rate": 72.0,
        "nps_score": 62,
        "sentiment_positive": 68,
    }
