from fastapi import APIRouter
router = APIRouter(prefix="/marketing-v5", tags=["Marketing V5"])

@router.get("/ai-content")
def ai_content():
    return {
        "generated_this_month": 24,
        "templates_used": 8,
        "suggestions": [
            {"type": "email", "title": "Poletni koktajli", "preview": "Odkrijte naše sveže poletne koktajle...", "status": "ready", "engagement_pred": 42},
            {"type": "social", "title": "Instagram post — hrana", "preview": "Fotografija Tiramisuja z motivacijo...", "status": "draft", "engagement_pred": 5.8},
            {"type": "sms", "title": "Happy hour opomnik", "preview": "Danes 17:00-19:00 20% popust na pijače!", "status": "ready", "engagement_pred": 88},
        ],
        "performance": {"ai_open_rate": 44.2, "human_open_rate": 38.5, "lift": 14.8}
    }

@router.get("/journey")
def customer_journey():
    return {
        "journeys": [
            {"name": "Novi stranka", "steps": 5, "active_users": 23, "conversion": 32, "avg_days": 14},
            {"name": "Ponoven obisk", "steps": 3, "active_users": 45, "conversion": 68, "avg_days": 21},
            {"name": "Win-back", "steps": 4, "active_users": 18, "conversion": 22, "avg_days": 30},
            {"name": "VIP program", "steps": 6, "active_users": 28, "conversion": 75, "avg_days": 45},
        ],
        "total_in_journeys": 114,
        "avg_completion_rate": 48.2
    }

@router.get("/attribution")
def attribution():
    return {
        "channels": [
            {"name": "Email", "conversions": 45, "revenue": 3200, "cost": 120, "roi": 25.7, "pct": 35.2},
            {"name": "SMS", "conversions": 32, "revenue": 1800, "cost": 85, "roi": 20.2, "pct": 25.0},
            {"name": "Instagram", "conversions": 28, "revenue": 2100, "cost": 200, "roi": 9.5, "pct": 21.9},
            {"name": "Facebook", "conversions": 15, "revenue": 950, "cost": 150, "roi": 5.3, "pct": 11.7},
            {"name": "TikTok", "conversions": 8, "revenue": 520, "cost": 100, "roi": 4.2, "pct": 6.2},
        ],
        "total_conversions": 128,
        "total_revenue": 8570,
        "total_cost": 655
    }

@router.get("/automation")
def marketing_automation():
    return {
        "active_flows": 6,
        "triggered_today": 34,
        "flows": [
            {"name": "Dobrodošlica", "trigger": "Prva prijava", "active_users": 23, "completion_rate": 82, "revenue": 1200},
            {"name": "Rojstni dan", "trigger": "7 dni pred", "active_users": 8, "completion_rate": 75, "revenue": 640},
            {"name": "Neaktivni 30 dni", "trigger": "30 dni neaktivnosti", "active_users": 15, "completion_rate": 35, "revenue": 450},
            {"name": "VIP upgrade", "trigger": "500€ porabe", "active_users": 12, "completion_rate": 90, "revenue": 1800},
        ]
    }
