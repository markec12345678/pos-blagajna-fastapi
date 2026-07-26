from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.v1.auth import get_current_user

router = APIRouter(prefix="/loyalty-v3", tags=["loyalty-v3"])

@router.get("/tiers")
def get_tiers(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"tiers": [
        {"name": "Bronasta", "min_points": 0, "max_points": 499, "members": 320, "benefits": ["5% popust na vse", "Brezplačna dostava 1x/mesec", "Rojstni dan darilo"], "color": "#cd7f32"},
        {"name": "Srebrna", "min_points": 500, "max_points": 1499, "members": 120, "benefits": ["10% popust", "Prednostna rezervacija", "Brezplačna sladica 1x/mesec", "Ekskluzivni dogodki"], "color": "#c0c0c0"},
        {"name": "Zlata", "min_points": 1500, "max_points": 4999, "members": 45, "benefits": ["15% popust", "Osebni natakar", "Brezplačna pijača", " VIP mize", "Prednaročilo novitet"], "color": "#ffd700"},
        {"name": "Platinasta", "min_points": 5000, "max_points": null, "members": 8, "benefits": ["20% popust", "Zasebna soba", "Kuharski tečaj", "Letni gourmet dinner", "Osebni darilni paket"], "color": "#e5e4e2"},
    ], "total_members": 493, "total_points_issued": 187500}

@router.get("/rewards-catalog")
def get_rewards_catalog(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"rewards": [
        {"id": 1, "name": "Brezplačna kava", "points": 50, "category": "Pijače", "redemptions": 280, "cost": 1.50},
        {"id": 2, "name": "Sladica gratis", "points": 150, "category": "Sladice", "redemptions": 150, "cost": 5.00},
        {"id": 3, "name": "10% popust", "points": 200, "category": "Popusti", "redemptions": 320, "cost": 0},
        {"id": 4, "name": "Brezplačna glavna jed", "points": 500, "category": "Hrana", "redemptions": 45, "cost": 12.00},
        {"id": 5, "name": "Večerja za 2", "points": 1500, "category": "Doživetja", "redemptions": 12, "cost": 45.00},
        {"id": 6, "name": "Kuharski tečaj", "points": 3000, "category": "Doživetja", "redemptions": 3, "cost": 80.00},
    ], "total_redemptions": 810, "total_cost": 4250}

@router.get("/points-analytics")
def get_points_analytics(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"analytics": {
        "issued_this_month": 15000,
        "redeemed_this_month": 12000,
        "outstanding_balance": 187500,
        "breakage_rate": 18.5,
        "avg_points_per_member": 380,
        "top_earners": [
            {"name": "Janez Novak", "points": 4800, "tier": "Zlata"},
            {"name": "Meta Kranjc", "points": 3200, "tier": "Zlata"},
            {"name": "Peter Semec", "points": 2100, "tier": "Zlata"},
        ],
        "monthly_trend": [
            {"month": "Jan", "issued": 12000, "redeemed": 8000},
            {"month": "Feb", "issued": 11000, "redeemed": 9500},
            {"month": "Mar", "issued": 14000, "redeemed": 11000},
            {"month": "Apr", "issued": 13000, "redeemed": 10000},
            {"month": "Maj", "issued": 15000, "redeemed": 12000},
            {"month": "Jun", "issued": 16000, "redeemed": 13000},
        ]
    }}

@router.get("/gamification")
def get_gamification(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"challenges": [
        {"id": 1, "name": "Tedenski izziv", "description": "Obišči 3x ta teden", "progress": 2, "target": 3, "reward": 100, "expires": "2025-06-30", "participants": 85},
        {"id": 2, "name": "Mesecni maraton", "description": "Zberi 500 točk", "progress": 320, "target": 500, "reward": 500, "expires": "2025-07-31", "participants": 42},
        {"id": 3, "name": "Degustacija", "description": "Poskusi 5 novitet", "progress": 3, "target": 5, "reward": 200, "expires": "2025-08-15", "participants": 28},
    ], "badges": [
        {"name": "Prvi obisk", "icon": "🎉", "holders": 493},
        {"name": "Zvestoba", "icon": "💎", "holders": 120},
        {"name": "Ambasador", "icon": "🌟", "holders": 25},
        {"name": "Gurman", "icon": "🍽️", "holders": 45},
        {"name": "Socijalček", "icon": "👥", "holders": 68},
    ]}

@router.get("/referral-program")
def get_referral_program(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"referrals": {
        "total_referrals": 85,
        "successful_conversions": 42,
        "conversion_rate": 49.4,
        "reward_given": 4200,
        "top_referrers": [
            {"name": "Janez Novak", "referrals": 8, "conversions": 5},
            {"name": "Ana K.", "referrals": 6, "conversions": 4},
            {"name": "Meta Kranjc", "referrals": 5, "conversions": 3},
        ],
        "monthly_trend": [
            {"month": "Jan", "referrals": 10, "conversions": 5},
            {"month": "Feb", "referrals": 12, "conversions": 6},
            {"month": "Mar", "referrals": 15, "conversions": 8},
            {"month": "Apr", "referrals": 14, "conversions": 7},
            {"month": "Maj", "referrals": 18, "conversions": 9},
            {"month": "Jun", "referrals": 16, "conversions": 7},
        ]
    }}

@router.get("/personalization")
def get_personalization(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"insights": [
        {"customer": "Janez Novak", "preferred_items": ["Margherita", "Tiramisu"], "visit_frequency": "3x/teden", "avg_spend": 32.50, "recommendations": ["Poskusi Capricciosa", "Novi letni meni"]},
        {"customer": "Meta Kranjc", "preferred_items": ["Caesar Salad", "Grilled Salmon"], "visit_frequency": "2x/teden", "avg_spend": 28.00, "recommendations": ["Grška solata", "Poletni koktajl"]},
        {"customer": "Peter Semec", "preferred_items": ["Steak", "Pepperoni"], "visit_frequency": "1x/teden", "avg_spend": 45.00, "recommendations": ["Premium selection", "Vinska karta"]},
    ]}

@router.get("/birthday-rewards")
def get_birthday_rewards(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"upcoming": [
        {"name": "Janez Novak", "date": "2025-07-15", "days_until": 15, "tier": "Zlata", "reward": "Brezplačna večerja + vino", "status": "scheduled"},
        {"name": "Ana K.", "date": "2025-07-22", "days_until": 22, "tier": "Srebrna", "reward": "Sladica + kava", "status": "scheduled"},
        {"name": "Peter Semec", "date": "2025-08-01", "days_until": 32, "tier": "Zlata", "reward": "Brezplačna večerja + vino", "status": "pending"},
    ], "sent_this_month": 5, "redeemed_rate": 72.0}
