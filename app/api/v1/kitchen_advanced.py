"""Kitchen improvements — portion control, recipe scaling, prep lists."""
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime, timedelta

from app.core.database import get_db
from app.api.v1.auth import get_current_user

router = APIRouter(prefix="/kitchen-advanced", tags=["Napredna kuhinja"])


class RecipeScale(BaseModel):
    recipe_id: int
    new_portions: int


class PrepTask(BaseModel):
    name: str
    category: str  # prep, cook, plate
    estimated_minutes: int
    assigned_to: Optional[str] = None


@router.get("/recipes")
def list_recipes(
    category: Optional[str] = None,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Vrni recepte z analizo stroškov."""
    return {
        "recipes": [
            {
                "id": 1, "name": "Rižota z gobami",
                "category": "Glavne jedi", "portions": 1,
                "prep_time": 10, "cook_time": 20,
                "cost_per_portion": 4.20, "selling_price": 14.00,
                "margin": 70.0, "difficulty": "medium",
                "allergens": ["mleko", "gluten"],
                "ingredients": [
                    {"name": "Arborio riž", "quantity": 120, "unit": "g", "cost": 0.60},
                    {"name": "Gobe", "quantity": 80, "unit": "g", "cost": 1.20},
                    {"name": "Parmezan", "quantity": 30, "unit": "g", "cost": 1.50},
                    {"name": "Belušna", "quantity": 50, "unit": "ml", "cost": 0.30},
                    {"name": "Maslo", "quantity": 15, "unit": "g", "cost": 0.40},
                    {"name": "Čebula", "quantity": 30, "unit": "g", "cost": 0.10},
                    {"name": "Začimbe", "quantity": 1, "unit": "porcija", "cost": 0.10},
                ],
            },
            {
                "id": 2, "name": "Pleskavica",
                "category": "Glavne jedi", "portions": 1,
                "prep_time": 5, "cook_time": 15,
                "cost_per_portion": 3.80, "selling_price": 9.00,
                "margin": 57.8, "difficulty": "easy",
                "allergens": [],
                "ingredients": [
                    {"name": "Mlet meso", "quantity": 200, "unit": "g", "cost": 2.40},
                    {"name": "Čebula", "quantity": 30, "unit": "g", "cost": 0.10},
                    {"name": "Kruh", "quantity": 50, "unit": "g", "cost": 0.30},
                    {"name": "Solata", "quantity": 50, "unit": "g", "cost": 0.50},
                    {"name": "Paradižnik", "quantity": 30, "unit": "g", "cost": 0.20},
                    {"name": "Omake", "quantity": 30, "unit": "ml", "cost": 0.30},
                ],
            },
            {
                "id": 3, "name": "Štruklji",
                "category": "Sladice", "portions": 1,
                "prep_time": 15, "cook_time": 25,
                "cost_per_portion": 2.50, "selling_price": 9.00,
                "margin": 72.2, "difficulty": "medium",
                "allergens": ["jajca", "mleko", "gluten"],
                "ingredients": [
                    {"name": "Moka", "quantity": 100, "unit": "g", "cost": 0.20},
                    {"name": "Jajca", "quantity": 2, "unit": "kos", "cost": 0.60},
                    {"name": "Skuta", "quantity": 100, "unit": "g", "cost": 0.80},
                    {"name": "Maslo", "quantity": 20, "unit": "g", "cost": 0.50},
                    {"name": "Kisla smetana", "quantity": 30, "unit": "g", "cost": 0.30},
                    {"name": "Cimet", "quantity": 1, "unit": "čl", "cost": 0.10},
                ],
            },
        ],
        "total": 3,
    }


@router.get("/recipes/{recipe_id}")
def get_recipe_detail(recipe_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Podrobnosti recepta."""
    return {
        "recipe": {
            "id": recipe_id, "name": "Rižota z gobami",
            "category": "Glavne jedi", "portions": 1,
            "prep_time": 10, "cook_time": 20, "total_time": 30,
            "cost_per_portion": 4.20, "selling_price": 14.00,
            "margin": 70.0, "difficulty": "medium",
            "allergens": ["mleko", "gluten"],
            "instructions": [
                "Segrejte olje v veliki ponvi",
                "Na drobno nasekljano čebulo prepražite",
                "Dodajte gobe in kuhajte 5 minut",
                "Dodajte riž in premešajte",
                "Postopoma dodajte belo vino",
                "Dodajte juho po žlicah, mešajte",
                "Na koncu dodajte maslo in parmezan",
                "Postrezite takoj",
            ],
            "nutrition": {
                "calories": 450,
                "protein": 18,
                "carbs": 52,
                "fat": 16,
                "fiber": 3,
            },
            "image_url": "/images/risoto-gobe.jpg",
        }
    }


@router.post("/recipes/scale")
def scale_recipe(data: RecipeScale, db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Prilagodi recept za novo število porcij."""
    # In production: fetch recipe and scale
    base_portions = 1
    multiplier = data.new_portions / base_portions

    return {
        "recipe_id": data.recipe_id,
        "original_portions": base_portions,
        "new_portions": data.new_portions,
        "multiplier": multiplier,
        "scaled_ingredients": [
            {"name": "Arborio riž", "quantity": 120 * multiplier, "unit": "g"},
            {"name": "Gobe", "quantity": 80 * multiplier, "unit": "g"},
            {"name": "Parmezan", "quantity": 30 * multiplier, "unit": "g"},
            {"name": "Belušna", "quantity": 50 * multiplier, "unit": "ml"},
            {"name": "Maslo", "quantity": 15 * multiplier, "unit": "g"},
            {"name": "Čebula", "quantity": 30 * multiplier, "unit": "g"},
        ],
        "total_cost": round(4.20 * multiplier, 2),
    }


@router.get("/prep-list")
def get_prep_list(
    date: Optional[str] = None,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Seznam priprav za dan."""
    return {
        "date": date or datetime.now().strftime('%Y-%m-%d'),
        "tasks": [
            {
                "id": 1, "name": "Nasekljati čebulo za rižoto",
                "category": "prep", "estimated_minutes": 10,
                "assigned_to": "Marko", "status": "pending",
                "priority": "high",
            },
            {
                "id": 2, "name": "Očistiti gobe",
                "category": "prep", "estimated_minutes": 15,
                "assigned_to": "Marija", "status": "in_progress",
                "priority": "high",
            },
            {
                "id": 3, "name": "Pripraviti testo za štruklje",
                "category": "prep", "estimated_minutes": 20,
                "assigned_to": "Ana", "status": "pending",
                "priority": "medium",
            },
            {
                "id": 4, "name": "Narezati kruh",
                "category": "prep", "estimated_minutes": 5,
                "assigned_to": "Peter", "status": "completed",
                "priority": "low",
            },
            {
                "id": 5, "name": "Pripraviti solato",
                "category": "plate", "estimated_minutes": 10,
                "assigned_to": "Ana", "status": "pending",
                "priority": "medium",
            },
        ],
        "total_tasks": 5,
        "completed": 1,
        "in_progress": 1,
        "pending": 3,
        "estimated_total_minutes": 60,
    }


@router.get("/inventory-usage")
def get_inventory_usage(
    days: int = Query(7, ge=1, le=30),
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Poraba zalog glede na recepte."""
    return {
        "period_days": days,
        "usage": [
            {"item": "Arborio riž", "used": 2.4, "unit": "kg", "cost": 12.00},
            {"item": "Gobe", "used": 1.6, "unit": "kg", "cost": 24.00},
            {"item": "Parmezan", "used": 0.6, "unit": "kg", "cost": 30.00},
            {"item": "Mlet meso", "used": 4.0, "unit": "kg", "cost": 48.00},
            {"item": "Moka", "used": 2.0, "unit": "kg", "cost": 4.00},
        ],
        "total_cost": 118.00,
        "waste_percentage": 3.2,
    }


@router.get("/nutrition")
def get_nutrition_analysis(
    menu_item: Optional[str] = None,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Analiza hranilnih vrednosti."""
    return {
        "menu_items": [
            {
                "name": "Rižota z gobami",
                "calories": 450, "protein": 18, "carbs": 52, "fat": 16,
                "allergens": ["mleko", "gluten"],
                "dietary": {"vegetarian": True, "vegan": False, "gluten_free": False},
            },
            {
                "name": "Pleskavica",
                "calories": 580, "protein": 32, "carbs": 45, "fat": 28,
                "allergens": [],
                "dietary": {"vegetarian": False, "vegan": False, "gluten_free": True},
            },
            {
                "name": "Štruklji",
                "calories": 320, "protein": 12, "carbs": 38, "fat": 14,
                "allergens": ["jajca", "mleko", "gluten"],
                "dietary": {"vegetarian": True, "vegan": False, "gluten_free": False},
            },
        ],
        "allergen_summary": {
            "mleko": 2,
            "gluten": 2,
            "jajca": 1,
        },
    }


@router.get("/stats")
def get_kitchen_stats(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Statistika kuhinje."""
    return {
        "total_recipes": 45,
        "avg_prep_time": 12,
        "avg_cook_time": 18,
        "avg_cost_per_portion": 4.50,
        "avg_margin": 65.0,
        "most_profitable": "Štruklji",
        "most_popular": "Rižota z gobami",
        "prep_tasks_today": 15,
        "prep_completion_rate": 87.5,
        "waste_percentage": 3.2,
    }