from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.v1.auth import get_current_user

router = APIRouter(prefix="/reports-v8", tags=["reports-v8"])

@router.get("/executive-dashboard")
def get_executive_dashboard(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"executive": {
        "revenue": {"today": 2850, "mtd": 42000, "ytd": 252000, "target": 300000, "achievement": 84, "yoy_change": 12.5},
        "profitability": {"gross_margin": 66.5, "net_margin": 18.2, "food_cost": 33.5, "labor_cost": 28.0},
        "customers": {"total": 398, "new_this_month": 35, "retention_rate": 82, "avg_ticket": 28.50, "nps": 72},
        "operations": {"table_turnover": 1.08, "avg_seating_time": 62, "order_accuracy": 94.8, "kitchen_efficiency": 88},
        "highlights": [
            "Prihodki 12.5% nad lanskimi",
            "Novi program zvestobe pritegnil 35 novih strank",
            "Stroški hrane pod ciljem za 1.5%",
            "NPS 72 - najvišje v zadnjem letu",
        ],
        "concerns": [
            "Peter K. - nizka punktualnost",
            "Stroški dela 2% nad proračunom",
            "2 kritični zalogi (testo, olive)",
        ]
    }}

@router.get("/benchmark-comparison")
def get_benchmark_comparison(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"benchmarks": [
        {"metric": "Food Cost %", "our_value": 33.5, "industry_avg": 35.0, "best_in_class": 28.0, "status": "above_avg", "percentile": 65},
        {"metric": "Labor Cost %", "our_value": 28.0, "industry_avg": 30.0, "best_in_class": 25.0, "status": "above_avg", "percentile": 60},
        {"metric": "Revenue/sqft", "our_value": 185, "industry_avg": 160, "best_in_class": 220, "status": "above_avg", "percentile": 70},
        {"metric": "Table Turnover", "our_value": 1.08, "industry_avg": 1.2, "best_in_class": 1.8, "status": "below_avg", "percentile": 40},
        {"metric": "Customer Satisfaction", "our_value": 4.3, "industry_avg": 4.0, "best_in_class": 4.8, "status": "above_avg", "percentile": 75},
        {"metric": "Employee Retention", "our_value": 85, "industry_avg": 75, "best_in_class": 92, "status": "above_avg", "percentile": 70},
    ], "overall_percentile": 63}

@router.get("/profitability-analysis")
def get_profitability_analysis(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"profitability": {
        "by_category": [
            {"category": "Pizza", "revenue": 12000, "cost": 3960, "profit": 8040, "margin": 67.0, "items_sold": 480},
            {"category": "Testenine", "revenue": 8500, "cost": 2805, "profit": 5695, "margin": 67.0, "items_sold": 285},
            {"category": "Meso/Ribe", "revenue": 11000, "cost": 4400, "profit": 6600, "margin": 60.0, "items_sold": 220},
            {"category": "Solate", "revenue": 4500, "cost": 1350, "profit": 3150, "margin": 70.0, "items_sold": 300},
            {"category": "Pijače", "revenue": 6000, "cost": 1800, "profit": 4200, "margin": 70.0, "items_sold": 600},
        ],
        "by_day": [
            {"day": "Pon", "revenue": 2800, "profit": 1820},
            {"day": "Tor", "revenue": 3200, "profit": 2080},
            {"day": "Sre", "revenue": 3500, "profit": 2275},
            {"day": "Čet", "revenue": 3800, "profit": 2470},
            {"day": "Pet", "revenue": 5200, "profit": 3380},
            {"day": "Sob", "revenue": 6500, "profit": 4225},
            {"day": "Ned", "revenue": 4800, "profit": 3120},
        ],
        "total_profit": 19410,
        "total_margin": 65.2
    }}

@router.get("/customer-analytics-report")
def get_customer_analytics_report(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"report": {
        "demographics": {"age_groups": [{"group": "18-25", "pct": 15}, {"group": "26-35", "pct": 30}, {"group": "36-45", "pct": 25}, {"group": "46-55", "pct": 18}, {"group": "55+", "pct": 12}], "gender": {"male": 48, "female": 52}},
        "behavior": {"avg_visits_per_month": 2.3, "avg_ticket": 28.50, "peak_hours": ["12:00-13:00", "19:00-20:00"], "popular_items": ["Pizza Margherita", "Caesar Salad", "Grilled Salmon"]},
        "acquisition": {"channels": [{"channel": "Organic", "pct": 35}, {"channel": "Družbena omrežja", "pct": 25}, {"channel": "Priporočilo", "pct": 20}, {"channel": "Oglaševanje", "pct": 15}, {"channel": "Drugo", "pct": 5}], "cost_per_acquisition": 12.50},
        "retention": {"rate": 82, "avg_lifetime_months": 18, "churn_rate": 7.0, "recovery_rate": 42},
    }}

@router.get("/forecast-vs-actual")
def get_forecast_vs_actual(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"comparison": [
        {"month": "Jan", "forecast": 38000, "actual": 36500, "variance": -1500, "variance_pct": -3.9},
        {"month": "Feb", "forecast": 36000, "actual": 37200, "variance": 1200, "variance_pct": 3.3},
        {"month": "Mar", "forecast": 40000, "actual": 41500, "variance": 1500, "variance_pct": 3.8},
        {"month": "Apr", "forecast": 42000, "actual": 40800, "variance": -1200, "variance_pct": -2.9},
        {"month": "Maj", "forecast": 44000, "actual": 45200, "variance": 1200, "variance_pct": 2.7},
        {"month": "Jun", "forecast": 48000, "actual": 46800, "variance": -1200, "variance_pct": -2.5},
    ], "accuracy": 96.8, "avg_variance": 0.1}
