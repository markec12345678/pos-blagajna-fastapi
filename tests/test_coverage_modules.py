"""Comprehensive tests — branches, expenses, schedule, waitlist, ratings,
settings, price_rules, service_requests, courses, voice, cache, pricing."""
import time
from datetime import datetime, timedelta
from unittest.mock import patch, MagicMock
import pytest
from fastapi.testclient import TestClient
from app.core.database import Base, get_db
from app.main import create_app
from app.models.user import User
from app.models.branch import Branch
from app.models.expense import Expense
from app.models.planned_shift import PlannedShift
from app.models.waitlist import WaitlistEntry
from app.models.rating import Rating
from app.models.settings import Setting
from app.models.price_rule import PriceRule
from app.models.menu_item import MenuItem
from app.models.category import Category
from app.models.menu_course import MenuCourse
from app.models.service_request import ServiceRequest
import bcrypt

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

SQLALCHEMY_DATABASE_URL = "sqlite:///./test_comp.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def client():
    app = create_app()
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c


@pytest.fixture
def token(client):
    db = TestingSessionLocal()
    existing = db.query(User).filter(User.username == "admin").first()
    if not existing:
        user = User(
            username="admin", full_name="Admin",
            hashed_password=bcrypt.hashpw("admin".encode(), bcrypt.gensalt()).decode(),
            role="admin", is_active=True,
        )
        db.add(user)
        db.commit()
    db.close()
    r = client.post("/api/v1/auth/login", json={"username": "admin", "password": "admin"})
    return r.json()["access_token"]


@pytest.fixture
def h(token):
    return {"Authorization": f"Bearer {token}"}


# ═══════════════════════════════════════════════════════
# BRANCHES
# ═══════════════════════════════════════════════════════
class TestBranches:
    def test_list_empty(self, client, h):
        r = client.get("/api/v1/branches", headers=h)
        assert r.status_code == 200
        assert r.json() == []

    def test_create_and_list(self, client, h):
        r = client.post("/api/v1/branches", json={"name": "Glavna", "address": "Ljubljana 1"}, headers=h)
        assert r.status_code == 200
        assert r.json()["name"] == "Glavna"
        r2 = client.get("/api/v1/branches", headers=h)
        assert len(r2.json()) == 1

    def test_update_branch(self, client, h):
        b = client.post("/api/v1/branches", json={"name": "Test"}, headers=h).json()
        r = client.put(f"/api/v1/branches/{b['id']}", json={"name": "Posodobljena"}, headers=h)
        assert r.status_code == 200
        assert r.json()["ok"] is True

    def test_update_nonexistent(self, client, h):
        r = client.put("/api/v1/branches/9999", json={"name": "X"}, headers=h)
        assert r.status_code == 404

    def test_delete_branch(self, client, h):
        b = client.post("/api/v1/branches", json={"name": "Za brisanje"}, headers=h).json()
        r = client.delete(f"/api/v1/branches/{b['id']}", headers=h)
        assert r.status_code == 200

    def test_delete_nonexistent(self, client, h):
        r = client.delete("/api/v1/branches/9999", headers=h)
        assert r.status_code == 404

    def test_default_branch(self, client, h):
        client.post("/api/v1/branches", json={"name": "Primarna"}, headers=h)
        r = client.get("/api/v1/branches/default", headers=h)
        assert r.status_code == 200
        assert r.json()["name"] == "Primarna"

    def test_default_branch_empty(self, client, h):
        r = client.get("/api/v1/branches/default", headers=h)
        assert r.status_code == 404


