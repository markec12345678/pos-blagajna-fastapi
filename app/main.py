from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from app.core.database import engine, SessionLocal, Base
from app.core.config import get_settings
from app.core.websocket_manager import connect, disconnect
from app.api.v1 import auth, menu, tables, orders, payment, dashboard, kds, inventory, public, analytics, settings as settings_router, users, backup, audit_log, cash_register, modifiers, customers, courses, suppliers, reservations, shifts, gift_cards, branches, media, promotions, ratings, loyalty, marketing, catering, invoices, search, employee_performance, delivery, waste, export as export_router, expenses, budgets, schedule, price_rules, waitlist, order_templates, data_import, system, service_requests, tip_pool, house_accounts, ai, printer, gamification, dynamic_menu, messaging, predictive, upsell, feedback, voice, reports, table_qr, schedule_calendar, barcode, loyalty_rewards, multi_payment, employee_dashboard, global_search, notifications, inventory_analytics, feedback_qr, kds_timers, access_control, ai_menu, loyalty_realtime, supplier_auto, shift_swap, employee_perf_adv, inventory_alerts, menu_images, menu_allergens, order_tracking, receipts, schedule_templates, inventory_batch, promotion_engine, quality_control, expenses_adv, branch_management, employee_certs, reports_advanced, communication, supplier_management, kitchen_advanced, menu_engineering, customer_experience, inventory_advanced, schedule_advanced, payments_advanced, marketing_advanced, analytics_advanced, loyalty_advanced, employee_advanced, operations_advanced, finance, quality_management, crm, logistics, reports_v2, marketing_v2, employees_v2, experience, inventory_v2, schedule_v2, crm_v2, finance_v2, menu_v2, orders_v2, kds_v2, customers_v2, expenses_v2, promotions_v2, delivery_v2, warehouse_v2, reports_v3, suppliers_v2, quality_v2, employees_v3, loyalty_v2, analytics_v2, marketing_v3, reservations_v2, payments_v2, cash_v2, shifts_v2, reports_v4, promotions_v3, menu_v3, audit_v2, users_v2, tables_v2, gift_cards_v2, catering_v2, invoices_v2, ratings_v2, backup_v2, system_v2, barcode_v2, feedback_v2, branches_v2, exports_v2, media_v2, price_rules_v2, waitlist_v2, kitchen_v2, revenue_v2, reservations_v3, inventory_v3, analytics_v3, marketing_v4, customers_v3, reports_v5, finance_v3, menu_v4, quality_v3, staff_v4, delivery_v3, inventory_v4, marketing_v5, analytics_v4, crm_v3, finance_v4, menu_v5, reports_v6, customers_v4, inventory_v5, staff_v5, orders_v3, crm_v4, finance_v5, menu_v6, reports_v7, delivery_v4, loyalty_v3, schedule_v3, analytics_v5, marketing_v6, quality_v4, expenses_v3, promotions_v4, orders_v4, payments_v3, customers_v5, schedule_v4, staff_v6, inventory_v6, crm_v5, reports_v8, marketing_v7, analytics_v6, menu_v7, finance_v6
from app.api.v1.backup import start_auto_backup
from app.core.rate_limit import RateLimitMiddleware
from app.core.security_headers import SecurityHeadersMiddleware
from app.core.request_id import RequestIdMiddleware
from app.models.user import User
from app.models.category import Category
from app.models.menu_item import MenuItem
from app.models.table_model import TableModel
from app.models.audit_log import AuditLog
from app.models.inventory import Ingredient, RecipeItem
from app.models.menu_course import MenuCourse
from app.models.price_rule import PriceRule
from app.models.waitlist import WaitlistEntry
from app.models.order_template import OrderTemplate
from app.models.menu_item import CrossSellItem
from app.models.service_request import ServiceRequest
from app.models.tip_pool import TipPool, TipDistribution
from app.models.house_account import HouseAccount, HouseAccountTransaction
from app.models.gamification import Challenge, CustomerChallengeProgress, CustomerBadge, CustomerStreak
from app.models.dynamic_menu import DynamicMenuSuggestion, MenuItemDemand, WeatherCache
import hashlib
from pathlib import Path


