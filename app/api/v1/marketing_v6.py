from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.v1.auth import get_current_user

router = APIRouter(prefix="/marketing-v6", tags=["marketing-v6"])

@router.get("/ab-tests")
def get_ab_tests(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"tests": [
        {"id": 1, "name": "Email predlog naslova", "variant_a": {"name": "Original", "open_rate": 38.2, "click_rate": 12.5}, "variant_b": {"name": "Personaliziran", "open_rate": 45.8, "click_rate": 18.3}, "status": "completed", "winner": "B", "confidence": 95},
        {"id": 2, "name": "Popust SMS", "variant_a": {"name": "10% popust", "conversion": 15.2}, "variant_b": {"name": "Brezplačna dostava", "conversion": 22.1}, "status": "running", "winner": null, "confidence": 78},
        {"id": 3, "name": "CTA gumb", "variant_a": {"name": "Naroči zdaj", "click_rate": 8.5}, "variant_b": {"name": "Rezerviraj mizo", "click_rate": 11.2}, "status": "completed", "winner": "B", "confidence": 92},
    ], "total_tests": 3, "completed": 2, "running": 1}

@router.get("/social-media")
def get_social_media(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"social": {
        "followers": {"instagram": 2850, "facebook": 4200, "tiktok": 1200},
        "engagement": {"instagram": 4.2, "facebook": 2.8, "tiktok": 6.5},
        "posts_this_month": 24,
        "top_post": {"platform": "Instagram", "content": "Poletna terasa 🌿", "likes": 342, "comments": 28, "shares": 15},
        "recent_posts": [
            {"date": "2025-07-01", "platform": "Instagram", "content": "Novi meni 🍽️", "likes": 285, "reach": 1850},
            {"date": "2025-07-05", "platform": "Facebook", "content": "Dogodek: Večer s šefom", "likes": 198, "reach": 3200},
            {"date": "2025-07-08", "platform": "TikTok", "content": "Kuharski video 🎬", "likes": 520, "reach": 8500},
        ]
    }}

@router.get("/email-campaigns")
def get_email_campaigns(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"campaigns": [
        {"id": 1, "name": "Tedenski newsletter", "sent": 1200, "opened": 504, "clicked": 132, "unsubscribed": 8, "open_rate": 42.0, "click_rate": 11.0, "status": "active"},
        {"id": 2, "name": "Poletna ponudba", "sent": 800, "opened": 368, "clicked": 96, "unsubscribed": 3, "open_rate": 46.0, "click_rate": 12.0, "status": "sent"},
        {"id": 3, "name": "Rojstni dan", "sent": 120, "opened": 96, "clicked": 48, "unsubscribed": 0, "open_rate": 80.0, "click_rate": 40.0, "status": "automated"},
        {"id": 4, "name": "Povratni obisk", "sent": 85, "opened": 51, "clicked": 22, "unsubscribed": 1, "open_rate": 60.0, "click_rate": 25.9, "status": "automated"},
    ], "total_sent": 2205, "avg_open_rate": 44.0, "avg_click_rate": 13.5}

@router.get("/sms-campaigns")
def get_sms_campaigns(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"campaigns": [
        {"id": 1, "name": "Vikend akcija", "sent": 450, "delivered": 442, "clicked": 89, "conversion": 35, "delivery_rate": 98.2, "cost": 22.50},
        {"id": 2, "name": "Dobrodošlica", "sent": 200, "delivered": 198, "clicked": 52, "conversion": 18, "delivery_rate": 99.0, "cost": 10.00},
        {"id": 3, "name": "Spomnjava", "sent": 150, "delivered": 148, "clicked": 30, "conversion": 12, "delivery_rate": 98.7, "cost": 7.50},
    ], "total_sent": 800, "total_cost": 40.00, "avg_conversion_rate": 8.1}

@router.get("/loyalty-integration")
def get_loyalty_integration(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"integration": {
        "active_members": 493,
        "points_issued_this_month": 15000,
        "redemptions_this_month": 12000,
        "revenue_from_loyalty": 18500,
        "loyalty_vs_non_loyalty": {"loyalty_avg": 32.50, "non_loyalty_avg": 22.00, "difference": 47.7},
        "campaign_performance": [
            {"campaign": "Točke za oceno", "members": 85, "revenue": 2800, "roi": 320},
            {"campaign": "Napoti prijatelja", "members": 42, "revenue": 1680, "roi": 400},
        ]
    }}

@router.get("/customer-segments")
def get_customer_segments(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"segments": [
        {"name": "VIP", "count": 45, "avg_spend": 65.00, "visit_freq": 4.2, "channels": ["email", "sms", "instagram"], "retention": 92},
        {"name": "Redni", "count": 120, "avg_spend": 32.00, "visit_freq": 2.8, "channels": ["email", "sms"], "retention": 78},
        {"name": "Novi", "count": 35, "avg_spend": 28.00, "visit_freq": 1.2, "channels": ["email"], "retention": 45},
        {"name": "Tvegani", "count": 18, "avg_spend": 25.00, "visit_freq": 0.5, "channels": ["sms"], "retention": 30},
    ]}

@router.get("/content-calendar")
def get_content_calendar(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"calendar": [
        {"date": "2025-07-07", "platform": "Instagram", "content": "Tedenski special", "type": "post", "status": "scheduled"},
        {"date": "2025-07-08", "platform": "Facebook", "content": "Dogodek: Kuharski tečaj", "type": "event", "status": "draft"},
        {"date": "2025-07-09", "platform": "TikTok", "content": "Behind the scenes", "type": "video", "status": "scheduled"},
        {"date": "2025-07-10", "platform": "Instagram", "content": "Stranka tedna", "type": "story", "status": "idea"},
        {"date": "2025-07-11", "platform": "Email", "content": "Vikend ponudba", "type": "newsletter", "status": "draft"},
        {"date": "2025-07-12", "platform": "SMS", "content": "Vikend akcija", "type": "sms", "status": "scheduled"},
    ], "upcoming": 6, "published_this_month": 24}

@router.get("/attribution")
def get_attribution(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"attribution": [
        {"channel": "Instagram", "reach": 8500, "conversions": 45, "revenue": 1440, "roas": 4.8},
        {"channel": "Facebook", "reach": 12000, "conversions": 38, "revenue": 1216, "roas": 4.0},
        {"channel": "Google Ads", "reach": 15000, "conversions": 62, "revenue": 3100, "roas": 6.2},
        {"channel": "Email", "reach": 2205, "conversions": 28, "revenue": 896, "roas": 8.0},
        {"channel": "SMS", "reach": 800, "conversions": 15, "revenue": 480, "roas": 9.6},
        {"channel": "Organic", "reach": 5000, "conversions": 22, "revenue": 704, "roas": null},
    ], "total_revenue": 7836, "total_ad_spend": 1200}