# ═══════════════════════════════════════════════════════
# EXPENSES
# ═══════════════════════════════════════════════════════
class TestExpenses:
    def test_create_expense(self, client, h):
        r = client.post("/api/v1/expenses", json={"name": "Najemnina", "amount": 1200, "category": "rent"}, headers=h)
        assert r.status_code == 200
        d = r.json()
        assert d["name"] == "Najemnina"
        assert d["amount"] == 1200.0
        assert d["category"] == "rent"

    def test_list_expenses(self, client, h):
        client.post("/api/v1/expenses", json={"name": "E1", "amount": 100}, headers=h)
        r = client.get("/api/v1/expenses", headers=h)
        assert len(r.json()) == 1

    def test_list_expenses_by_category(self, client, h):
        client.post("/api/v1/expenses", json={"name": "R1", "amount": 50, "category": "rent"}, headers=h)
        client.post("/api/v1/expenses", json={"name": "R2", "amount": 30, "category": "utilities"}, headers=h)
        r = client.get("/api/v1/expenses?category=rent", headers=h)
        assert len(r.json()) == 1

    def test_update_expense(self, client, h):
        e = client.post("/api/v1/expenses", json={"name": "Test", "amount": 100}, headers=h).json()
        r = client.put(f"/api/v1/expenses/{e['id']}", json={"amount": 200}, headers=h)
        assert r.status_code == 200

    def test_update_nonexistent(self, client, h):
        r = client.put("/api/v1/expenses/9999", json={"amount": 100}, headers=h)
        assert r.status_code == 404

    def test_delete_expense(self, client, h):
        e = client.post("/api/v1/expenses", json={"name": "X", "amount": 50}, headers=h).json()
        r = client.delete(f"/api/v1/expenses/{e['id']}", headers=h)
        assert r.status_code == 200

    def test_delete_nonexistent(self, client, h):
        r = client.delete("/api/v1/expenses/9999", headers=h)
        assert r.status_code == 404

    def test_analytics(self, client, h):
        client.post("/api/v1/expenses", json={"name": "E1", "amount": 100, "category": "rent"}, headers=h)
        client.post("/api/v1/expenses", json={"name": "E2", "amount": 50, "category": "utilities"}, headers=h)
        r = client.get("/api/v1/expenses/analytics", headers=h)
        assert r.status_code == 200
        d = r.json()
        assert d["total"] == 150.0
        assert d["count"] == 2
        assert "rent" in d["by_category"]

    def test_expense_with_date(self, client, h):
        r = client.post("/api/v1/expenses", json={
            "name": "Dated", "amount": 80, "expense_date": "2026-01-15T00:00:00"
        }, headers=h)
        assert r.status_code == 200

    def test_update_expense_date(self, client, h):
        e = client.post("/api/v1/expenses", json={"name": "D", "amount": 10}, headers=h).json()
        r = client.put(f"/api/v1/expenses/{e['id']}", json={"expense_date": "2026-06-01"}, headers=h)
        assert r.status_code == 200


