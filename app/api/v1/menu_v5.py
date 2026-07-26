from fastapi import APIRouter
router = APIRouter(prefix="/menu-v5", tags=["Menu V5"])

@router.get("/nutrition")
def nutrition_analysis():
    return {
        "items_with_nutrition": 45,
        "total_items": 68,
        "avg_calories": 520,
        "avg_protein": 28.5,
        "avg_fat": 22.3,
        "avg_carbs": 48.2,
        "items": [
            {"name": "Risotto ai Funghi", "calories": 580, "protein": 18, "fat": 22, "carbs": 65, "fiber": 3.2, "sodium": 680},
            {"name": "Grilled Salmon", "calories": 420, "protein": 42, "fat": 18, "carbs": 12, "fiber": 1.5, "sodium": 520},
            {"name": "Caesar Salad", "calories": 320, "protein": 15, "fat": 24, "carbs": 14, "fiber": 4.2, "sodium": 780},
        ],
        "low_calorie_options": 12,
        "high_protein_options": 8
    }

@router.get("/allergens")
def allergen_management():
    return {
        "total_items": 68,
        "items_with_allergens": 32,
        "allergen_types": [
            {"name": "Gluten", "count": 18, "items": ["Risotto", "Kruh", "Testenine"]},
            {"name": "Mlečni izdelki", "count": 24, "items": ["Tiramisu", "Caesar", "Risotto"]},
            {"name": "Oreščki", "count": 6, "items": ["Pesto", "Solata"]},
            {"name": "Ribe", "count": 8, "items": ["Losos", "Sardele"]},
            {"name": "Jajca", "count": 12, "items": ["Caesar", "Tiramisu"]},
        ],
        "compliance": 100,
        "labeling_status": "Vsi artikli označeni"
    }

@router.get("/recipe-scaling")
def recipe_scaling():
    return {
        "recipes": [
            {"name": "Risotto ai Funghi", "portions": 4, "base_cost": 6.80, "scaled": [
                {"portions": 1, "cost": 1.70, "ingredients": {"Arborio": "80g", "Gobe": "120g", "Broth": "400ml"}},
                {"portions": 8, "cost": 13.60, "ingredients": {"Arborio": "160g", "Gobe": "240g", "Broth": "800ml"}},
                {"portions": 20, "cost": 34.00, "ingredients": {"Arborio": "400g", "Gobe": "600g", "Broth": "2L"}},
            ]},
            {"name": "Grilled Salmon", "portions": 1, "base_cost": 8.50, "scaled": [
                {"portions": 1, "cost": 8.50, "ingredients": {"Losos": "200g", "Olje": "15ml"}},
                {"portions": 4, "cost": 34.00, "ingredients": {"Losos": "800g", "Olje": "60ml"}},
            ]},
        ]
    }

@router.get("/cost-per-recipe")
def cost_per_recipe():
    return {
        "recipes": [
            {"name": "Risotto ai Funghi", "food_cost": 6.80, "price": 14.50, "margin": 53.1, "servings_month": 342},
            {"name": "Grilled Salmon", "food_cost": 8.50, "price": 18.90, "margin": 55.0, "servings_month": 128},
            {"name": "Caesar Salad", "food_cost": 3.20, "price": 8.90, "margin": 64.0, "servings_month": 185},
            {"name": "Tiramisu", "food_cost": 2.10, "price": 7.50, "margin": 72.0, "servings_month": 156},
        ],
        "avg_margin": 61.0,
        "total_food_cost_month": 4850.00
    }
