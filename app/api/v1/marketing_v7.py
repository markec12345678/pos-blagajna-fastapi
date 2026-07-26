from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.v1.auth import get_current_user

router = APIRouter(prefix="/marketing-v7", tags=["marketing-v7"])

@router.get("/influencer-campaigns")
def get_influencer_campaigns(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"campaigns": [
        {"id": 1, "influencer": "FoodieSlo", "platform": "Instagram", "followers": 45000, "campaign": "Poletni meni", "content_type": "Reel", "reach": 18000, "engagement": 8.2, "conversions": 35, "cost": 500, "roi": 700, "status": "completed"},
        {"id": 2, "influencer": "LjubljanaEats", "platform": "Instagram", "followers": 28000, "campaign": "Vinski večer", "content_type": "Story", "reach": 12000, "engagement": 6.5, "conversions": 22, "cost": 350, "roi": 628, "status": "completed"},
        {"id": 3, "influencer": "KuharskiMojster", "platform": "TikTok", "followers": 85000, "campaign": "Kuharski tečaj", "content_type": "Video", "reach": 42000, "engagement": 12.0, "conversions": 58, "cost": 800, "roi": 725, "status": "active"},
    ], "total_reach": 72000, "total_conversions": 115, "avg_roi": 684}

@router.get("/geofencing")
def get_geofencing(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"geofencing": {
        "active_zones": [
            {"name": "Center mesta", "radius_m": 500, "visitors_today": 85, "conversions": 12, "conversion_rate": 14.1, "spend": 45},
            {"name": "Poslovna cona", "radius_m": 300, "visitors_today": 42, "conversions": 8, "conversion_rate": 19.0, "spend": 30},
            {"name": "Turistična cona", "radius_m": 800, "visitors_today": 120, "conversions": 18, "conversion_rate": 15.0, "spend": 60},
        ],
        "total_impressions": 15000,
        "total_clicks": 450,
        "total_conversions": 38,
        "cost_per_conversion": 3.55
    }}

@router.get("/push-notifications")
def get_push_notifications(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"notifications": [
        {"id": 1, "title": "Happy Hour začenja!", "body": "15% popust na vse pijače do 16:00", "sent": 450, "opened": 180, "clicked": 45, "conversion": 18, "open_rate": 40.0, "scheduled": "2025-07-15 14:00"},
        {"id": 2, "title": "Vaš rojstni dan!", "body": "Darilo: Brezplačen desert ob naslednjem obisku", "sent": 25, "opened": 22, "clicked": 18, "conversion": 15, "open_rate": 88.0, "scheduled": "Automated"},
        {"id": 3, "title": "Novi poletni koktajli!", "body": "Odkrijte 5 novih osvežilnih koktajlov", "sent": 380, "opened": 114, "clicked": 34, "conversion": 12, "open_rate": 30.0, "scheduled": "2025-07-10 10:00"},
    ], "total_sent": 855, "avg_open_rate": 52.9}

@router.get("/loyalty-scoring")
def get_loyalty_scoring(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"scoring": {
        "model": "RFM + Engagement",
        "segments": [
            {"segment": "Champions", "count": 35, "score_range": "90-100", "characteristics": "Visoka pogostost, visoka poraba, aktivni", "marketing": "VIP nagrade, ekskluzivni dogodki"},
            {"segment": "Loyal Customers", "count": 85, "score_range": "70-89", "characteristics": "Redni obiski, srednja poraba", "marketing": "Osebne ponudbe, zgodnji dostop"},
            {"segment": "Potential Loyalists", "count": 65, "score_range": "50-69", "characteristics": "Nedavni obiski, naraščajoča poraba", "marketing": "Spodbude za ponovitev, programi zvestobe"},
            {"segment": "At Risk", "count": 25, "score_range": "30-49", "characteristics": "Padajoča aktivnost", "marketing": "Reaktivacijske kampanje, popusti"},
            {"segment": "Lost", "count": 15, "score_range": "0-29", "characteristics": "Ni obiska 90+ dni", "marketing": "Zadnja priložnost, veliki popusti"},
        ],
        "accuracy": 87.5
    }}

@router.get("/ab-test-advanced")
def get_ab_test_advanced(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"tests": [
        {"id": 1, "name": "Barva CTA gumba", "variants": [
            {"name": "Rdeča", "conversions": 45, "visitors": 500, "rate": 9.0},
            {"name": "Zelena", "conversions": 62, "visitors": 500, "rate": 12.4},
        ], "winner": "Zelena", "confidence": 95, "lift": 37.8, "status": "completed"},
        {"id": 2, "name": "Naslov emaila", "variants": [
            {"name": "Splošen", "open_rate": 38.0},
            {"name": "Personaliziran", "open_rate": 46.0},
            {"name": "Urgentnost", "open_rate": 42.0},
        ], "winner": "Personaliziran", "confidence": 92, "lift": 21.1, "status": "completed"},
        {"id": 3, "name": "Cena na strani", "variants": [
            {"name": "Brez popusta", "conversion": 4.2},
            {"name": "Prečrtana cena", "conversion": 6.8},
            {"name": "% popust", "conversion": 7.5},
        ], "winner": null, "confidence": 78, "lift": null, "status": "running"},
    ]}

@router.get("/conversion-funnel")
def get_conversion_funnel(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"funnel": [
        {"stage": "Doseg", "count": 15000, "percentage": 100},
        {"stage": "Obisk spletne strani", "count": 3200, "percentage": 21.3},
        {"stage": " Ogled menija", "count": 1800, "percentage": 12.0},
        {"stage": "Rezervacija/Naročilo", "count": 450, "percentage": 3.0},
        {"stage": "Obisk", "count": 380, "percentage": 2.53},
        {"stage": "Ponoven obisk", "count": 185, "percentage": 1.23},
    ], "overall_conversion": 2.53, "biggest_drop": "Doseg -> Obisk spletne strani"}

@router.get("/seasonal-marketing")
def get_seasonal_marketing(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"seasonal": {
        "current_campaign": "Poletje 2025",
        "channels": [
            {"channel": "Instagram", "budget": 500, "spent": 320, "reach": 12000, "conversions": 45, "roi": 562},
            {"channel": "Google Ads", "budget": 800, "spent": 650, "reach": 18000, "conversions": 62, "roi": 477},
            {"channel": "Facebook", "budget": 300, "spent": 180, "reach": 8000, "conversions": 28, "roi": 389},
            {"channel": "Email", "budget": 100, "spent": 50, "reach": 2200, "conversions": 35, "roi": 1400},
        ],
        "total_budget": 1700,
        "total_spent": 1200,
        "total_revenue": 8500,
        "overall_roi": 608
    }}