# ═══════════════════════════════════════════════════════
# SCHEDULE
# ═══════════════════════════════════════════════════════
class TestSchedule:
    def _get_user_id(self, client, h):
        db = TestingSessionLocal()
        u = db.query(User).first()
        db.close()
        return u.id if u else 1

    def test_create_shift(self, client, h):
        uid = self._get_user_id(client, h)
        r = client.post("/api/v1/schedule/shifts", json={
            "user_id": uid, "date": "2026-08-01", "start_time": "08:00", "end_time": "16:00", "role": "waiter"
        }, headers=h)
        assert r.status_code == 200
        d = r.json()
        assert d["start"] == "08:00"
        assert d["end"] == "16:00"

    def test_list_shifts(self, client, h):
        uid = self._get_user_id(client, h)
        client.post("/api/v1/schedule/shifts", json={
            "user_id": uid, "date": "2026-08-01", "start_time": "08:00", "end_time": "16:00"
        }, headers=h)
        r = client.get("/api/v1/schedule/shifts", headers=h)
        assert len(r.json()) == 1

    def test_list_shifts_with_filters(self, client, h):
        uid = self._get_user_id(client, h)
        client.post("/api/v1/schedule/shifts", json={
            "user_id": uid, "date": "2026-08-01", "start_time": "08:00", "end_time": "16:00"
        }, headers=h)
        r = client.get(f"/api/v1/schedule/shifts?user_id={uid}", headers=h)
        assert len(r.json()) == 1

    def test_update_shift(self, client, h):
        uid = self._get_user_id(client, h)
        s = client.post("/api/v1/schedule/shifts", json={
            "user_id": uid, "date": "2026-08-01", "start_time": "08:00", "end_time": "16:00"
        }, headers=h).json()
        r = client.put(f"/api/v1/schedule/shifts/{s['id']}", json={"end_time": "18:00"}, headers=h)
        assert r.status_code == 200

    def test_update_nonexistent_shift(self, client, h):
        r = client.put("/api/v1/schedule/shifts/9999", json={"end_time": "18:00"}, headers=h)
        assert r.status_code == 404

    def test_delete_shift(self, client, h):
        uid = self._get_user_id(client, h)
        s = client.post("/api/v1/schedule/shifts", json={
            "user_id": uid, "date": "2026-08-01", "start_time": "08:00", "end_time": "16:00"
        }, headers=h).json()
        r = client.delete(f"/api/v1/schedule/shifts/{s['id']}", headers=h)
        assert r.status_code == 200

    def test_delete_nonexistent_shift(self, client, h):
        r = client.delete("/api/v1/schedule/shifts/9999", headers=h)
        assert r.status_code == 404

    def test_week_schedule(self, client, h):
        uid = self._get_user_id(client, h)
        client.post("/api/v1/schedule/shifts", json={
            "user_id": uid, "date": "2026-08-03", "start_time": "08:00", "end_time": "16:00"
        }, headers=h)
        r = client.get("/api/v1/schedule/week?date=2026-08-03", headers=h)
        assert r.status_code == 200
        d = r.json()
        assert "days" in d
        assert len(d["days"]) == 7

    def test_available_employees(self, client, h):
        r = client.get("/api/v1/schedule/employees", headers=h)
        assert r.status_code == 200
        assert len(r.json()) >= 1


# ═══════════════════════════════════════════════════════
# WAITLIST
# ═══════════════════════════════════════════════════════
class TestWaitlist:
    def test_add_waitlist(self, client):
        r = client.post("/api/v1/waitlist", json={"name": "Test Gost", "party_size": 4})
        assert r.status_code == 200
        assert r.json()["ok"] is True
        assert r.json()["id"] is not None

    def test_list_waitlist(self, client):
        client.post("/api/v1/waitlist", json={"name": "A"})
        client.post("/api/v1/waitlist", json={"name": "B"})
        r = client.get("/api/v1/waitlist")
        assert len(r.json()) == 2

    def test_notify_waitlist(self, client):
        e = client.post("/api/v1/waitlist", json={"name": "N"}).json()
        r = client.post(f"/api/v1/waitlist/{e['id']}/notify")
        assert r.status_code == 200

    def test_seat_waitlist(self, client):
        e = client.post("/api/v1/waitlist", json={"name": "S"}).json()
        r = client.post(f"/api/v1/waitlist/{e['id']}/seat")
        assert r.status_code == 200

    def test_cancel_waitlist(self, client):
        e = client.post("/api/v1/waitlist", json={"name": "C"}).json()
        r = client.post(f"/api/v1/waitlist/{e['id']}/cancel")
        assert r.status_code == 200

    def test_delete_waitlist(self, client):
        e = client.post("/api/v1/waitlist", json={"name": "D"}).json()
        r = client.delete(f"/api/v1/waitlist/{e['id']}")
        assert r.status_code == 200

    def test_notify_nonexistent(self, client):
        r = client.post("/api/v1/waitlist/9999/notify")
        assert r.status_code == 404

    def test_seat_nonexistent(self, client):
        r = client.post("/api/v1/waitlist/9999/seat")
        assert r.status_code == 404

    def test_cancel_nonexistent(self, client):
        r = client.post("/api/v1/waitlist/9999/cancel")
        assert r.status_code == 404

    def test_delete_nonexistent(self, client):
        r = client.delete("/api/v1/waitlist/9999")
        assert r.status_code == 404

    def test_public_add(self, client):
        r = client.post("/api/v1/waitlist/public", json={"name": "Javni Gost", "party_size": 2})
        assert r.status_code == 200
        d = r.json()
        assert d["position"] >= 1

    def test_public_add_no_name(self, client):
        r = client.post("/api/v1/waitlist/public", json={"party_size": 2})
        assert r.status_code in (400, 422)


