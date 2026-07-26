from fastapi import APIRouter
router = APIRouter(prefix="/customers-v4", tags=["Customers V4"])

@router.get("/sentiment")
def sentiment_analysis():
    return {
        "overall_sentiment": 4.2,
        "total_reviews": 342,
        "sentiment_trend": [
            {"month": "Jan", "score": 4.0}, {"month": "Feb", "score": 4.1}, {"month": "Mar", "score": 3.9},
            {"month": "Apr", "score": 4.2}, {"month": "Maj", "score": 4.3}, {"month": "Jun", "score": 4.4},
            {"month": "Jul", "score": 4.2},
        ],
        "topics": [
            {"topic": "Kakovost hrane", "sentiment": 4.5, "mentions": 185, "trend": "up"},
            {"topic": "Storitev", "sentiment": 4.3, "mentions": 142, "trend": "stable"},
            {"topic": "Ambient", "sentiment": 4.1, "mentions": 98, "trend": "up"},
            {"topic": "Cene", "sentiment": 3.6, "mentions": 65, "trend": "down"},
        ],
        "recent_reviews": [
            {"customer": "Janez N.", "rating": 5, "text": "Odličen risotto, priporočam!", "date": "2026-07-15"},
            {"customer": "Ana H.", "rating": 4, "text": "Dobra hrana, malo daljše čakanje.", "date": "2026-07-14"},
        ]
    }

@router.get("/ltv-prediction")
def ltv_prediction():
    return {
        "total_customers": 456,
        "avg_predicted_ltv": 420.00,
        "high_value": {"count": 45, "avg_ltv": 890, "pct_revenue": 42},
        "at_risk": {"count": 32, "avg_ltv": 180, "churn_probability": 65},
        "segments": [
            {"name": "Champions", "count": 42, "predicted_ltv": 1200, "retention": 95},
            {"name": "Loyal", "count": 85, "predicted_ltv": 650, "retention": 82},
            {"name": "Potential", "count": 120, "predicted_ltv": 380, "retention": 65},
            {"name": "At Risk", "count": 35, "predicted_ltv": 150, "retention": 35},
            {"name": "Lost", "count": 18, "predicted_ltv": 50, "retention": 10},
        ]
    }

@router.get("/churn")
def churn_prediction():
    return {
        "churn_rate_monthly": 4.2,
        "customers_at_risk": 32,
        "risk_factors": [
            {"factor": "Nizka pogostost", "count": 18, "weight": 0.35},
            {"factor": "Negativna ocena", "count": 8, "weight": 0.28},
            {"factor": "Dolgo obdobje brez obiska", "count": 6, "weight": 0.37},
        ],
        "prevention_campaigns": [
            {"name": "Win-back email", "target": 15, "conversion_pred": 22, "cost": 45},
            {"name": "Posebna ponudba", "target": 10, "conversion_pred": 35, "cost": 120},
        ]
    }

@router.get("/personalization")
def personalization():
    return {
        "rules_active": 12,
        "personalized_offers_sent": 245,
        "conversion_rate": 18.5,
        "rules": [
            {"name": "VIP prihranek", "trigger": "LTV > 500€", "action": "10% popust", "conversions": 42},
            {"name": "Rođendanski bonus", "trigger": "7 dni pred rojstnim dnem", "action": "Brezplačen dessert", "conversions": 28},
            {"name": "Nazaj po 30 dneh", "trigger": "30 dni neaktivnosti", "action": "15% popust", "conversions": 18},
        ]
    }
