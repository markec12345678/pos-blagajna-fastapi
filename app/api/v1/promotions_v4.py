from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.v1.auth import get_current_user

router = APIRouter(prefix="/promotions-v4", tags=["promotions-v4"])

@router.get("/dynamic-pricing")
def get_dynamic_pricing(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"pricing": {
        "current_strategy": "Sezonsko prilagajanje",
        "rules": [
            {"name": "Happy Hour", "condition": "14:00-16:00", "discount": 15, "items": ["Pijače", "Sladice"], "active": True, "revenue_impact": "+€450/teden"},
            {"name": "Predhodna ura", "condition": "17:00-18:00", "discount": 10, "items": ["Vse"], "active": False, "revenue_impact": null},
            {"name": "Deževni dan", "condition": "Dež", "discount": 20, "items": ["Topli obroki"], "active": True, "revenue_impact": "+€320/teden"},
            {"name": "Rođendan", "condition": "Rojstni dan stranke", "discount": 25, "items": ["Vse"], "active": True, "revenue_impact": "+€280/mesec"},
        ],
        "avg_discount_given": 12.5,
        "revenue_from_pricing": 1850
    }}

@router.get("/loyalty-promotions")
def get_loyalty_promotions(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"promotions": [
        {"id": 1, "name": "Dvojne točke", "type": "multiplier", "multiplier": 2, "valid_until": "2025-07-14", "redemptions": 85, "revenue": 2800, "status": "active"},
        {"id": 2, "name": "Brezplačna dostava", "type": "freebie", "min_order": 25, "valid_until": "2025-07-20", "redemptions": 42, "revenue": 1680, "status": "active"},
        {"id": 3, "name": "VIP exclusive", "type": "segment", "segment": "Zlata", "valid_until": "2025-07-31", "redemptions": 12, "revenue": 960, "status": "active"},
    ]}

@router.get("/seasonal-campaigns")
def get_seasonal_campaigns(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"campaigns": [
        {"id": 1, "name": "Poletni meni", "season": "Poletje", "start": "2025-06-01", "end": "2025-08-31", "budget": 1500, "spent": 980, "revenue": 8500, "roi": 566, "status": "active"},
        {"id": 2, "name": "Vinski večeri", "season": "Vse", "start": "2025-07-01", "end": "2025-07-31", "budget": 500, "spent": 280, "revenue": 3200, "roi": 1143, "status": "active"},
        {"id": 3, "name": "Počitniški tečaj", "season": "Poletje", "start": "2025-07-15", "end": "2025-08-15", "budget": 300, "spent": 0, "revenue": 0, "roi": 0, "status": "scheduled"},
    ]}

@router.get("/competitor-analysis")
def get_competitor_analysis(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"competitors": [
        {"name": "Gostilna Pri Hlipu", "distance_km": 2.5, "avg_price": 28.00, "rating": 4.5, "strengths": ["Kakovost mesa", "Vinska karta"], "weaknesses": ["Staromoden ambient", "Počasna postrežba"]},
        {"name": "Restavracija Grad", "distance_km": 5.0, "avg_price": 35.00, "rating": 4.7, "strengths": ["Razgled", "Prestiž"], "weaknesses": ["Visoka cena", "Oddaljenost"]},
        {"name": "Pizzerija Veseljak", "distance_km": 1.0, "avg_price": 12.00, "rating": 4.2, "strengths": ["Cena", "Hitrost"], "weaknesses": ["Omejen meni", "Kakovost"]},
    ], "market_position": "3. najboljša v regiji", "unique_selling_points": ["Lokalne sestavine", "Terasa z razgledom", "Osebna postrežba"]}

@router.get("/referral-tracking")
def get_referral_tracking(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"tracking": {
        "total_referrals": 85,
        "successful_conversions": 42,
        "conversion_rate": 49.4,
        "revenue_from_referrals": 6720,
        "cost_per_referral": 15.00,
        "roi": 527,
        "top_channels": [
            {"channel": "Beseda v uho", "referrals": 35, "conversions": 18, "rate": 51.4},
            {"channel": "Družbena omrežja", "referrals": 28, "conversions": 12, "rate": 42.9},
            {"channel": "Email", "referrals": 22, "conversions": 12, "rate": 54.5},
        ]
    }}

@router.get("/promotion-calendar")
def get_promotion_calendar(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"calendar": [
        {"date": "2025-07-14", "name": "Happy Hour", "type": "redna", "channel": "Vse", "budget": 0, "expected_reach": 200},
        {"date": "2025-07-15", "name": "Poletni cocktail večer", "type": "dogodek", "channel": "Instagram, SMS", "budget": 200, "expected_reach": 800},
        {"date": "2025-07-20", "name": "Nedeljski brunch", "type": "promocija", "channel": "Email, Facebook", "budget": 150, "expected_reach": 600},
        {"date": "2025-07-25", "name": "VIP degustacija", "type": "exclusive", "channel": "Email", "budget": 300, "expected_reach": 45},
        {"date": "2025-08-01", "name": "Počitniški meni", "type": "nova ponudba", "channel": "Vse", "budget": 500, "expected_reach": 2000},
    ], "total_planned": 5, "total_budget": 1150}

@router.get("/promo-roi")
def get_promo_roi(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"roi": [
        {"promotion": "Happy Hour", "cost": 0, "revenue": 3600, "roi": null, "new_customers": 15, "repeat_rate": 68},
        {"promotion": "Poletni meni", "cost": 980, "revenue": 8500, "roi": 867, "new_customers": 42, "repeat_rate": 55},
        {"promotion": "Vinski večeri", "cost": 280, "revenue": 3200, "roi": 1143, "new_customers": 28, "repeat_rate": 72},
        {"promotion": "SMS akcija", "cost": 40, "revenue": 1200, "roi": 3000, "new_customers": 8, "repeat_rate": 45},
    ], "total_cost": 1300, "total_revenue": 16500, "avg_roi": 1269}