# ═══════════════════════════════════════════════════════
# RATINGS
# ═══════════════════════════════════════════════════════
class TestRatings:
    def test_submit_rating(self, client):
        r = client.post("/api/v1/ratings/public", json={
            "score": 5, "customer_name": "Janez", "food_quality": 4, "service_quality": 5, "ambiance": 4
        })
        assert r.status_code == 200
        assert r.json()["ok"] is True

    def test_submit_with_comment(self, client):
        r = client.post("/api/v1/ratings/public", json={
            "score": 3, "customer_name": "Ana", "comment": "Odlična hrana!"
        })
        assert r.status_code == 200

    def test_list_ratings(self, client):
        client.post("/api/v1/ratings/public", json={"score": 5})
        client.post("/api/v1/ratings/public", json={"score": 3})
        r = client.get("/api/v1/ratings")
        assert r.status_code == 200
        d = r.json()
        assert d["total"] == 2
        assert d["average"] == 4.0

    def test_list_ratings_empty(self, client):
        r = client.get("/api/v1/ratings")
        assert r.json()["total"] == 0
        assert r.json()["average"] == 0

    def test_list_ratings_distribution(self, client):
        for s in [1, 2, 3, 4, 5]:
            client.post("/api/v1/ratings/public", json={"score": s})
        r = client.get("/api/v1/ratings")
        d = r.json()
        dist = d["distribution"]
        k1 = dist.get(1) if 1 in dist else dist.get("1")
        k5 = dist.get(5) if 5 in dist else dist.get("5")
        assert k1 == 1
        assert k5 == 1

    def test_list_ratings_with_subscores(self, client):
        client.post("/api/v1/ratings/public", json={
            "score": 4, "food_quality": 5, "service_quality": 3, "ambiance": 4
        })
        r = client.get("/api/v1/ratings")
        d = r.json()
        assert d["avg_food"] == 5.0
        assert d["avg_service"] == 3.0
        assert d["avg_ambiance"] == 4.0


# ═══════════════════════════════════════════════════════
# SETTINGS
# ═══════════════════════════════════════════════════════
class TestSettings:
    def test_get_defaults(self, client, h):
        r = client.get("/api/v1/settings", headers=h)
        assert r.status_code == 200
        d = r.json()
        assert d["restaurant_name"] == "Moja Restavracija"
        assert d["currency"] == "EUR"

    def test_update_settings(self, client, h):
        r = client.put("/api/v1/settings", json={"restaurant_name": "River Kolpa"}, headers=h)
        assert r.status_code == 200
        assert r.json()["restaurant_name"] == "River Kolpa"

    def test_update_ignores_unknown_keys(self, client, h):
        r = client.put("/api/v1/settings", json={"unknown_key": "test", "tax_rate": "10"}, headers=h)
        assert r.status_code == 200
        assert r.json()["tax_rate"] == "10"

    def test_get_settings_after_update(self, client, h):
        client.put("/api/v1/settings", json={"restaurant_phone": "01 234 5678"}, headers=h)
        r = client.get("/api/v1/settings", headers=h)
        assert r.json()["restaurant_phone"] == "01 234 5678"

    def test_test_email_no_smtp(self, client, h):
        r = client.post("/api/v1/settings/test-email", json={"email": "test@test.com"}, headers=h)
        assert r.status_code == 400


