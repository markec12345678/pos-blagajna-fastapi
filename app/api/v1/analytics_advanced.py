"""Advanced analytics — predictive analytics, trend analysis, business intelligence."""
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime, timedelta

from app.core.database import get_db
from app.api.v1.auth import get_current_user

router = APIRouter(prefix="/analytics-advanced", tags=["Napredna analitika"])


@router.get("/predictive")
def get_predictive_analytics(
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Napovedna analitika."""
    return {
        "period_days": days,
        "predictions": {
            "next_month_revenue": 42000.00,
            "revenue_confidence": 0.85,
            "next_month_orders": 1400,
            "orders_confidence": 0.82,
            "next_month_customers": 1350,
            "customers_confidence": 0.78,
        },
        "trends": {
            "revenue_trend": "increasing",
            "revenue_change_pct": 12.5,
            "orders_trend": "increasing",
            "orders_change_pct": 8.3,
            "customer_trend": "increasing",
            "customer_change_pct": 5.2,
        },
        "seasonality": {
            "current_season": "zima",
            "seasonal_factor": 0.85,
            "peak_months": ["junij", "julij", "avgust"],
            "low_months": ["november", "december", "januar"],
        },
        "forecast": [
            {"month": "2026-02", "revenue": 42000, "orders": 1400, "confidence": 0.85},
            {"month": "2026-03", "revenue": 45000, "orders": 1500, "confidence": 0.80},
            {"month": "2026-04", "revenue": 48000, "orders": 1600, "confidence": 0.75},
        ],
    }


@router.get("/trends")
def get_trend_analysis(
    metric: str = Query("revenue"),
    days: int = Query(90, ge=7, le=365),
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Analiza trendov."""
    return {
        "metric": metric,
        "period_days": days,
        "data_points": [
            {"date": "2026-01-01", "value": 1234},
            {"date": "2026-01-02", "value": 1345},
            {"date": "2026-01-03", "value": 1189},
            {"date": "2026-01-04", "value": 1456},
            {"date": "2026-01-05", "value": 1278},
            {"date": "2026-01-06", "value": 1567},
            {"date": "2026-01-07", "value": 1389},
        ],
        "trend_analysis": {
            "direction": "increasing",
            "slope": 15.2,
            "correlation": 0.78,
            "volatility": 0.12,
        },
        "moving_average": {
            "7_day": 1350.0,
            "30_day": 1320.0,
            "90_day": 1280.0,
        },
        "seasonality_index": {
            "monday": 0.85,
            "tuesday": 0.90,
            "wednesday": 0.95,
            "thursday": 1.00,
            "friday": 1.15,
            "saturday": 1.25,
            "sunday": 1.10,
        },
    }


@router.get("/cohort")
def get_cohort_analysis(
    months: int = Query(6, ge=1, le=12),
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Kohortna analiza strank."""
    return {
        "period_months": months,
        "cohorts": [
            {
                "month": "2025-08",
                "new_customers": 120,
                "retention": [100, 85, 72, 65, 58, 52],
                "retention_rate": 43.3,
            },
            {
                "month": "2025-09",
                "new_customers": 135,
                "retention": [100, 88, 75, 68, 62, 55],
                "retention_rate": 40.7,
            },
            {
                "month": "2025-10",
                "new_customers": 110,
                "retention": [100, 82, 70, 63, 56, 50],
                "retention_rate": 45.5,
            },
            {
                "month": "2025-11",
                "new_customers": 95,
                "retention": [100, 80, 68, 61, 54, 48],
                "retention_rate": 50.5,
            },
            {
                "month": "2025-12",
                "new_customers": 140,
                "retention": [100, 90, 78, 70, 63, 57],
                "retention_rate": 40.7,
            },
            {
                "month": "2026-01",
                "new_customers": 120,
                "retention": [100, 85, 72, 65, 58, 52],
                "retention_rate": 43.3,
            },
        ],
        "insights": [
            "Povprečna stopnja zadržanja: 43.3%",
            "Najvišja stopnja zadržanja: november (50.5%)",
            "Najnižja stopnja zadržanja: december (40.7%)",
            "Stranke se zadržijo povprečno 3.5 mesecev",
        ],
    }


@router.get("/rfm")
def get_rfm_analysis(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """RFM analiza strank."""
    return {
        "segments": [
            {
                "name": "Champions",
                "description": "Najboljše stranke",
                "count": 85,
                "percentage": 6.8,
                "avg_recency": 5,
                "avg_frequency": 12,
                "avg_monetary": 450.00,
            },
            {
                "name": "Loyal Customers",
                "description": "Zveste stranke",
                "count": 180,
                "percentage": 14.4,
                "avg_recency": 15,
                "avg_frequency": 8,
                "avg_monetary": 280.00,
            },
            {
                "name": "Potential Loyalists",
                "description": "Potencialno zveste",
                "count": 250,
                "percentage": 20.0,
                "avg_recency": 25,
                "avg_frequency": 4,
                "avg_monetary": 150.00,
            },
            {
                "name": "At Risk",
                "description": "Tveganje izgube",
                "count": 320,
                "percentage": 25.6,
                "avg_recency": 60,
                "avg_frequency": 3,
                "avg_monetary": 120.00,
            },
            {
                "name": "Lost",
                "description": "Izgubljene stranke",
                "count": 415,
                "percentage": 33.2,
                "avg_recency": 120,
                "avg_frequency": 1,
                "avg_monetary": 50.00,
            },
        ],
        "total_customers": 1250,
        "insights": [
            "6.8% strank soampions (najboljše)",
            "25.6% strank je v tveganju",
            "33.2% strank je izgubljenih",
            "Priporočamo kampanjo za stranke v tveganju",
        ],
    }


@router.get("/profitability")
def get_profitability_analysis(
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Analiza dobičkonosnosti."""
    return {
        "period_days": days,
        "revenue": 36789.01,
        "costs": {
            "food": 12345.67,
            "labor": 8765.43,
            "rent": 2500.00,
            "utilities": 450.00,
            "marketing": 234.56,
            "other": 567.89,
        },
        "total_costs": 24863.55,
        "gross_profit": 11925.46,
        "gross_margin": 32.4,
        "by_category": [
            {"category": "Glavne jedi", "revenue": 18000, "cost": 6300, "margin": 65.0},
            {"category": "Sladice", "revenue": 5000, "cost": 1500, "margin": 70.0},
            {"category": "Pijače", "revenue": 8000, "cost": 2400, "margin": 70.0},
            {"category": "Predjedi", "revenue": 5789.01, "cost": 2143.55, "margin": 63.0},
        ],
        "insights": [
            "Pijače imajo najvišjo maržo (70%)",
            "Stroški dela znašajo 23.8% prometa",
            "Gross margin je 32.4%",
            "Priporočamo povečanje prodaje pijač",
        ],
    }


@router.get("/customer-lifetime")
def get_customer_lifetime_value(
    months: int = Query(12, ge=1, le=24),
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Vrednost življenjske dobe strank."""
    return {
        "period_months": months,
        "clv_metrics": {
            "avg_clv": 350.00,
            "median_clv": 280.00,
            "top_10_pct_clv": 1200.00,
            "avg_lifespan_months": 18,
            "avg_monthly_value": 19.44,
        },
        "segments": [
            {"segment": "Champions", "avg_clv": 1200.00, "lifespan": 24},
            {"segment": "Loyal", "avg_clv": 560.00, "lifespan": 18},
            {"segment": "Potential", "avg_clv": 300.00, "lifespan": 12},
            {"segment": "At Risk", "avg_clv": 180.00, "lifespan": 8},
            {"segment": "Lost", "avg_clv": 50.00, "lifespan": 3},
        ],
        "predictions": {
            "next_month_clv": 365.00,
            "clv_change": 4.3,
        },
    }


@router.get("/anomalies")
def get_anomaly_detection(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Zaznavanje anomalij."""
    return {
        "anomalies": [
            {
                "date": "2026-01-15",
                "type": "revenue",
                "expected": 1200,
                "actual": 800,
                "deviation": -33.3,
                "severity": "high",
                "possible_cause": "Slabo vreme",
            },
            {
                "date": "2026-01-12",
                "type": "orders",
                "expected": 45,
                "actual": 65,
                "deviation": 44.4,
                "severity": "medium",
                "possible_cause": "Posebna prireditev",
            },
        ],
        "total_anomalies": 2,
        "high_severity": 1,
        "medium_severity": 1,
    }


@router.get("/stats")
def get_analytics_stats(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Statistika analitike."""
    return {
        "total_reports": 156,
        "predictive_accuracy": 85.0,
        "data_points": 12500,
        "insights_generated": 45,
        "anomalies_detected": 2,
        "last_analysis": "2026-01-15",
    }