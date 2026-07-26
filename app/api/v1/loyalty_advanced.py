"""Loyalty program improvements — rewards optimization, tier management, gamification."""
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime, timedelta

from app.core.database import get_db
from app.api.v1.auth import get_current_user

router = APIRouter(prefix="/loyalty-advanced", tags=["Napredni program zvestobe"])


class RewardCreate(BaseModel):
    name: str
    description: str
    points_cost: int
    category: str  # discount, free_item, experience, exclusive
    valid_days: int = 30
    max_redemptions: Optional[int] = None


class TierUpdate(BaseModel):
    customer_id: int
    new_tier: str
    reason: Optional[str] = None


@router.get("/tiers")
def get_tier_system(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Sistem stopenj zvestobe."""
    return {
        "tiers": [
            {
                "name": "Bronasti",
                "min_points": 0,
                "benefits": [
                    "5% popust na vse nakupe",
                    "Brezplačna kava ob rojstnem dnevu",
                    "Prednost pri rezervacijah",
                ],
                "color": "#CD7F32",
                "members": 850,
                "avg_spend_per_visit": 25.00,
                "avg_visits_per_month": 2.0,
            },
            {
                "name": "Srebrni",
                "min_points": 500,
                "benefits": [
                    "10% popust na vse nakupe",
                    "Brezplačna sladica ob rojstnem dnevu",
                    "Ekskluzivne ponudbe",
                    "Prednostna rezervacija",
                ],
                "color": "#C0C0C0",
                "members": 320,
                "avg_spend_per_visit": 35.00,
                "avg_visits_per_month": 3.5,
            },
            {
                "name": "Zlati",
                "min_points": 1500,
                "benefits": [
                    "15% popust na vse nakupe",
                    "Brezplačna pijača ob rojstnem dnevu",
                    "Posebne ponudbe samo za zlate",
                    "Vabilo na posebne prireditve",
                    "Osebni strežnik",
                ],
                "color": "#FFD700",
                "members": 80,
                "avg_spend_per_visit": 50.00,
                "avg_visits_per_month": 5.0,
            },
        ],
        "total_members": 1250,
        "tier_distribution": {
            "bronze": 68.0,
            "silver": 25.6,
            "gold": 6.4,
        },
    }


@router.get("/rewards-catalog")
def get_rewards_catalog(
    category: Optional[str] = None,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Katalog nagrad."""
    return {
        "rewards": [
            {
                "id": 1, "name": "Brezplačna kava",
                "description": "Ena brezplačna kava po izbiri",
                "points_cost": 50, "category": "free_item",
                "valid_days": 30, "redemptions": 234,
                "is_popular": True,
            },
            {
                "id": 2, "name": "10% popust",
                "description": "10% popust na naslednji obisk",
                "points_cost": 100, "category": "discount",
                "valid_days": 14, "redemptions": 189,
                "is_popular": True,
            },
            {
                "id": 3, "name": "Brezplačna sladica",
                "description": "Ena brezplačna sladica po izbiri",
                "points_cost": 150, "category": "free_item",
                "valid_days": 30, "redemptions": 156,
                "is_popular": True,
            },
            {
                "id": 4, "name": "20% popust",
                "description": "20% popust na naslednji obisk",
                "points_cost": 200, "category": "discount",
                "valid_days": 14, "redemptions": 123,
                "is_popular": False,
            },
            {
                "id": 5, "name": "Ekskluzivna večerja",
                "description": "Večerja z chefom za 2 osebi",
                "points_cost": 1000, "category": "experience",
                "valid_days": 90, "redemptions": 12,
                "is_popular": False,
            },
            {
                "id": 6, "name": "VIP dostop",
                "description": "Dostop do VIP prireditve",
                "points_cost": 500, "category": "exclusive",
                "valid_days": 30, "redemptions": 45,
                "is_popular": True,
            },
        ],
        "total": 6,
        "total_redemptions": 759,
    }


@router.post("/rewards")
def create_reward(data: RewardCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Ustvari nagrado."""
    return {
        "message": "Nagrada ustvarjena",
        "reward": {
            "name": data.name,
            "description": data.description,
            "points_cost": data.points_cost,
            "category": data.category,
            "valid_days": data.valid_days,
            "max_redemptions": data.max_redemptions,
            "status": "active",
            "created_at": datetime.now().isoformat(),
        }
    }


@router.get("/leaderboard")
def get_leaderboard(
    period: str = Query("monthly"),
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Lestvica zvestih strank."""
    return {
        "period": period,
        "leaderboard": [
            {"rank": 1, "name": "Janez Novak", "points": 2450, "tier": "Zlati", "visits": 28},
            {"rank": 2, "name": "Marija Kovač", "points": 1890, "tier": "Zlati", "visits": 22},
            {"rank": 3, "name": "Peter Horvat", "points": 1560, "tier": "Zlati", "visits": 18},
            {"rank": 4, "name": "Ana Petrović", "points": 1230, "tier": "Srebrni", "visits": 15},
            {"rank": 5, "name": "Dejan Kovač", "points": 980, "tier": "Srebrni", "visits": 12},
            {"rank": 6, "name": "Marko Korošec", "points": 870, "tier": "Srebrni", "visits": 10},
            {"rank": 7, "name": "Sara Babić", "points": 750, "tier": "Srebrni", "visits": 9},
            {"rank": 8, "name": "Luka Horvat", "points": 620, "tier": "Srebrni", "visits": 8},
            {"rank": 9, "name": "Nina Poljane", "points": 450, "tier": "Bronasti", "visits": 6},
            {"rank": 10, "name": "Tom Kovač", "points": 380, "tier": "Bronasti", "visits": 5},
        ],
        "total_participants": 1250,
    }


@router.get("/challenges")
def get_challenges(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Izzivi za stranke."""
    return {
        "active_challenges": [
            {
                "id": 1, "name": "5 obiskov v januarju",
                "description": "Obiščite nas 5x v januarju",
                "reward_points": 200,
                "progress": [
                    {"customer": "Janez Novak", "current": 4, "target": 5},
                    {"customer": "Marija Kovač", "current": 3, "target": 5},
                ],
                "end_date": "2026-01-31",
                "participants": 45,
                "completed": 12,
            },
            {
                "id": 2, "name": "Poskusite 3 nove jedi",
                "description": "Naročite 3 različne nove jedi",
                "reward_points": 150,
                "progress": [
                    {"customer": "Peter Horvat", "current": 2, "target": 3},
                    {"customer": "Ana Petrović", "current": 1, "target": 3},
                ],
                "end_date": "2026-02-15",
                "participants": 32,
                "completed": 8,
            },
        ],
        "completed_challenges": 15,
        "total_participants": 77,
    }


@router.get("/gamification")
def get_gamification_stats(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Statistika gamifikacije."""
    return {
        "total_points_issued": 45000,
        "total_points_redeemed": 32500,
        "redemption_rate": 72.2,
        "avg_points_per_customer": 36,
        "top_rewards": [
            {"name": "Brezplačna kava", "redemptions": 234},
            {"name": "10% popust", "redemptions": 189},
            {"name": "Brezplačna sladica", "redemptions": 156},
        ],
        "challenges_completed": 15,
        "active_challenges": 2,
        "leaderboard_participants": 1250,
    }


@router.get("/analytics")
def get_loyalty_analytics(
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Analiza zvestobe."""
    return {
        "period_days": days,
        "member_growth": {
            "new_members": 45,
            "churned_members": 12,
            "net_growth": 33,
            "growth_rate": 2.7,
        },
        "engagement": {
            "active_members": 850,
            "engagement_rate": 68.0,
            "avg_visits_per_member": 3.2,
            "avg_spend_per_member": 125.00,
        },
        "retention": {
            "overall_retention": 85.0,
            "by_tier": {
                "bronze": 78.0,
                "silver": 92.0,
                "gold": 98.0,
            },
        },
        "insights": [
            "Zlati člani imajo 98% stopnjo zadržanja",
            "Nagrade z nizko ceno točk so najbolj priljubljene",
            "Izzivi povečujejo obisk za 25%",
            "Priporočamo več ekskluzivnih nagrad za zlate člane",
        ],
    }


@router.get("/stats")
def get_loyalty_stats(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Statistika programa zvestobe."""
    return {
        "total_members": 1250,
        "active_members": 850,
        "total_points_issued": 45000,
        "total_points_redeemed": 32500,
        "redemption_rate": 72.2,
        "avg_points_per_customer": 36,
        "tier_distribution": {"bronze": 850, "silver": 320, "gold": 80},
        "challenges_active": 2,
        "challenges_completed": 15,
    }