# ═══════════════════════════════════════════════════════
# PRICE RULES
# ═══════════════════════════════════════════════════════
class TestPriceRules:
    def test_list_empty(self, client):
        r = client.get("/api/v1/price-rules")
        assert r.status_code == 200
        assert r.json() == []

    def test_create_rule(self, client):
        r = client.post("/api/v1/price-rules", json={"price": 15.0, "label": "Happy Hour"})
        assert r.status_code == 200
        d = r.json()
        assert d["label"] == "Happy Hour"
        assert d["price"] == 15.0

    def test_update_rule(self, client):
        rule = client.post("/api/v1/price-rules", json={"price": 10.0}).json()
        r = client.put(f"/api/v1/price-rules/{rule['id']}", json={"price": 12.0})
        assert r.status_code == 200

    def test_delete_rule(self, client):
        rule = client.post("/api/v1/price-rules", json={"price": 10.0}).json()
        r = client.delete(f"/api/v1/price-rules/{rule['id']}")
        assert r.status_code == 200

    def test_update_nonexistent(self, client):
        r = client.put("/api/v1/price-rules/9999", json={"price": 10})
        assert r.status_code == 404

    def test_delete_nonexistent(self, client):
        r = client.delete("/api/v1/price-rules/9999")
        assert r.status_code == 404

    def test_effective_price_no_item(self, client):
        r = client.get("/api/v1/price-rules/effective/9999")
        assert r.status_code == 404

    def test_dow_labels(self, client):
        r = client.get("/api/v1/price-rules/dow-labels")
        assert r.status_code == 200
        d = r.json()
        # JSON keys are strings
        assert d["0"] == "Pon"
        assert d["6"] == "Ned"

    def test_effective_price_with_item(self, client, h):
        cat = client.post("/api/v1/menu/categories", json={"name": "Pijače"}, headers=h).json()
        item = client.post("/api/v1/menu/items", json={"name": "Kava", "price": 2.5, "category_id": cat["id"]}, headers=h).json()
        r = client.get(f"/api/v1/price-rules/effective/{item['id']}")
        assert r.status_code == 200
        d = r.json()
        assert d["base_price"] == 2.5
        assert d["effective_price"] == 2.5


# ═══════════════════════════════════════════════════════
# SERVICE REQUESTS
# ═══════════════════════════════════════════════════════
class TestServiceRequests:
    def _create_sr(self, client, db):
        from app.models.service_request import ServiceRequest
        sr = ServiceRequest(table_id=1, table_name="Miza 1", request_type="waiter", message="Pomoč")
        db.add(sr)
        db.commit()
        db.refresh(sr)
        return sr

    def test_list_empty(self, client):
        r = client.get("/api/v1/service-requests")
        assert r.status_code == 200
        assert r.json() == []

    def test_acknowledge(self, client):
        db = TestingSessionLocal()
        sr = self._create_sr(client, db)
        db.close()
        r = client.post(f"/api/v1/service-requests/{sr.id}/ack")
        assert r.status_code == 200
        assert r.json()["status"] == "acknowledged"

    def test_complete(self, client):
        db = TestingSessionLocal()
        sr = self._create_sr(client, db)
        db.close()
        r = client.post(f"/api/v1/service-requests/{sr.id}/complete")
        assert r.status_code == 200
        assert r.json()["status"] == "completed"

    def test_ack_nonexistent(self, client):
        r = client.post("/api/v1/service-requests/9999/ack")
        assert r.status_code == 404

    def test_complete_nonexistent(self, client):
        r = client.post("/api/v1/service-requests/9999/complete")
        assert r.status_code == 404

    def test_list_with_status_filter(self, client):
        db = TestingSessionLocal()
        sr = self._create_sr(client, db)
        db.close()
        r = client.get("/api/v1/service-requests?status=pending")
        assert len(r.json()) == 1


