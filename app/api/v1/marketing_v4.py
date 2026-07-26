from fastapi import APIRouter
router = APIRouter(prefix="/marketing-v4", tags=["Marketing V4"])

@router.get("/campaigns")
def campaigns():
    return {
        "active": 5,
        "completed": 23,
        "total_sent": 12450,
        "campaigns": [
            {"id": 1, "name": "Poletna ponudba", "type": "email", "status": "active", "sent": 1250, "open_rate": 42.3, "click_rate": 12.8, "conversions": 38},
            {"id": 2, "name": "Rojstnodnevna čestitka", "type": "sms", "status": "active", "sent": 85, "open_rate": 95.2, "click_rate": 28.4, "conversions": 12},
            {"id": 3, "name": "Novi meni", "type": "email", "status": "completed", "sent": 2100, "open_rate": 38.5, "click_rate": 15.2, "conversions": 52},
            {"id": 4, "name": "Zvestoba nagrada", "type": "push", "status": "active", "sent": 450, "open_rate": 52.1, "click_rate": 22.6, "conversions": 28},
        ]
    }

@router.get("/sms")
def sms():
    return {
        "sent_this_month": 850,
        "delivered": 838,
        "delivery_rate": 98.6,
        "cost": 42.50,
        "campaigns": [
            {"name": "Rojstnodnevna", "sent": 85, "delivered": 84, "replies": 12},
            {"name": "Promocija", "sent": 420, "delivered": 415, "replies": 35},
            {"name": "Potrditev", "sent": 345, "delivered": 339, "replies": 0},
        ]
    }

@router.get("/social")
def social():
    return {
        "platforms": [
            {"name": "Instagram", "followers": 2840, "posts": 45, "engagement_rate": 4.2, "reach": 12500, "trend": "up"},
            {"name": "Facebook", "followers": 1920, "posts": 32, "engagement_rate": 2.8, "reach": 8400, "trend": "stable"},
            {"name": "TikTok", "followers": 1560, "posts": 18, "engagement_rate": 6.5, "reach": 24000, "trend": "up"},
        ],
        "total_reach": 44900,
        "avg_engagement": 4.5
    }

@router.get("/influencers")
def influencers():
    return {
        "partners": [
            {"name": "@foodie_slo", "platform": "Instagram", "followers": 45000, "cost": 250, "impressions": 12000, "conversions": 18, "roi": 3.2},
            {"name": "@restavracija_slo", "platform": "TikTok", "followers": 28000, "cost": 180, "impressions": 22000, "conversions": 25, "roi": 4.8},
            {"name": "@chef_marko", "platform": "Instagram", "followers": 15000, "cost": 150, "impressions": 8500, "conversions": 12, "roi": 2.9},
        ],
        "total_spent": 580,
        "total_conversions": 55,
        "avg_roi": 3.6
    }
