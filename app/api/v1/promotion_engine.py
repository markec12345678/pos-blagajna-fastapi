"""Promotion engine — dynamic pricing, happy hour, loyalty rewards."""
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime, timedelta, time

from app.core.database import get_db
from app.api.v1.auth import get_current_user

router = APIRouter(prefix="/promotion-engine", tags=["Promocijski motor"])


class DynamicPriceRule(BaseModel):
    menu_item_id: int
    rule_type: str  # happy_hour, peak_hour, weekend, loyalty
    discount_percent: float
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    days_of_week: Optional[List[int]] = None  # 0=Monday, 6=Sunday
    min_loyalty_points: Optional[int] = None


class PromotionRule(BaseModel):
    name: str
    type: str  # discount, bogo, combo, loyalty_bonus
    value: float
    conditions: dict = {}
    valid_from: Optional[str] = None
    valid_to: Optional[str] = None


@router.get("/active")
def get_active_promotions(db: Session = Depends(get_db)):
    """Vrni aktivne promocije."""
    now = datetime.now()
    current_time = now.time()
    current_day = now.weekday()

    # Happy hour rules (simulated)
    happy_hour_active = time(14, 0) <= current_time <= time(17, 0)
    peak_hour_active = time(12, 0) <= current_time <= time(14, 0) or time(19, 0) <= current_time <= time(21, 0)
    is_weekend = current_day >= 5

    promotions = []

    if happy_hour_active:
        promotions.append({
            "id": "happy_hour",
            "name": "Happy Hour 🍻",
            "type": "discount",
            "discount_percent": 20,
            "description": "20% popust na pijače med 14:00 in 17:00",
            "applies_to": "drinks",
            "end_time": "17:00",
        })

    if is_weekend:
        promotions.append({
            "id": "weekend_special",
            "name": "Vikend posebna ponudba 🎉",
            "type": "discount",
            "discount_percent": 10,
            "description": "10% popust na vse jedi ob vikendih",
            "applies_to": "all",
        })

    # Loyalty bonus
    promotions.append({
        "id": "loyalty_bonus",
        "name": "Podvojene točke ⭐",
        "type": "loyalty_bonus",
        "multiplier": 2,
        "description": "Dvojne točke za vse naročila danes",
        "applies_to": "all",
    })

    return {
        "promotions": promotions,
        "current_time": now.strftime('%H:%M'),
        "current_day": current_day,
    }


@router.get("/calculate-discount")
def calculate_discount(
    item_id: int,
    quantity: int = 1,
    customer_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """Izračunaj popust za artikel."""
    from app.models.menu_item import MenuItem
    from app.models.customer import Customer

    item = db.query(MenuItem).filter(MenuItem.id == item_id).first()
    if not item:
        return {"error": "Artikel ni najden"}

    now = datetime.now()
    current_time = now.time()
    current_day = now.weekday()

    original_price = item.price or 0
    discount = 0
    discount_reason = []

    # Happy hour (drinks only)
    if time(14, 0) <= current_time <= time(17, 0):
        item_name_lower = (item.name or '').lower()
        if any(w in item_name_lower for w in ['pivo', 'vino', 'koktajl', 'sok', 'voda', 'čaj', 'kava']):
            discount += 20
            discount_reason.append("Happy Hour -20%")

    # Weekend discount
    if current_day >= 5:
        discount += 10
        discount_reason.append("Vikend -10%")

    # Loyalty bonus
    if customer_id:
        customer = db.query(Customer).filter(Customer.id == customer_id).first()
        if customer and customer.is_member:
            discount += 5
            discount_reason.append("Član -5%")

    # Volume discount
    if quantity >= 10:
        discount += 15
        discount_reason.append("Količina 10+ -15%")
    elif quantity >= 5:
        discount += 10
        discount_reason.append("Količina 5+ -10%")

    # Calculate final price
    discount_amount = original_price * (discount / 100)
    final_price = original_price - discount_amount

    return {
        "item_id": item_id,
        "item_name": item.name,
        "original_price": original_price,
        "quantity": quantity,
        "total_original": original_price * quantity,
        "discount_percent": discount,
        "discount_amount": round(discount_amount, 2),
        "final_price": round(final_price, 2),
        "total_final": round(final_price * quantity, 2),
        "savings": round(discount_amount * quantity, 2),
        "discount_reasons": discount_reason,
    }


@router.post("/rules")
def create_promotion_rule(data: PromotionRule, db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Ustvari pravilo za promocijo."""
    # In production: save to PromotionRule table
    return {
        "message": f"Pravilo '{data.name}' ustvarjeno",
        "type": data.type,
        "value": data.value,
    }


@router.get("/rules")
def get_promotion_rules(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Vrni pravila za promocije."""
    return {
        "rules": [
            {
                "id": 1,
                "name": "Happy Hour",
                "type": "time_based",
                "discount_percent": 20,
                "start_time": "14:00",
                "end_time": "17:00",
                "days_of_week": [0, 1, 2, 3, 4],
                "applies_to": "drinks",
                "active": True,
            },
            {
                "id": 2,
                "name": "Vikend popust",
                "type": "day_based",
                "discount_percent": 10,
                "days_of_week": [5, 6],
                "applies_to": "all",
                "active": True,
            },
            {
                "id": 3,
                "name": "Količinski popust 5+",
                "type": "volume",
                "discount_percent": 10,
                "min_quantity": 5,
                "applies_to": "all",
                "active": True,
            },
        ]
    }


@router.get("/suggestions")
def get_promotion_suggestions(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """AI predlogi za promocije."""
    now = datetime.now()
    suggestions = []

    # Time-based suggestions
    if now.hour < 11:
        suggestions.append({
            "type": "breakfast_special",
            "name": "Jutranja ponudba",
            "description": "20% popust na zajtrk do 11:00",
            "expected_impact": "+15% promet v jutranjih urah",
        })
    elif now.hour >= 14 and now.hour < 17:
        suggestions.append({
            "type": "afternoon_tea",
            "name": "Popoldanski čaj",
            "description": "Brezplačna kava ob naročilu torte",
            "expected_impact": "+25% prodaja sladic",
        })

    # Day-based suggestions
    if now.weekday() == 0:  # Monday
        suggestions.append({
            "type": "monday_special",
            "name": "Ponedeljkova posebnost",
            "description": "15% popust na vse jedi",
            "expected_impact": "+30% promet ob ponedeljkih",
        })

    # Loyalty suggestions
    suggestions.append({
        "type": "loyalty_birthday",
        "name": "Rojstnodnevna promocija",
        "description": "Brezplačna torta za člane ob rojstnem dnevu",
        "expected_impact": "+40% obiskov v rojstnih dnevih",
    })

    return {"suggestions": suggestions}


@router.get("/analytics")
def get_promotion_analytics(days: int = Query(30, ge=1, le=365), db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Analitika promocij."""
    # In production: calculate from actual promotion usage
    return {
        "period_days": days,
        "total_promotions_used": 156,
        "total_discount_given": 2345.67,
        "avg_discount_per_order": 15.04,
        "top_promotions": [
            {"name": "Happy Hour", "usage_count": 89, "total_discount": 1234.56},
            {"name": "Vikend popust", "usage_count": 45, "total_discount": 678.90},
            {"name": "Količinski popust", "usage_count": 22, "total_discount": 432.21},
        ],
        "revenue_impact": 12345.67,
    }