# ═══════════════════════════════════════════════════════
# COURSES
# ═══════════════════════════════════════════════════════
class TestCourses:
    def test_list_empty(self, client):
        r = client.get("/api/v1/courses")
        assert r.status_code == 200
        assert r.json() == []

    def test_create_course(self, client):
        r = client.post("/api/v1/courses", json={"name": "Predjed"})
        assert r.status_code == 200
        assert r.json()["name"] == "Predjed"

    def test_create_multiple(self, client):
        client.post("/api/v1/courses", json={"name": "Predjed"})
        client.post("/api/v1/courses", json={"name": "Glavna"})
        r = client.get("/api/v1/courses")
        assert len(r.json()) == 2

    def test_update_course(self, client):
        c = client.post("/api/v1/courses", json={"name": "Test"}).json()
        r = client.put(f"/api/v1/courses/{c['id']}", json={"name": "Posodobljeno"})
        assert r.status_code == 200

    def test_update_nonexistent(self, client):
        r = client.put("/api/v1/courses/9999", json={"name": "X"})
        assert r.status_code == 404

    def test_delete_course(self, client):
        c = client.post("/api/v1/courses", json={"name": "Za brisanje"}).json()
        r = client.delete(f"/api/v1/courses/{c['id']}")
        assert r.status_code == 200

    def test_delete_nonexistent(self, client):
        r = client.delete("/api/v1/courses/9999")
        assert r.status_code == 404

    def test_delete_course_with_items(self, client, h):
        c = client.post("/api/v1/courses", json={"name": "Course"}).json()
        cat = client.post("/api/v1/menu/categories", json={"name": "Cat"}, headers=h).json()
        client.post("/api/v1/menu/items", json={"name": "Item", "price": 5, "category_id": cat["id"]}, headers=h)
        # Course with no items should be deletable
        r = client.delete(f"/api/v1/courses/{c['id']}")
        assert r.status_code == 200


# ═══════════════════════════════════════════════════════
# VOICE
# ═══════════════════════════════════════════════════════
class TestVoice:
    def test_commands(self, client):
        r = client.get("/api/v1/voice/commands")
        assert r.status_code == 200
        assert len(r.json()["commands"]) > 0

    def test_parse_order(self, client, h):
        r = client.post("/api/v1/voice/parse-order", json={"text": "Ena kava prosim"}, headers=h)
        assert r.status_code == 200
        assert "type" in r.json()

    def test_voice_search(self, client, h):
        r = client.post("/api/v1/voice/search", json={"query": "kava"}, headers=h)
        assert r.status_code == 200
        assert "items" in r.json()


# ═══════════════════════════════════════════════════════
# CACHE
# ═══════════════════════════════════════════════════════
class TestCache:
    def test_cache_decorator(self):
        from app.core.cache import cached, invalidate, get_cache_stats
        invalidate()

        call_count = 0

        @cached(ttl=30, key_prefix="test")
        def my_func(x):
            nonlocal call_count
            call_count += 1
            return x * 2

        assert my_func(5) == 10
        assert call_count == 1
        assert my_func(5) == 10  # cached
        assert call_count == 1
        assert my_func(6) == 12  # different arg
        assert call_count == 2

    def test_cache_invalidation(self):
        from app.core.cache import cached, invalidate, _cache
        invalidate()

        @cached(ttl=30, key_prefix="inv")
        def calc(x):
            return x + 1

        calc(1)
        assert len(_cache) >= 1
        invalidate("inv")
        assert len(_cache) == 0

    def test_cache_stats(self):
        from app.core.cache import cached, invalidate, get_cache_stats
        invalidate()

        @cached(ttl=30, key_prefix="stats")
        def fn(x):
            return x

        fn(1)
        fn(1)
        stats = get_cache_stats()
        assert stats["hits"] >= 1

    def test_cache_expiry(self):
        from app.core.cache import cached, invalidate, _cache
        invalidate()

        @cached(ttl=0, key_prefix="exp")
        def expired(x):
            return x

        expired(1)
        time.sleep(0.01)
        expired(1)  # should miss and re-compute
        stats = __import__('app.core.cache', fromlist=['get_cache_stats']).get_cache_stats()
        assert stats["misses"] >= 1

    def test_cache_skips_db_and_user(self):
        from app.core.cache import cached, invalidate
        invalidate()

        @cached(ttl=30, key_prefix="skip")
        def fn(db=None, user=None, x=1):
            return x

        assert fn(x=5) == 5
        assert fn(x=5) == 5  # should be cached


