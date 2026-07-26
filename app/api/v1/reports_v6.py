from fastapi import APIRouter
router = APIRouter(prefix="/reports-v6", tags=["Reports V6"])

@router.get("/widgets")
def report_widgets():
    return {
        "available_widgets": [
            {"type": "kpi", "name": "KPI kazalnik", "description": "Prikaži ključni kazalnik", "icon": "📊"},
            {"type": "chart", "name": "Graf", "description": "Časovni ali kategorialni graf", "icon": "📈"},
            {"type": "table", "name": "Tabela", "description": "Podatkovna tabela", "icon": "📋"},
            {"type": "map", "name": "Zemljevid", "description": "Zemljevid lokacij", "icon": "🗺️"},
            {"type": "progress", "name": "Napredovalnik", "description": "Napredek proti cilju", "icon": "🎯"},
            {"type": "number", "name": "Številka", "description": "Velika številka z opisom", "icon": "🔢"},
        ],
        "active_widgets": 24
    }

@router.get("/builder")
def report_builder():
    return {
        "templates": [
            {"id": 1, "name": "Dnevni dashboard", "widgets": 8, "layout": "grid", "last_modified": "2026-07-16"},
            {"id": 2, "name": "Tedenski P&L", "widgets": 12, "layout": "stacked", "last_modified": "2026-07-14"},
            {"id": 3, "name": "Mesečno poročilo", "widgets": 16, "layout": "grid", "last_modified": "2026-07-01"},
        ],
        "drill_down": True,
        "filters_available": ["Datum", "Kategorija", "Izdelek", "Ura", "Zaposleni"]
    }

@router.get("/scheduled-exports")
def scheduled_exports():
    return {
        "active_exports": 6,
        "exports": [
            {"name": "Dnevni P&L", "frequency": "Dnevno", "time": "06:00", "format": "PDF", "recipients": 2, "last_run": "2026-07-16"},
            {"name": "Tedenska analiza", "frequency": "Tedensko", "time": "Pon 07:00", "format": "Excel", "recipients": 3, "last_run": "2026-07-14"},
            {"name": "Mesečni Poročilo", "frequency": "Mesečno", "time": "1. v mesecu", "format": "PDF", "recipients": 5, "last_run": "2026-07-01"},
        ],
        "delivery_stats": {"sent": 142, "delivered": 140, "failed": 2}
    }

@router.get("/visualization")
def data_visualization():
    return {
        "chart_types": ["Line", "Bar", "Pie", "Doughnut", "Area", "Scatter", "Heatmap"],
        "recent_charts": [
            {"name": "Tedenski prihodki", "type": "Line", "data_points": 7, "last_viewed": "2026-07-16"},
            {"name": "Prodaja po kategorijah", "type": "Pie", "data_points": 6, "last_viewed": "2026-07-15"},
            {"name": "Mesečni trend", "type": "Area", "data_points": 12, "last_viewed": "2026-07-14"},
        ],
        "embed_support": True,
        "real_time": True
    }