def seed_data():
    db = SessionLocal()
    if db.query(User).count() > 0:
        db.close()
        return

    from app.models.branch import Branch
    branch = Branch(name="Glavna restavracija", address="Ljubljana, Slovenija", phone="+386 1 234 5678", email="info@restavracija.si", is_active=True)
    db.add(branch)
    db.flush()
    branch_id = branch.id

    from app.api.v1.auth import hash_password, hash_pin
    db.add(User(
        username="admin",
        hashed_password=hash_password("admin"),
        full_name="Administrator",
        role="admin",
        pin_code=hash_pin("1111"),
        branch_id=branch_id
    ))
    db.add(User(
        username="cashier",
        hashed_password=hash_password("cashier"),
        full_name="Cashier 1",
        role="cashier",
        pin_code=hash_pin("2222"),
        branch_id=branch_id
    ))

    cats = ["Pizza", "Salad", "Main Course", "Dessert", "Drinks", "Starters"]
    for i, name in enumerate(cats):
        db.add(Category(name=name, sort_order=i, branch_id=branch_id))
    db.flush()

    items_data = [
        ("Margherita Pizza", "Sos od paradižnika, mocarela", 8.50, 1),
        ("Pepperoni Pizza", "Sos od paradižnika, mocarela, pepperoni", 10.50, 1),
        ("Capricciosa", "Sos od paradižnika, mocarela, šunka, gobe", 11.00, 1),
        ("Caesar Salad", "Sveža solata s Caesar prelivom", 7.50, 2),
        ("Greek Salad", "Feta, olive, kumare, paradižnik", 7.00, 2),
        ("Grilled Salmon", "Svež losos z zelenjavo", 15.50, 3),
        ("Steak", "Goveji zrezek s krompirjem", 18.00, 3),
        ("Tiramisu", "Klasična italijanska sladica", 5.50, 4),
        ("Panna Cotta", "Italijanska sladica z jagodičevjem", 5.00, 4),
        ("Coca Cola", "0.33l", 2.50, 5),
        ("Voda", "0.5l", 1.50, 5),
        ("Sok", "Pomarančni sok 0.2l", 2.00, 5),
        ("Bruschetta", "Svež kruh s paradižnikom in baziliko", 4.50, 6),
        ("Calamari", "Ocvrti lignji s tartar omako", 6.00, 6),
    ]
    menu_ids = []
    for name, desc, price, cat_id in items_data:
        mi = MenuItem(name=name, description=desc, price=price, category_id=cat_id, branch_id=branch_id)
        db.add(mi)
        db.flush()
        menu_ids.append(mi.id)

    positions = [(100, 60), (260, 60), (420, 60), (580, 60), (100, 200), (260, 200), (420, 200), (580, 200)]
    for i in range(1, 9):
        x, y = positions[i - 1]
        db.add(TableModel(number=i, name=f"Miza {i}", capacity=4, status="free", pos_x=x, pos_y=y, branch_id=branch_id))
    db.add(TableModel(number=9, name="Bar pult", capacity=2, status="free", pos_x=50, pos_y=340, shape="rectangle", branch_id=branch_id))
    db.add(TableModel(number=10, name="Terasa", capacity=6, status="free", pos_x=400, pos_y=340, shape="rectangle", branch_id=branch_id))

    # ── Ingredients: food & drink stock for a typical restaurant ──
    ings = {
        # PIZZA (category food)
        "pizza_dough":        {"name": "Pizza testo",       "unit": "kg", "cat": "food", "stock": 10, "min": 2, "cost": 1.20},
        "mozzarella":         {"name": "Mocarela",           "unit": "kg", "cat": "food", "stock": 8,  "min": 2, "cost": 4.50},
        "tomato_sauce":       {"name": "Paradižnikov sos",   "unit": "l",  "cat": "food", "stock": 6,  "min": 1, "cost": 1.80},
        "pepperoni":          {"name": "Pepperoni",          "unit": "kg", "cat": "food", "stock": 4,  "min": 1, "cost": 6.00},
        "ham":                {"name": "Šunka",              "unit": "kg", "cat": "food", "stock": 5,  "min": 1, "cost": 5.00},
        "mushrooms":          {"name": "Gobe",               "unit": "kg", "cat": "food", "stock": 3,  "min": 1, "cost": 3.50},
        # SALAD
        "lettuce":            {"name": "Solata",             "unit": "kg", "cat": "food", "stock": 5,  "min": 1, "cost": 1.50},
        "cucumber":           {"name": "Kumare",             "unit": "kg", "cat": "food", "stock": 4,  "min": 1, "cost": 1.20},
        "tomato":             {"name": "Paradižnik",         "unit": "kg", "cat": "food", "stock": 6,  "min": 1, "cost": 1.50},
        "feta":               {"name": "Feta sir",          "unit": "kg", "cat": "food", "stock": 3,  "min": 1, "cost": 5.00},
        "olives":             {"name": "Olive",              "unit": "kg", "cat": "food", "stock": 3,  "min": 0.5,"cost": 4.00},
        "croutons":           {"name": "Krutoni",            "unit": "kg", "cat": "food", "stock": 2,  "min": 0.5,"cost": 2.00},
        "parmesan":           {"name": "Parmezan",           "unit": "kg", "cat": "food", "stock": 2,  "min": 0.5,"cost": 8.00},
        "caesar_dressing":    {"name": "Caesar preliv",      "unit": "l",  "cat": "food", "stock": 3,  "min": 1,  "cost": 2.50},
        "chicken_breast":     {"name": "Piščančje prsi",     "unit": "kg", "cat": "food", "stock": 8,  "min": 2,  "cost": 4.00},
        # MAIN COURSE
        "salmon":             {"name": "Losos file",        "unit": "kg", "cat": "food", "stock": 5,  "min": 1,  "cost": 9.00},
        "beef_steak":         {"name": "Goveji zrezek",     "unit": "kg", "cat": "food", "stock": 6,  "min": 1,  "cost": 8.00},
        "potato":             {"name": "Krompir",            "unit": "kg", "cat": "food", "stock": 15, "min": 3,  "cost": 0.80},
        "mixed_vegetables":   {"name": "Mešana zelenjava",   "unit": "kg", "cat": "food", "stock": 8,  "min": 2,  "cost": 1.50},
        "olive_oil":          {"name": "Oljčno olje",        "unit": "l",  "cat": "food", "stock": 4,  "min": 1,  "cost": 3.00},
        # DESSERT
        "mascarpone":         {"name": "Maskarpone",         "unit": "kg", "cat": "food", "stock": 3,  "min": 1,  "cost": 5.00},
        "ladyfingers":        {"name": "Piškoti savoiardi",  "unit": "kg", "cat": "food", "stock": 2,  "min": 0.5,"cost": 3.00},
        "coffee":             {"name": "Kava",               "unit": "l",  "cat": "food", "stock": 2,  "min": 0.5,"cost": 4.00},
        "cocoa":              {"name": "Kakav v prahu",      "unit": "kg", "cat": "food", "stock": 1,  "min": 0.5,"cost": 3.50},
        "cream":              {"name": "Smetana za stepanje","unit": "l",  "cat": "food", "stock": 4,  "min": 1,  "cost": 2.00},
        "berries":            {"name": "Jagodičevje",        "unit": "kg", "cat": "food", "stock": 2,  "min": 0.5,"cost": 4.50},
        # DRINKS
        "coca_cola":          {"name": "Coca Cola",          "unit": "kos","cat": "drink","stock": 48, "min": 12, "cost": 0.60},
        "water":              {"name": "Voda",               "unit": "kos","cat": "drink","stock": 48, "min": 12, "cost": 0.40},
        "orange_juice":       {"name": "Pomarančni sok",     "unit": "kos","cat": "drink","stock": 24, "min": 6,  "cost": 0.50},
        # STARTERS
        "bread":              {"name": "Svež kruh",          "unit": "kg", "cat": "food", "stock": 5,  "min": 1,  "cost": 1.00},
        "basil":              {"name": "Sveža bazilika",     "unit": "kg", "cat": "food", "stock": 0.5,"min": 0.2,"cost": 8.00},
        "squid":              {"name": "Lignji",             "unit": "kg", "cat": "food", "stock": 3,  "min": 1,  "cost": 5.00},
        "flour":              {"name": "Moka",               "unit": "kg", "cat": "food", "stock": 10, "min": 2,  "cost": 0.50},
        "tartar_sauce":       {"name": "Tartar omaka",       "unit": "l",  "cat": "food", "stock": 2,  "min": 0.5,"cost": 2.00},
    }
    ing_map = {}
    for key, d in ings.items():
        ing = Ingredient(
            name=d["name"], unit=d["unit"], category=d["cat"],
            stock=d["stock"], min_stock=d["min"],
            cost_per_unit=d["cost"],
            branch_id=branch_id
        )
        db.add(ing)
        db.flush()
        ing_map[key] = ing.id

    # ── Recipes: link menu items → ingredients ──
    # menu_ids order: 0=Margherita, 1=Pepperoni, 2=Capricciosa, 3=Caesar, 4=Greek,
    # 5=Salmon, 6=Steak, 7=Tiramisu, 8=PannaCotta, 9=Cola, 10=Voda, 11=Sok,
    # 12=Bruschetta, 13=Calamari
    # ── Courses ──
    course_ids = []
    for cname in ["Predjedi", "Glavne jedi", "Sladice", "Pijače", "Pizze"]:
        c = MenuCourse(name=cname, sort_order=len(course_ids))
        db.add(c)
        db.flush()
        course_ids.append(c.id)
    # Assign courses to items: 0=Margherita(5=Pizze), 1=Pepperoni(5), 2=Capricciosa(5),
    # 3=Caesar(0=Predjedi), 4=Greek(0), 5=Salmon(1=Glavne), 6=Steak(1),
    # 7=Tiramisu(2=Sladice), 8=PannaCotta(2), 9=Cola(3=Pijače), 10=Voda(3), 11=Sok(3),
    # 12=Bruschetta(0), 13=Calamari(0)
    course_map = [4, 4, 4, 0, 0, 1, 1, 2, 2, 3, 3, 3, 0, 0]
    for i, cid in enumerate(course_map):
        mi = db.query(MenuItem).filter(MenuItem.name == items_data[i][0]).first()
        if mi:
            mi.course_id = course_ids[cid]

    recipes = [
        # Margherita Pizza → dough 0.2kg, sauce 0.05l, mozzarella 0.1kg
        (menu_ids[0], "pizza_dough", 0.2),
        (menu_ids[0], "tomato_sauce", 0.05),
        (menu_ids[0], "mozzarella", 0.1),
        # Pepperoni → dough 0.2, sauce 0.05, mozzarella 0.1, pepperoni 0.08
        (menu_ids[1], "pizza_dough", 0.2),
        (menu_ids[1], "tomato_sauce", 0.05),
        (menu_ids[1], "mozzarella", 0.1),
        (menu_ids[1], "pepperoni", 0.08),
        # Capricciosa → dough 0.2, sauce 0.05, mozzarella 0.1, ham 0.06, mushrooms 0.05
        (menu_ids[2], "pizza_dough", 0.2),
        (menu_ids[2], "tomato_sauce", 0.05),
        (menu_ids[2], "mozzarella", 0.1),
        (menu_ids[2], "ham", 0.06),
        (menu_ids[2], "mushrooms", 0.05),
        # Caesar Salad → lettuce 0.1, chicken 0.1, croutons 0.03, parmesan 0.02, dressing 0.04
        (menu_ids[3], "lettuce", 0.1),
        (menu_ids[3], "chicken_breast", 0.1),
        (menu_ids[3], "croutons", 0.03),
        (menu_ids[3], "parmesan", 0.02),
        (menu_ids[3], "caesar_dressing", 0.04),
        # Greek Salad → lettuce 0.1, feta 0.05, olives 0.03, cucumber 0.05, tomato 0.05
        (menu_ids[4], "lettuce", 0.1),
        (menu_ids[4], "feta", 0.05),
        (menu_ids[4], "olives", 0.03),
        (menu_ids[4], "cucumber", 0.05),
        (menu_ids[4], "tomato", 0.05),
        (menu_ids[4], "olive_oil", 0.02),
        # Grilled Salmon → salmon 0.2, vegetables 0.15, olive oil 0.02
        (menu_ids[5], "salmon", 0.2),
        (menu_ids[5], "mixed_vegetables", 0.15),
        (menu_ids[5], "olive_oil", 0.02),
        # Steak → beef 0.25, potato 0.15, olive oil 0.02
        (menu_ids[6], "beef_steak", 0.25),
        (menu_ids[6], "potato", 0.15),
        (menu_ids[6], "olive_oil", 0.02),
        # Tiramisu → mascarpone 0.08, ladyfingers 0.05, coffee 0.02, cocoa 0.01
        (menu_ids[7], "mascarpone", 0.08),
        (menu_ids[7], "ladyfingers", 0.05),
        (menu_ids[7], "coffee", 0.02),
        (menu_ids[7], "cocoa", 0.01),
        # Panna Cotta → cream 0.1, berries 0.03
        (menu_ids[8], "cream", 0.1),
        (menu_ids[8], "berries", 0.03),
        # Coca Cola → 1 kos
        (menu_ids[9], "coca_cola", 1),
        # Voda → 1 kos
        (menu_ids[10], "water", 1),
        # Sok → 1 kos
        (menu_ids[11], "orange_juice", 1),
        # Bruschetta → bread 0.1, tomato 0.08, basil 0.01, olive oil 0.01
        (menu_ids[12], "bread", 0.1),
        (menu_ids[12], "tomato", 0.08),
        (menu_ids[12], "basil", 0.01),
        (menu_ids[12], "olive_oil", 0.01),
        # Calamari → squid 0.15, flour 0.02, olive oil 0.05, tartar_sauce 0.03
        (menu_ids[13], "squid", 0.15),
        (menu_ids[13], "flour", 0.02),
        (menu_ids[13], "olive_oil", 0.05),
        (menu_ids[13], "tartar_sauce", 0.03),
    ]
    for mid, ik, qty in recipes:
        db.add(RecipeItem(menu_item_id=mid, ingredient_id=ing_map[ik], quantity=qty))

    # Seed PLU codes
    plu_data = [
        (menu_ids[0], "101"), (menu_ids[1], "102"), (menu_ids[2], "103"),
        (menu_ids[3], "201"), (menu_ids[4], "202"),
        (menu_ids[5], "301"), (menu_ids[6], "302"),
        (menu_ids[7], "401"), (menu_ids[8], "402"),
        (menu_ids[9], "501"), (menu_ids[10], "502"), (menu_ids[11], "503"),
        (menu_ids[12], "601"), (menu_ids[13], "602"),
    ]
    for mid, plu in plu_data:
        mi = db.query(MenuItem).filter(MenuItem.id == mid).first()
        if mi:
            mi.plu_code = plu

    db.commit()
    db.close()


