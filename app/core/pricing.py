from sqlalchemy.orm import Session
from app.models.price_rule import PriceRule
from datetime import datetime
from typing import Optional


def get_effective_price(menu_item_id: int, base_price: float, db: Session,
                        order_type: Optional[str] = None,
                        dt: Optional[datetime] = None) -> float:
    """Return the effective price considering active PriceRules."""
    if dt is None:
        dt = datetime.now()
    dow = dt.weekday()
    current_time = dt.strftime("%H:%M")

    rules = db.query(PriceRule).filter(
        PriceRule.is_active == True,
        PriceRule.menu_item_id == menu_item_id
    ).all()

    if not rules:
        rules = db.query(PriceRule).filter(
            PriceRule.is_active == True,
            PriceRule.menu_item_id == None
        ).all()

    best_rule = None
    best_score = -1

    for r in rules:
        score = 0
        if r.menu_item_id == menu_item_id:
            score += 4
        if r.menu_item_id is None:
            score += 1
        if r.day_of_week is not None and r.day_of_week == dow:
            score += 3
        if r.day_of_week is None:
            score += 0
        if r.order_type is not None and r.order_type == order_type:
            score += 2
        if r.order_type is None:
            score += 0
        if r.time_from is not None and r.time_to is not None:
            if r.time_from <= current_time <= r.time_to:
                score += 2
            else:
                continue
        if score > best_score:
            best_score = score
            best_rule = r

    if best_rule:
        return best_rule.price
    return base_price


def get_effective_price_for_item(menu_item_id: int, base_price: float, db: Session,
                                  order_type: Optional[str] = None) -> float:
    return get_effective_price(menu_item_id, base_price, db, order_type)