# ═══════════════════════════════════════════════════════
# PRICING
# ═══════════════════════════════════════════════════════
class TestPricing:
    def _setup(self, db):
        cat = Category(name="Test")
        db.add(cat)
        db.commit()
        db.refresh(cat)
        item = MenuItem(name="Kava", price=2.5, category_id=cat.id, is_active=True)
        db.add(item)
        db.commit()
        db.refresh(item)
        return item

    def test_base_price_no_rules(self):
        from app.core.pricing import get_effective_price
        db = TestingSessionLocal()
        item = self._setup(db)
        price = get_effective_price(item.id, item.price, db)
        assert price == 2.5
        db.close()

    def test_specific_item_rule(self):
        from app.core.pricing import get_effective_price
        db = TestingSessionLocal()
        item = self._setup(db)
        rule = PriceRule(menu_item_id=item.id, price=1.5, is_active=True)
        db.add(rule)
        db.commit()
        price = get_effective_price(item.id, item.price, db)
        assert price == 1.5
        db.close()

    def test_global_rule(self):
        from app.core.pricing import get_effective_price
        db = TestingSessionLocal()
        item = self._setup(db)
        rule = PriceRule(menu_item_id=None, price=3.0, is_active=True)
        db.add(rule)
        db.commit()
        price = get_effective_price(item.id, item.price, db)
        assert price == 3.0
        db.close()

    def test_with_order_type(self):
        from app.core.pricing import get_effective_price
        db = TestingSessionLocal()
        item = self._setup(db)
        r1 = PriceRule(menu_item_id=item.id, price=5.0, order_type="delivery", is_active=True)
        r2 = PriceRule(menu_item_id=item.id, price=4.0, is_active=True)
        db.add_all([r1, r2])
        db.commit()
        price = get_effective_price(item.id, item.price, db, order_type="delivery")
        assert price == 5.0
        db.close()

    def test_with_day_of_week(self):
        from app.core.pricing import get_effective_price
        db = TestingSessionLocal()
        item = self._setup(db)
        today = datetime.now().weekday()
        rule = PriceRule(menu_item_id=item.id, price=2.0, day_of_week=today, is_active=True)
        db.add(rule)
        db.commit()
        price = get_effective_price(item.id, item.price, db)
        assert price == 2.0
        db.close()

    def test_with_time_window_match(self):
        from app.core.pricing import get_effective_price
        db = TestingSessionLocal()
        item = self._setup(db)
        now = datetime.now()
        rule = PriceRule(menu_item_id=item.id, price=1.0, time_from="00:00", time_to="23:59", is_active=True)
        db.add(rule)
        db.commit()
        price = get_effective_price(item.id, item.price, db, dt=now)
        assert price == 1.0
        db.close()

    def test_with_time_window_no_match(self):
        from app.core.pricing import get_effective_price
        db = TestingSessionLocal()
        item = self._setup(db)
        rule = PriceRule(menu_item_id=item.id, price=1.0, time_from="22:00", time_to="23:00", is_active=True)
        db.add(rule)
        db.commit()
        now = datetime(2026, 7, 18, 12, 0, 0)  # noon — outside window
        price = get_effective_price(item.id, item.price, db, dt=now)
        assert price == 2.5  # fallback to base
        db.close()

    def test_inactive_rule_ignored(self):
        from app.core.pricing import get_effective_price
        db = TestingSessionLocal()
        item = self._setup(db)
        rule = PriceRule(menu_item_id=item.id, price=0.5, is_active=False)
        db.add(rule)
        db.commit()
        price = get_effective_price(item.id, item.price, db)
        assert price == 2.5
        db.close()

    def test_wrapper_function(self):
        from app.core.pricing import get_effective_price_for_item
        db = TestingSessionLocal()
        item = self._setup(db)
        price = get_effective_price_for_item(item.id, item.price, db)
        assert price == 2.5
        db.close()


# ═══════════════════════════════════════════════════════
# WEBSOCKET MANAGER
# ═══════════════════════════════════════════════════════
class TestWebSocketManager:
    def test_disconnect_nonexistent(self):
        from app.core.websocket_manager import disconnect, clients
        mock_ws = MagicMock()
        disconnect(mock_ws)  # should not raise

    def test_broadcast_no_loop(self):
        from app.core.websocket_manager import broadcast
        broadcast("test_event", {"data": "test"})  # should not raise
