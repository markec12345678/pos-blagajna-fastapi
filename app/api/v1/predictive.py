from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.services.predictive_engine import (
    forecast_demand, predict_waste, suggest_staffing,
    predict_revenue, auto_reorder_suggestions
)
from pydantic import BaseModel
from typing import Optional
from datetime import date

router = APIRouter(prefix="/predictive", tags=["predictive"])


@router.get("/demand-forecast")
def demand_forecast(days_ahead: int = 7, branch_id: int = 0, db: Session = Depends(get_db)):
    return forecast_demand(db, branch_id, days_ahead)


@router.get("/waste-prediction")
def waste_prediction(days_ahead: int = 7, branch_id: int = 0, db: Session = Depends(get_db)):
    return predict_waste(db, branch_id, days_ahead)


@router.get("/staffing-suggestion")
def staffing_suggestion(target_date: Optional[str] = None, branch_id: int = 0, db: Session = Depends(get_db)):
    d = date.fromisoformat(target_date) if target_date else None
    return suggest_staffing(db, branch_id, d)


@router.get("/revenue-prediction")
def revenue_prediction(branch_id: int = 0, db: Session = Depends(get_db)):
    return predict_revenue(db, branch_id)


@router.get("/auto-reorder")
def auto_reorder(branch_id: int = 0, db: Session = Depends(get_db)):
    return auto_reorder_suggestions(db, branch_id)


@router.get("/summary")
def predictive_summary(db: Session = Depends(get_db)):
    forecast = forecast_demand(db, days_ahead=7)
    waste = predict_waste(db, days_ahead=7)
    revenue = predict_revenue(db)
    reorder = auto_reorder_suggestions(db)

    return {
        "forecast_7d": forecast,
        "waste_warnings": len([w for w in waste if w["urgency"] in ("critical", "warning")]),
        "waste_total_cost_at_risk": round(sum(w["cost_at_risk"] for w in waste), 2),
        "revenue_prediction": revenue.get("forecast", 0),
        "revenue_growth": revenue.get("growth_vs_last_month", 0),
        "reorder_needed": len(reorder),
        "reorder_urgent": len([r for r in reorder if r["urgency"] == "critical"]),
        "confidence": forecast.get("confidence", 0)
    }
