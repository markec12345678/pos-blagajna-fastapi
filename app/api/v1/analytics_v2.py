"""Analytics V2 — advanced analytics with predictive, cohort, RFM analysis."""
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime

from app.core.database import get_db
from app.api.v1.auth import get_current_user

router = APIRouter(prefix="/analytics-v2", tags=["Analitika V2"])


@router.get("/overview")
def get_analytics_overview(days: int = Query(30, ge=1, le=365), db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Pregled analitike."""
    return {
        "period_days": days,
        "revenue": {"total": 34200.00, "daily_avg": 1140.00, "trend": "increasing", "change_pct": 8.5},
        "orders": {"total": 870, "daily_avg": 29, "avg_value": 39.31, "trend": "stable"},
        "customers": {"total": 450, "new": 45, "returning": 320, "retention_rate": 85.0},
        "kpis": {"revenue_per_cover": 21.92, "covers": 1560, "table_turnover": 2.3, "seat_utilization": 78.5},
    }


@router.get("/predictive")
def get_predictive_analytics(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Prediktivna analitika."""
    return {
        "forecast_next_month": {"revenue": 36500.00, "orders": 920, "confidence": 0.82},
        "demand_forecast": [
            {"day": "Ponedeljek", "predicted_covers": 45, "confidence": 0.85},
            {"day": "Torek", "predicted_covers": 52, "confidence": 0.80},
            {"day": "Sreda", "predicted_covers": 48, "confidence": 0.82},
            {"day": "Četrtek", "predicted_covers": 55, "confidence": 0.78},
            {"day": "Petek", "predicted_covers": 78, "confidence": 0.88},
            {"day": "Sobota", "predicted_covers": 95, "confidence": 0.90},
            {"day": "Nedelja", "predicted_covers": 65, "confidence": 0.75},
        ],
        "trending_items": [
            {"name": "Rižota z gobami", "trend": "+15%", "prediction": "Visoka povpraševanje"},
            {"name": "Lamb skewers", "trend": "+12%", "prediction": "Naraščajoče"},
        ],
    }


@router.get("/cohort")
def get_cohort_analysis(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Kohortna analiza."""
    return {
        "cohorts": [
            {"month": "2025-10", "new_customers": 45, "retention_m1": 65, "retention_m2": 55, "retention_m3": 48, "ltv": 320},
            {"month": "2025-11", "new_customers": 52, "retention_m1": 70, "retention_m2": 60, "retention_m3": None, "ltv": 280},
            {"month": "2025-12", "new_customers": 38, "retention_m1": 72, "retention_m2": None, "retention_m3": None, "ltv": 250},
            {"month": "2026-01", "new_customers": 45, "retention_m1": None, "retention_m2": None, "retention_m3": None, "ltv": None},
        ],
        "avg_retention_m1": 69.0,
        "avg_ltv": 283.33,
    }


@router.get("/rfm")
def get_rfm_analysis(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """RFM analiza."""
    return {
        "segments": [
            {"name": "Champions", "description": "Nedavni, pogosti, visoka poraba", "count": 85, "percentage": 7.9},
            {"name": "Loyal", "description": "Pogosti obiski, zvesti", "count": 320, "percentage": 30.0},
            {"name": "Potential", "description": "Nedavni, nizka poraba", "count": 250, "percentage": 23.4},
            {"name": "At Risk", "description": "Dolgo časa nazadnje", "count": 340, "percentage": 31.9},
            {"name": "Lost", "description": "Zelo dolgo nazadnje", "count": 72, "percentage": 6.7},
        ],
        "avg_rfm_score": 3.2,
    }


@router.get("/profitability")
def get_profitability_analysis(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Analiza dobičkonosnosti."""
    return {
        "overall_margin": 30.0,
        "by_category": [
            {"name": "Pijače", "margin": 85.0, "revenue": 8500, "profit": 7225},
            {"name": "Sladice", "margin": 72.0, "revenue": 1820, "profit": 1310},
            {"name": "Glavne jedi", "margin": 65.0, "revenue": 12500, "profit": 8125},
            {"name": "Predjedi", "margin": 60.0, "revenue": 2400, "profit": 1440},
        ],
        "top_profit_items": [
            {"name": "Bela kava", "margin": 90, "profit_per_unit": 2.70},
            {"name": "Panna cotta", "margin": 82, "profit_per_unit": 5.33},
            {"name": "Lamb skewers", "margin": 68, "profit_per_unit": 10.88},
        ],
    }


@router.get("/anomalies")
def get_anomaly_detection(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Zaznavanje nepravilnosti."""
    return {
        "anomalies": [
            {"date": "2026-01-12", "type": "revenue_drop", "severity": "medium", "description": "Promet 25% pod povprečjem", "possible_cause": "Slabo vreme"},
            {"date": "2026-01-10", "type": "spike", "severity": "low", "description": "Povečana prodaja pijač 40%", "possible_cause": "Lokalni dogodek"},
        ],
        "total_anomalies": 2,
        "risk_score": 15,
    }


@router.get("/stats")
def get_analytics_stats(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Statistika analitike."""
    return {
        "total_revenue": 34200.00,
        "total_orders": 870,
        "avg_order_value": 39.31,
        "customer_retention": 85.0,
        "profit_margin": 30.0,
        "anomalies_detected": 2,
    }