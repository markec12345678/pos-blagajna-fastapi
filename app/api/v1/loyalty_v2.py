"""Loyalty V2 — advanced loyalty program with tiers, rewards, gamification."""
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime

from app.core.database import get_db
from app.api.v1.auth import get_current_user

router = APIRouter(prefix="/loyalty-v2", tags=["Zvestoba V2"])


@router.get("/tiers")
def get_loyalty_tiers(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Stopnje zvestobe."""
    return {
        "tiers": [
            {"name": "Bronasti", "min_points": 0, "discount": 0, "members": 650, "benefits": ["1 točka za 1 €", "Rojstnodnevni popust 5%"], "color": "#cd7f32"},
            {"name": "Srebrni", "min_points": 1000, "discount": 5, "members": 320, "benefits": ["1.5 točke za 1 €", "5% popust", "Brezplačna kava"], "color": "#94a3b8"},
            {"name": "Zlati", "min_points": 2500, "discount": 10, "members": 85, "benefits": ["2 točki za 1 €", "10% popust", "Brezplačna sladica", "Prednostna rezervacija"], "color": "#f59e0b"},
            {"name": "Platina", "min_points": 5000, "discount": 15, "members": 12, "benefits": ["3 točke za 1 €", "15% popust", "Brezplačna sladica", "Prednostna rezervacija", "Ekskluzivni dogodki"], "color": "#8b5cf6"},
        ],
        "total_members": 1067,
        "total_points_issued": 45000,
        "total_redemptions": 1200,
    }


@router.get("/rewards")
def get_rewards_catalog(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Katalog nagrad."""
    return {
        "rewards": [
            {"id": 1, "name": "Brezplačna kava", "points": 50, "category": "Pijače", "redemptions": 245, "stock": 999},
            {"id": 2, "name": "Brezplačna sladica", "points": 100, "category": "Sladice", "redemptions": 180, "stock": 999},
            {"id": 3, "name": "10% popust na naslednji obisk", "points": 200, "category": "Popusti", "redemptions": 120, "stock": 999},
            {"id": 4, "name": "Brezplačna glavna jed", "points": 500, "category": "Hrana", "redemptions": 45, "stock": 50},
            {"id": 5, "name": "Večerja za dva", "points": 1000, "category": "Izkušnje", "redemptions": 12, "stock": 10},
            {"id": 6, "name": "Ekskluzivna degustacija", "points": 2000, "category": "Izkušnje", "redemptions": 5, "stock": 5},
        ],
        "total_rewards": 6,
        "total_redemptions": 607,
    }


@router.get("/leaderboard")
def get_loyalty_leaderboard(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """ lestvica zvestih strank."""
    return {
        "leaderboard": [
            {"rank": 1, "name": "Janez Novak", "points": 3200, "tier": "Platina", "visits": 35},
            {"rank": 2, "name": "Ana Petrović", "points": 2800, "tier": "Zlati", "visits": 28},
            {"rank": 3, "name": "Marija Kovač", "points": 2450, "tier": "Zlati", "visits": 22},
            {"rank": 4, "name": "Peter Horvat", "points": 1890, "tier": "Srebrni", "visits": 18},
            {"rank": 5, "name": "Dejan Kovač", "points": 1200, "tier": "Srebrni", "visits": 15},
        ],
    }


@router.get("/challenges")
def get_loyalty_challenges(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Izzivi."""
    return {
        "challenges": [
            {"id": 1, "name": "5 obiskov ta mesec", "description": "Obišči restavracijo 5-krat", "target": 5, "progress": 3, "reward": 100, "expires": "2026-01-31", "status": "active"},
            {"id": 2, "name": "Poskusi 3 nove jedi", "description": "Naroči 3 različne nove jedi", "target": 3, "progress": 1, "reward": 150, "expires": "2026-01-31", "status": "active"},
            {"id": 3, "name": "Pripelji prijatelja", "description": "Pripelji novo stranko", "target": 1, "progress": 0, "reward": 200, "expires": "2026-01-31", "status": "active"},
        ],
        "active_challenges": 3,
        "completed_this_month": 1,
    }


@router.get("/analytics")
def get_loyalty_analytics(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Analiza zvestobe."""
    return {
        "total_members": 1067,
        "active_members": 850,
        "avg_points_per_member": 42.2,
        "redemption_rate": 28.5,
        "tier_distribution": [
            {"tier": "Bronasti", "percentage": 60.9, "members": 650},
            {"tier": "Srebrni", "percentage": 30.0, "members": 320},
            {"tier": "Zlati", "percentage": 8.0, "members": 85},
            {"tier": "Platina", "percentage": 1.1, "members": 12},
        ],
        "monthly_activity": [
            {"month": "2026-01", "points_issued": 5200, "redemptions": 180},
            {"month": "2025-12", "points_issued": 4800, "redemptions": 150},
            {"month": "2025-11", "points_issued": 4500, "redemptions": 140},
        ],
    }


@router.get("/stats")
def get_loyalty_stats(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Statistika zvestobe."""
    return {
        "total_members": 1067,
        "active_members": 850,
        "total_points_issued": 45000,
        "total_redemptions": 1200,
        "redemption_rate": 28.5,
        "avg_points_per_member": 42.2,
    }