def create_app() -> FastAPI:
    Base.metadata.create_all(bind=engine)
    # Auto-migration: add missing columns to all known tables
    try:
        from sqlalchemy import inspect, text
        from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime
        table_types = {
            "ingredients": {"supplier_id": "INTEGER", "barcode": "VARCHAR"},
            "menu_items": {"image_url": "VARCHAR", "tax_rate": "FLOAT DEFAULT 0", "allergens": "VARCHAR", "tags": "VARCHAR", "translations": "VARCHAR", "calories": "INTEGER", "protein": "FLOAT", "fat": "FLOAT", "carbs": "FLOAT"},
            "orders": {"tax_total": "FLOAT DEFAULT 0", "scheduled_at": "DATETIME", "notes": "VARCHAR", "tags": "VARCHAR"},
            "order_items": {"tax_rate": "FLOAT DEFAULT 0", "tax_amount": "FLOAT DEFAULT 0", "started_at": "DATETIME", "completed_at": "DATETIME"},
            "customers": {"tags": "VARCHAR"},
            "reservations": {"reminder_sent": "BOOLEAN DEFAULT 0"},
            "purchase_orders": {"created_by": "VARCHAR", "approved_at": "DATETIME", "received_at": "DATETIME"},
            "purchase_order_items": {"received_quantity": "FLOAT DEFAULT 0"},
            "stock_transactions": {"reference": "VARCHAR"},
        }
        _valid_ident = set("abcdefghijklmnopqrstuvwxyz_0123456789")
        insp = inspect(engine)
        for table, cols in table_types.items():
            if table not in insp.get_table_names():
                continue
            existing = {c["name"] for c in insp.get_columns(table)}
            for col, typ in cols.items():
                if col not in existing:
                    if not all(c in _valid_ident for c in table.lower()) or not all(c in _valid_ident for c in col.lower()):
                        continue
                    engine.execute(text(f"ALTER TABLE {table} ADD COLUMN {col} {typ}"))
    except Exception:
        pass
    try:
        from sqlalchemy import inspect
        insp = inspect(engine)
        for tname, model in [("price_rules", PriceRule), ("waitlist_entries", WaitlistEntry), ("order_templates", OrderTemplate), ("cross_sell_items", CrossSellItem), ("service_requests", ServiceRequest)]:
            if tname not in insp.get_table_names():
                model.__table__.create(engine)
    except Exception:
        pass
    try:
        from sqlalchemy import inspect
        insp = inspect(engine)
        if "house_accounts" not in insp.get_table_names():
            HouseAccount.__table__.create(engine)
            HouseAccountTransaction.__table__.create(engine)
    except Exception:
        pass
    seed_data()

    cfg = get_settings()
    app = FastAPI(
        title="POS Blagajna API",
        version="1.0.0",
        description="REST API za restavracijski POS sistem. Avtentikacija, menu, naročila, zaloge, plačila, analitika.",
        docs_url="/docs",
        redoc_url="/redoc",
        response_model_exclude_unset=True,
        openapi_tags=[
            {"name": "auth", "description": "Prijava in avtentikacija"},
            {"name": "menu", "description": "Menu, kategorije, jedi"},
            {"name": "orders", "description": "Naročila in postavke"},
            {"name": "payments", "description": "Plačila in transakcije"},
            {"name": "inventory", "description": "Skladišče in zaloge"},
            {"name": "customers", "description": "Stranke in zvestoba"},
            {"name": "shifts", "description": "Ure delavcev"},
            {"name": "delivery", "description": "Dostava (Wolt, Glovo, FoodHub)"},
            {"name": "analytics", "description": "Analitika in poročila"},
            {"name": "system", "description": "Zdravje sistema"},
            {"name": "settings", "description": "Nastavitve"},
        ],
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=cfg.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.add_middleware(RateLimitMiddleware, requests_per_minute=60)
    app.add_middleware(GZipMiddleware, minimum_size=500)
    app.add_middleware(SecurityHeadersMiddleware)
    app.add_middleware(RequestIdMiddleware)

    import logging, time
    logger = logging.getLogger("pos.access")

    @app.middleware("http")
    async def access_log(request: Request, call_next):
        start = time.time()
        response = await call_next(request)
        elapsed = round((time.time() - start) * 1000)
        if not request.url.path.startswith("/uploads"):
            logger.info(
                "%s %s %d %dms req=%s",
                request.method, request.url.path, response.status_code, elapsed,
                getattr(request.state, "request_id", "-"),
            )
        return response

    api_prefix = cfg.API_V1_STR
    app.include_router(auth.router, prefix=api_prefix)
    app.include_router(menu.router, prefix=api_prefix)
    app.include_router(tables.router, prefix=api_prefix)
    app.include_router(orders.router, prefix=api_prefix)
    app.include_router(payment.router, prefix=api_prefix)
    app.include_router(dashboard.router, prefix=api_prefix)
    app.include_router(kds.router, prefix=api_prefix)
    app.include_router(inventory.router, prefix=api_prefix)
    app.include_router(public.router, prefix=api_prefix)
    app.include_router(analytics.router, prefix=api_prefix)
    app.include_router(settings_router.router, prefix=api_prefix)
    app.include_router(users.router, prefix=api_prefix)
    app.include_router(backup.router, prefix=api_prefix)
    app.include_router(audit_log.router, prefix=api_prefix)
    app.include_router(cash_register.router, prefix=api_prefix)
    app.include_router(modifiers.router, prefix=api_prefix)
    app.include_router(customers.router, prefix=api_prefix)
    app.include_router(courses.router, prefix=api_prefix)
    app.include_router(suppliers.router, prefix=api_prefix)
    app.include_router(reservations.router, prefix=api_prefix)
    app.include_router(shifts.router, prefix=api_prefix)
    app.include_router(gift_cards.router, prefix=api_prefix)
    app.include_router(branches.router, prefix=api_prefix)
    app.include_router(media.router, prefix=api_prefix)
    app.include_router(promotions.router, prefix=api_prefix)
    app.include_router(ratings.router, prefix=api_prefix)
    app.include_router(loyalty.router, prefix=api_prefix)
    app.include_router(marketing.router, prefix=api_prefix)
    app.include_router(invoices.router, prefix=api_prefix)
    app.include_router(search.router, prefix=api_prefix)
    app.include_router(employee_performance.router, prefix=api_prefix)
    app.include_router(catering.router, prefix=api_prefix)
    app.include_router(delivery.router, prefix=api_prefix)
    app.include_router(waste.router, prefix=api_prefix)
    app.include_router(export_router.router, prefix=api_prefix)
    app.include_router(expenses.router, prefix=api_prefix)
    app.include_router(budgets.router, prefix=api_prefix)
    app.include_router(schedule.router, prefix=api_prefix)
    app.include_router(price_rules.router, prefix=api_prefix)
    app.include_router(waitlist.router, prefix=api_prefix)
    app.include_router(order_templates.router, prefix=api_prefix)
    app.include_router(data_import.router, prefix=api_prefix)
    app.include_router(system.router, prefix=api_prefix)
    app.include_router(service_requests.router, prefix=api_prefix)
    app.include_router(tip_pool.router, prefix=api_prefix)
    app.include_router(house_accounts.router, prefix=api_prefix)
    app.include_router(ai.router, prefix=api_prefix)
    app.include_router(printer.router, prefix=api_prefix)
    app.include_router(gamification.router, prefix=api_prefix)
    app.include_router(dynamic_menu.router, prefix=api_prefix)
    app.include_router(messaging.router, prefix=api_prefix)
    app.include_router(predictive.router, prefix=api_prefix)
    app.include_router(upsell.router, prefix=api_prefix)
    app.include_router(feedback.router, prefix=api_prefix)
    app.include_router(voice.router, prefix=api_prefix)
    app.include_router(reports.router, prefix=api_prefix)
    app.include_router(table_qr.router, prefix=api_prefix)
    app.include_router(schedule_calendar.router, prefix=api_prefix)
    app.include_router(barcode.router, prefix=api_prefix)
    app.include_router(loyalty_rewards.router, prefix=api_prefix)
    app.include_router(multi_payment.router, prefix=api_prefix)
    app.include_router(employee_dashboard.router, prefix=api_prefix)
    app.include_router(global_search.router, prefix=api_prefix)
    app.include_router(notifications.router, prefix=api_prefix)
    app.include_router(inventory_analytics.router, prefix=api_prefix)
    app.include_router(feedback_qr.router, prefix=api_prefix)
    app.include_router(kds_timers.router, prefix=api_prefix)
    app.include_router(access_control.router, prefix=api_prefix)
    app.include_router(ai_menu.router, prefix=api_prefix)
    app.include_router(loyalty_realtime.router, prefix=api_prefix)
    app.include_router(supplier_auto.router, prefix=api_prefix)
    app.include_router(shift_swap.router, prefix=api_prefix)
    app.include_router(employee_perf_adv.router, prefix=api_prefix)
    app.include_router(inventory_alerts.router, prefix=api_prefix)
    app.include_router(menu_images.router, prefix=api_prefix)
    app.include_router(menu_allergens.router, prefix=api_prefix)
    app.include_router(order_tracking.router, prefix=api_prefix)
    app.include_router(receipts.router, prefix=api_prefix)
    app.include_router(schedule_templates.router, prefix=api_prefix)
    app.include_router(inventory_batch.router, prefix=api_prefix)
    app.include_router(promotion_engine.router, prefix=api_prefix)
    app.include_router(quality_control.router, prefix=api_prefix)
    app.include_router(expenses_adv.router, prefix=api_prefix)
    app.include_router(branch_management.router, prefix=api_prefix)
    app.include_router(employee_certs.router, prefix=api_prefix)
    app.include_router(reports_advanced.router, prefix=api_prefix)
    app.include_router(communication.router, prefix=api_prefix)
    app.include_router(supplier_management.router, prefix=api_prefix)
    app.include_router(kitchen_advanced.router, prefix=api_prefix)
    app.include_router(menu_engineering.router, prefix=api_prefix)
    app.include_router(customer_experience.router, prefix=api_prefix)
    app.include_router(inventory_advanced.router, prefix=api_prefix)
    app.include_router(schedule_advanced.router, prefix=api_prefix)
    app.include_router(payments_advanced.router, prefix=api_prefix)
    app.include_router(marketing_advanced.router, prefix=api_prefix)
    app.include_router(analytics_advanced.router, prefix=api_prefix)
    app.include_router(loyalty_advanced.router, prefix=api_prefix)
    app.include_router(employee_advanced.router, prefix=api_prefix)
    app.include_router(operations_advanced.router, prefix=api_prefix)
    app.include_router(finance.router, prefix=api_prefix)
    app.include_router(quality_management.router, prefix=api_prefix)
    app.include_router(crm.router, prefix=api_prefix)
    app.include_router(logistics.router, prefix=api_prefix)
    app.include_router(reports_v2.router, prefix=api_prefix)
    app.include_router(marketing_v2.router, prefix=api_prefix)
    app.include_router(employees_v2.router, prefix=api_prefix)
    app.include_router(experience.router, prefix=api_prefix)
    app.include_router(inventory_v2.router, prefix=api_prefix)
    app.include_router(schedule_v2.router, prefix=api_prefix)
    app.include_router(crm_v2.router, prefix=api_prefix)
    app.include_router(finance_v2.router, prefix=api_prefix)
    app.include_router(menu_v2.router, prefix=api_prefix)
    app.include_router(orders_v2.router, prefix=api_prefix)
    app.include_router(kds_v2.router, prefix=api_prefix)
    app.include_router(customers_v2.router, prefix=api_prefix)
    app.include_router(expenses_v2.router, prefix=api_prefix)
    app.include_router(promotions_v2.router, prefix=api_prefix)
    app.include_router(delivery_v2.router, prefix=api_prefix)
    app.include_router(warehouse_v2.router, prefix=api_prefix)
    app.include_router(reports_v3.router, prefix=api_prefix)
    app.include_router(suppliers_v2.router, prefix=api_prefix)
    app.include_router(quality_v2.router, prefix=api_prefix)
    app.include_router(employees_v3.router, prefix=api_prefix)
    app.include_router(loyalty_v2.router, prefix=api_prefix)
    app.include_router(analytics_v2.router, prefix=api_prefix)
    app.include_router(marketing_v3.router, prefix=api_prefix)
    app.include_router(reservations_v2.router, prefix=api_prefix)
    app.include_router(payments_v2.router, prefix=api_prefix)
    app.include_router(cash_v2.router, prefix=api_prefix)
    app.include_router(shifts_v2.router, prefix=api_prefix)
    app.include_router(reports_v4.router, prefix=api_prefix)
    app.include_router(promotions_v3.router, prefix=api_prefix)
    app.include_router(menu_v3.router, prefix=api_prefix)
    app.include_router(audit_v2.router, prefix=api_prefix)
    app.include_router(users_v2.router, prefix=api_prefix)
    app.include_router(tables_v2.router, prefix=api_prefix)
    app.include_router(gift_cards_v2.router, prefix=api_prefix)
    app.include_router(catering_v2.router, prefix=api_prefix)
    app.include_router(invoices_v2.router, prefix=api_prefix)
    app.include_router(ratings_v2.router, prefix=api_prefix)
    app.include_router(backup_v2.router, prefix=api_prefix)
    app.include_router(system_v2.router, prefix=api_prefix)
    app.include_router(barcode_v2.router, prefix=api_prefix)
    app.include_router(feedback_v2.router, prefix=api_prefix)
    app.include_router(branches_v2.router, prefix=api_prefix)
    app.include_router(exports_v2.router, prefix=api_prefix)
    app.include_router(media_v2.router, prefix=api_prefix)
    app.include_router(price_rules_v2.router, prefix=api_prefix)
    app.include_router(waitlist_v2.router, prefix=api_prefix)
    app.include_router(kitchen_v2.router, prefix=api_prefix)
    app.include_router(revenue_v2.router, prefix=api_prefix)
    app.include_router(reservations_v3.router, prefix=api_prefix)
    app.include_router(inventory_v3.router, prefix=api_prefix)
    app.include_router(analytics_v3.router, prefix=api_prefix)
    app.include_router(marketing_v4.router, prefix=api_prefix)
    app.include_router(customers_v3.router, prefix=api_prefix)
    app.include_router(reports_v5.router, prefix=api_prefix)
    app.include_router(finance_v3.router, prefix=api_prefix)
    app.include_router(menu_v4.router, prefix=api_prefix)
    app.include_router(quality_v3.router, prefix=api_prefix)
    app.include_router(staff_v4.router, prefix=api_prefix)
    app.include_router(delivery_v3.router, prefix=api_prefix)
    app.include_router(inventory_v4.router, prefix=api_prefix)
    app.include_router(marketing_v5.router, prefix=api_prefix)
    app.include_router(analytics_v4.router, prefix=api_prefix)
    app.include_router(crm_v3.router, prefix=api_prefix)
    app.include_router(finance_v4.router, prefix=api_prefix)
    app.include_router(menu_v5.router, prefix=api_prefix)
    app.include_router(reports_v6.router, prefix=api_prefix)
    app.include_router(customers_v4.router, prefix=api_prefix)
    app.include_router(inventory_v5.router, prefix=api_prefix)
    app.include_router(staff_v5.router, prefix=api_prefix)
    app.include_router(orders_v3.router, prefix=api_prefix)
    app.include_router(crm_v4.router, prefix=api_prefix)
    app.include_router(finance_v5.router, prefix=api_prefix)
    app.include_router(menu_v6.router, prefix=api_prefix)
    app.include_router(reports_v7.router, prefix=api_prefix)
    app.include_router(delivery_v4.router, prefix=api_prefix)
    app.include_router(loyalty_v3.router, prefix=api_prefix)
    app.include_router(schedule_v3.router, prefix=api_prefix)
    app.include_router(analytics_v5.router, prefix=api_prefix)
    app.include_router(marketing_v6.router, prefix=api_prefix)
    app.include_router(quality_v4.router, prefix=api_prefix)
    app.include_router(expenses_v3.router, prefix=api_prefix)
    app.include_router(promotions_v4.router, prefix=api_prefix)
    app.include_router(orders_v4.router, prefix=api_prefix)
    app.include_router(payments_v3.router, prefix=api_prefix)
    app.include_router(customers_v5.router, prefix=api_prefix)
    app.include_router(schedule_v4.router, prefix=api_prefix)
    app.include_router(staff_v6.router, prefix=api_prefix)
    app.include_router(inventory_v6.router, prefix=api_prefix)
    app.include_router(crm_v5.router, prefix=api_prefix)
    app.include_router(reports_v8.router, prefix=api_prefix)
    app.include_router(marketing_v7.router, prefix=api_prefix)
    app.include_router(analytics_v6.router, prefix=api_prefix)
    app.include_router(menu_v7.router, prefix=api_prefix)
    app.include_router(finance_v6.router, prefix=api_prefix)

    # Mount uploads directory
    uploads_dir = Path(__file__).parent / "uploads"
    uploads_dir.mkdir(exist_ok=True)
    app.mount("/uploads", StaticFiles(directory=str(uploads_dir)), name="uploads")

    frontend_dir = Path(__file__).parent.parent / "frontend" / "dist"
    if frontend_dir.exists():
        from fastapi.responses import FileResponse
        import mimetypes

        receipt_dir = Path(__file__).parent.parent / "receipt_files"
        if receipt_dir.exists():
            app.mount("/receipt_files", StaticFiles(directory=str(receipt_dir)), name="receipt_files")

        @app.get("/manifest.json")
        async def manifest():
            return JSONResponse({
                "name": "POS Blagajna",
                "short_name": "POS",
                "description": "Restavracijski POS sistem",
                "start_url": "/",
                "scope": "/",
                "display": "standalone",
                "orientation": "any",
                "background_color": "#0f0f0f",
                "theme_color": "#059669",
                "icons": [
                    {"src": "/icon-192.svg", "sizes": "192x192", "type": "image/svg+xml"},
                    {"src": "/icon-512.svg", "sizes": "512x512", "type": "image/svg+xml"},
                ]
            })

        @app.api_route("/{full_path:path}", methods=["GET", "HEAD"])
        async def serve_frontend(full_path: str):
            if full_path.startswith("api/"):
                return HTMLResponse(status_code=404)
            fp = frontend_dir / full_path if full_path else frontend_dir / "index.html"
            if fp.exists() and fp.is_file():
                media_type, _ = mimetypes.guess_type(str(fp))
                return FileResponse(str(fp), media_type=media_type)
            return FileResponse(str(frontend_dir / "index.html"), media_type="text/html")

        @app.websocket("/ws")
        async def websocket_endpoint(ws: WebSocket):
            await connect(ws)
            try:
                while True:
                    await ws.receive_text()
            except WebSocketDisconnect:
                disconnect(ws)
            except Exception:
                disconnect(ws)

    # Start auto-backup scheduler
    start_auto_backup()
    return app


app = create_app()



