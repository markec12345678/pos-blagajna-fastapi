"""Advanced AI menu suggestions — weather, time, season, popularity."""
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime, timedelta
import json

from app.core.database import get_db
from app.api.v1.auth import get_current_user

router = APIRouter(prefix="/ai-menu", tags=["AI Meni predlogi"])


@router.get("/suggestions")
def get_menu_suggestions(
    weather: Optional[str] = None,
    temperature: Optional[float] = None,
    time_of_day: Optional[str] = None,
    category: Optional[str] = None,
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """AI predlogi menija glede na vreme, čas, sezono in popularnost."""
    from app.models.menu_item import MenuItem
    from app.models.category import Category

    now = datetime.now()
    hour = now.hour
    month = now.month

    # Determine time of day if not provided
    if not time_of_day:
        if 6 <= hour < 10:
            time_of_day = "breakfast"
        elif 10 <= hour < 14:
            time_of_day = "lunch"
        elif 14 <= hour < 17:
            time_of_day = "afternoon"
        elif 17 <= hour < 21:
            time_of_day = "dinner"
        else:
            time_of_day = "late"

    # Get menu items
    q = db.query(MenuItem).filter(MenuItem.is_available == True)
    if category:
        cats = db.query(Category).filter(Category.name.ilike(f"%{category}%")).all()
        cat_ids = [c.id for c in cats]
        if cat_ids:
            q = q.filter(MenuItem.category_id.in_(cat_ids))

    items = q.all()

    # Score each item
    scored = []
    for item in items:
        score = 50.0  # Base score
        reasons = []

        # Time of day boost
        item_name_lower = (item.name or '').lower()
        if time_of_day == "breakfast":
            if any(w in item_name_lower for w in ['jajc', 'toast', 'kava', 'čaj', 'sok', 'musli', 'pancakes']):
                score += 30
                reasons.append("zajtrk")
        elif time_of_day == "lunch":
            if any(w in item_name_lower for w in ['solat', 'juh', 'sendvič', 'taco', 'burger']):
                score += 25
                reasons.append("kosilo")
        elif time_of_day == "dinner":
            if any(w in item_name_lower for w in ['riba', 'meso', 'steak', 'testenin', 'rižot', 'lamb']):
                score += 25
                reasons.append("večerja")
        elif time_of_day == "afternoon":
            if any(w in item_name_lower for w in ['kava', 'torta', 'kolač', 'sladoled', 'palačink']):
                score += 30
                reasons.append("popoldanska malica")

        # Weather-based scoring
        if weather:
            weather_lower = weather.lower()
            if weather_lower in ['sončno', 'toplo', 'vroče', 'sunny', 'hot', 'warm']:
                if any(w in item_name_lower for w in ['solat', 'sladoled', 'limonad', 'sok', 'fish', 'riba']):
                    score += 20
                    reasons.append("toplo vreme")
                if any(w in item_name_lower for w in ['juh', 'gob', 'čili']):
                    score -= 10
            elif weather_lower in ['dež', 'sneg', 'mrzlo', 'cold', 'rain', 'snow']:
                if any(w in item_name_lower for w in ['juh', 'gob', 'čili', 'točen', 'gulaš', 'kava']):
                    score += 25
                    reasons.append("mrzlo vreme")
                if any(w in item_name_lower for w in ['sladoled', 'limonad']):
                    score -= 10

        # Temperature-based
        if temperature is not None:
            if temperature > 25:
                if 'svež' in item_name_lower or 'led' in item_name_lower:
                    score += 15
                    reasons.append("vroče")
            elif temperature < 10:
                if 'topl' in item_name_lower or 'vroč' in item_name_lower:
                    score += 15
                    reasons.append("mrzlo")

        # Season-based
        if month in [6, 7, 8]:  # Summer
            if any(w in item_name_lower for w in ['solat', 'riba', 'sveže', 'grill']):
                score += 10
                reasons.append("poletje")
        elif month in [12, 1, 2]:  # Winter
            if any(w in item_name_lower for w in ['juh', 'gob', 'točen', 'gulaš']):
                score += 10
                reasons.append("zima")

        # Price tier (mid-range gets bonus)
        if item.price and 8 <= item.price <= 18:
            score += 5

        # Specials / featured
        if hasattr(item, 'is_featured') and item.is_featured:
            score += 15
            reasons.append("priporočeno")

        scored.append({
            "id": item.id,
            "name": item.name,
            "price": item.price,
            "category_id": item.category_id,
            "score": round(score, 1),
            "reasons": reasons,
        })

    # Sort by score and return top items
    scored.sort(key=lambda x: x["score"], reverse=True)

    return {
        "suggestions": scored[:limit],
        "context": {
            "time_of_day": time_of_day,
            "weather": weather,
            "temperature": temperature,
            "month": month,
            "hour": hour,
        },
        "total_scored": len(scored)
    }


@router.get("/weather-menu")
def get_weather_menu(
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Vrni priporočila glede na trenutno vreme (brez API ključa — simulacija)."""
    # Simple simulation based on time/season
    now = datetime.now()
    hour = now.hour
    month = now.month

    # Simulate weather based on season
    if month in [6, 7, 8]:
        weather = "sončno"
        temp = 28
    elif month in [12, 1, 2]:
        weather = "mrzlo"
        temp = 2
    else:
        weather = "oblačno"
        temp = 15

    return {
        "weather": weather,
        "temperature": temp,
        "suggestion": f"Glede na {weather} vreme ({temp}°C) priporočamo:",
        "categories": ["Hladne jedi" if temp > 20 else "Tople jedi"]
    }


@router.get("/popular-times")
def get_popular_times(
    day_of_week: Optional[int] = None,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Vrni popularne ure za določen dan v tednu."""
    if day_of_week is None:
        day_of_week = datetime.now().weekday()

    # Simulated popular times based on restaurant patterns
    popular_times = {
        0: [{"hour": 12, "popularity": 85}, {"hour": 13, "popularity": 95}, {"hour": 19, "popularity": 90}, {"hour": 20, "popularity": 80}],
        1: [{"hour": 12, "popularity": 80}, {"hour": 13, "popularity": 90}, {"hour": 19, "popularity": 85}, {"hour": 20, "popularity": 75}],
        2: [{"hour": 12, "popularity": 75}, {"hour": 13, "popularity": 85}, {"hour": 19, "popularity": 80}, {"hour": 20, "popularity": 70}],
        3: [{"hour": 12, "popularity": 80}, {"hour": 13, "popularity": 90}, {"hour": 19, "popularity": 85}, {"hour": 20, "popularity": 75}],
        4: [{"hour": 12, "popularity": 85}, {"hour": 13, "popularity": 95}, {"hour": 19, "popularity": 95}, {"hour": 20, "popularity": 90}, {"hour": 21, "popularity": 80}],
        5: [{"hour": 12, "popularity": 90}, {"hour": 13, "popularity": 100}, {"hour": 19, "popularity": 100}, {"hour": 20, "popularity": 95}, {"hour": 21, "popularity": 85}],
        6: [{"hour": 10, "popularity": 70}, {"hour": 11, "popularity": 85}, {"hour": 12, "popularity": 95}, {"hour": 13, "popularity": 90}],
    }

    return {
        "day_of_week": day_of_week,
        "popular_times": popular_times.get(day_of_week, []),
        "tip": "Največ strank je ob 12:00-13:00 in 19:00-20:00"
    }
