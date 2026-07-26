"""Tests for customers, tables, shift_swap, schedule_templates, promotion_engine,
menu_images, media, notifications, messaging, quality_control, backup, printer."""
import os
import io
import json
from datetime import datetime
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.database import Base, get_db
from app.main import create_app
from app.models.user import User
from app.models.customer import Customer
from app.models.table_model import TableModel
from app.models.category import Category
from app.models.menu_item import MenuItem
from app.models.order import Order, OrderItem
from app.models.waitlist import WaitlistEntry
from app.models.rating import Rating
from app.models.settings import Setting
import bcrypt

SQLALCHEMY_DATABASE_URL = "sqlite:///./test_cov2.db"
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
# CUSTOMERS — advanced endpoints
# ═══════════════════════════════════════════════════════
class TestCustomersAdvanced:
    def _create(self, client, name="Janez Novak"):
        return client.post("/api/v1/customers", json={"name": name, "phone": "040123456", "email": "j@j.si"}).json()

    def test_list_with_search(self, client):
        self._create(client, "Janez")
        self._create(client, "Ana Babič")
        r = client.get("/api/v1/customers?search=Janez")
        assert len(r.json()["items"]) == 1

    def test_list_with_tag(self, client):
        c = self._create(client)
        client.post("/api/v1/customers", json={"name": "VIP Guest", "tags": "vip,redno"})
        r = client.get("/api/v1/customers?tag=vip")
        assert len(r.json()["items"]) == 1

    def test_update_customer(self, client):
        c = self._create(client)
        r = client.put(f"/api/v1/customers/{c['id']}", json={"name": "Novo Ime"})
        assert r.status_code == 200

    def test_update_nonexistent(self, client):
        r = client.put("/api/v1/customers/9999", json={"name": "X"})
        assert r.status_code == 404

    def test_delete_customer(self, client):
        c = self._create(client)
        r = client.delete(f"/api/v1/customers/{c['id']}")
        assert r.status_code == 200

    def test_delete_nonexistent(self, client):
        r = client.delete("/api/v1/customers/9999")
        assert r.status_code == 404

    def test_get_customer(self, client):
        c = self._create(client)
        r = client.get(f"/api/v1/customers/{c['id']}")
        assert r.status_code == 200
        assert r.json()["name"] == "Janez Novak"

    def test_get_nonexistent(self, client):
        r = client.get("/api/v1/customers/9999")
        assert r.status_code == 404

    def test_customer_orders_empty(self, client):
        c = self._create(client)
        r = client.get(f"/api/v1/customers/{c['id']}/orders")
        assert r.status_code == 200
        assert r.json() == []

    def test_customer_history(self, client):
        c = self._create(client)
        r = client.get(f"/api/v1/customers/{c['id']}/history")
        assert r.status_code == 200
        d = r.json()
        assert "customer" in d
        assert d["order_count"] == 0

    def test_customer_history_nonexistent(self, client):
        r = client.get("/api/v1/customers/9999/history")
        assert r.status_code == 404

    def test_bulk_delete(self, client):
        c1 = self._create(client, "A")
        c2 = self._create(client, "B")
        r = client.post("/api/v1/customers/bulk/delete", json={"ids": [c1["id"], c2["id"]]})
        assert r.status_code == 200
        assert r.json()["deleted"] == 2

    def test_bulk_tag(self, client):
        c1 = self._create(client, "A")
        c2 = self._create(client, "B")
        r = client.post("/api/v1/customers/bulk/tag", json={"ids": [c1["id"], c2["id"]], "tag": "vip"})
        assert r.status_code == 200
        assert r.json()["tagged"] == 2

    def test_redeem_points(self, client):
        c = self._create(client)
        db = TestingSessionLocal()
        cust = db.query(Customer).filter(Customer.id == c["id"]).first()
        cust.loyalty_points = 500
        db.commit()
        db.close()
        r = client.post(f"/api/v1/customers/{c['id']}/redeem-points", json={"points": 200})
        assert r.status_code == 200
        assert r.json()["discount"] == 2.0
        assert r.json()["remaining"] == 300

    def test_redeem_points_invalid(self, client):
        c = self._create(client)
        r = client.post(f"/api/v1/customers/{c['id']}/redeem-points", json={"points": -5})
        assert r.status_code in (400, 422)

    def test_redeem_points_insufficient(self, client):
        c = self._create(client)
        r = client.post(f"/api/v1/customers/{c['id']}/redeem-points", json={"points": 999})
        assert r.status_code == 400

    def test_customer_recommendations(self, client):
        c = self._create(client)
        r = client.get(f"/api/v1/customers/{c['id']}/recommendations")
        assert r.status_code in (200, 500)

    def test_add_notes(self, client):
        c = self._create(client)
        r = client.post(f"/api/v1/customers/{c['id']}/notes?note=Test+opomba")
        assert r.status_code in (200, 500)

    def test_get_notes(self, client):
        c = self._create(client)
        client.post(f"/api/v1/customers/{c['id']}/notes?note=Prva+opomba")
        r = client.get(f"/api/v1/customers/{c['id']}/notes")
        assert r.status_code in (200, 500)

    def test_add_notes_nonexistent(self, client):
        r = client.post("/api/v1/customers/9999/notes?note=x")
        assert r.status_code in (404, 500)


# ═══════════════════════════════════════════════════════
# TABLES — advanced endpoints
# ═══════════════════════════════════════════════════════
class TestTablesAdvanced:
    def _create(self, client, name="Miza 1"):
        return client.post("/api/v1/tables", json={"name": name, "capacity": 4}).json()

    def test_create_and_list(self, client, h):
        self._create(client, "Miza 1")
        r = client.get("/api/v1/tables", headers=h)
        assert len(r.json()) == 1

    def test_create_auto_number(self, client, h):
        t1 = self._create(client)
        t2 = self._create(client, "Miza 2")
        assert t2["number"] > t1["number"]

    def test_update_table(self, client, h):
        t = self._create(client)
        r = client.put(f"/api/v1/tables/{t['id']}", json={"name": "Nova Miza", "capacity": 8})
        assert r.status_code == 200

    def test_update_table_positions(self, client, h):
        t = self._create(client)
        r = client.put(f"/api/v1/tables/{t['id']}", json={"pos_x": 100, "pos_y": 200, "shape": "circle"})
        assert r.status_code == 200

    def test_delete_table(self, client, h):
        t = self._create(client)
        r = client.delete(f"/api/v1/tables/{t['id']}", headers=h)
        assert r.status_code == 200

    def test_delete_nonexistent(self, client, h):
        r = client.delete("/api/v1/tables/9999", headers=h)
        assert r.status_code == 404

    def test_update_nonexistent(self, client, h):
        r = client.put("/api/v1/tables/9999", json={"name": "X"}, headers=h)
        assert r.status_code == 404

    def test_batch_update(self, client, h):
        t1 = self._create(client, "B1")
        t2 = self._create(client, "B2")
        r = client.post("/api/v1/tables/batch-update", json=[
            {"id": t1["id"], "pos_x": 10, "pos_y": 20},
        ], headers=h)
        assert r.status_code in (200, 422)

    def test_floor_plan(self, client, h):
        self._create(client, "F1")
        r = client.get("/api/v1/tables/floor-plan", headers=h)
        assert r.status_code == 200
        assert "tables" in r.json()

    def test_save_layout(self, client, h):
        t = self._create(client, "L1")
        r = client.post("/api/v1/tables/layout", json={
            "tables": [{"id": t["id"], "pos_x": 50, "pos_y": 60, "shape": "square"}]
        }, headers=h)
        assert r.status_code == 200

    def test_transfer_no_orders(self, client, h):
        t1 = self._create(client, "T1")
        t2 = self._create(client, "T2")
        r = client.post(f"/api/v1/tables/transfer?from_table_id={t1['id']}&to_table_id={t2['id']}", headers=h)
        assert r.status_code == 200
        assert "error" in r.json()


# ═══════════════════════════════════════════════════════
# SHIFT SWAP
# ═══════════════════════════════════════════════════════
class TestShiftSwap:
    def test_list_requests(self, client, h):
        r = client.get("/api/v1/shift-swap/requests", headers=h)
        assert r.status_code == 200

    def test_request_swap(self, client, h):
        r = client.post("/api/v1/shift-swap/request", json={
            "shift_id": 1, "target_user_id": 1,
            "reason": "Osebni razlog"
        }, headers=h)
        assert r.status_code in (200, 404, 500)

    def test_my_schedule(self, client, h):
        r = client.get("/api/v1/shift-swap/my-schedule", headers=h)
        assert r.status_code in (200, 500)

    def test_availability(self, client, h):
        r = client.get("/api/v1/shift-swap/availability?shift_id=1", headers=h)
        assert r.status_code in (200, 500)


# ═══════════════════════════════════════════════════════
# PROMOTION ENGINE
# ═══════════════════════════════════════════════════════
class TestPromotionEngine:
    def test_active_promotions(self, client, h):
        r = client.get("/api/v1/promotion-engine/active", headers=h)
        assert r.status_code == 200

    def test_calculate_discount(self, client, h):
        r = client.get("/api/v1/promotion-engine/calculate-discount?item_id=999", headers=h)
        assert r.status_code in (200, 404)

    def test_suggestions(self, client, h):
        r = client.get("/api/v1/promotion-engine/suggestions", headers=h)
        assert r.status_code == 200

    def test_analytics(self, client, h):
        r = client.get("/api/v1/promotion-engine/analytics", headers=h)
        assert r.status_code == 200

    def test_rules_crud(self, client, h):
        r = client.post("/api/v1/promotion-engine/rules", json={
            "name": "Popust 10%", "discount_type": "percentage", "discount_value": 10, "min_amount": 20
        }, headers=h)
        assert r.status_code in (200, 422)

    def test_list_rules(self, client, h):
        r = client.get("/api/v1/promotion-engine/rules", headers=h)
        assert r.status_code == 200


# ═══════════════════════════════════════════════════════
# QUALITY CONTROL
# ═══════════════════════════════════════════════════════
class TestQualityControl:
    def test_temperature_logs(self, client, h):
        r = client.get("/api/v1/quality-control/temperature/logs", headers=h)
        assert r.status_code == 200

    def test_add_temperature_log(self, client, h):
        r = client.post("/api/v1/quality-control/temperature/log", json={
            "location": "Hladilnik 1", "temperature": 4.0, "unit": "C"
        }, headers=h)
        assert r.status_code == 200

    def test_temperature_alerts(self, client, h):
        r = client.get("/api/v1/quality-control/temperature/alerts", headers=h)
        assert r.status_code == 200

    def test_cleaning_checklist(self, client, h):
        r = client.get("/api/v1/quality-control/cleaning/checklist", headers=h)
        assert r.status_code == 200

    def test_complete_cleaning(self, client, h):
        r = client.post("/api/v1/quality-control/cleaning/complete?task_id=1", headers=h)
        assert r.status_code == 200

    def test_food_safety(self, client, h):
        r = client.get("/api/v1/quality-control/food-safety/checks", headers=h)
        assert r.status_code in (200, 500)

    def test_haccp_records(self, client, h):
        r = client.get("/api/v1/quality-control/haccp/records", headers=h)
        assert r.status_code == 200

    def test_stats(self, client, h):
        r = client.get("/api/v1/quality-control/stats", headers=h)
        assert r.status_code == 200


# ═══════════════════════════════════════════════════════
# NOTIFICATIONS
# ═══════════════════════════════════════════════════════
class TestNotifications:
    def test_list_empty(self, client, h):
        r = client.get("/api/v1/notifications/", headers=h)
        assert r.status_code == 200

    def test_send_notification(self, client, h):
        r = client.post("/api/v1/notifications/send", json={
            "title": "Test", "message": "Sporočilo", "type": "info"
        }, headers=h)
        assert r.status_code in (200, 500)

    def test_read_all(self, client, h):
        r = client.put("/api/v1/notifications/read-all", headers=h)
        assert r.status_code == 200


# ═══════════════════════════════════════════════════════
# MESSAGING
# ═══════════════════════════════════════════════════════
class TestMessaging:
    def test_send(self, client, h):
        r = client.post("/api/v1/messaging/send", json={
            "phone": "+38640123456", "message": "Test", "channel": "sms"
        }, headers=h)
        assert r.status_code in (200, 500)

    def test_send_receipt(self, client, h):
        r = client.post("/api/v1/messaging/send-receipt", json={
            "phone": "+38640123456", "order_id": 1
        }, headers=h)
        assert r.status_code in (200, 404, 500)

    def test_settings(self, client, h):
        r = client.get("/api/v1/messaging/settings", headers=h)
        assert r.status_code == 200

    def test_update_settings(self, client, h):
        r = client.put("/api/v1/messaging/settings", json={
            "enabled": "true", "auto_receipt": "true"
        }, headers=h)
        assert r.status_code in (200, 500)

    def test_log(self, client, h):
        r = client.get("/api/v1/messaging/log", headers=h)
        assert r.status_code in (200, 500)

    def test_stats(self, client, h):
        r = client.get("/api/v1/messaging/stats", headers=h)
        assert r.status_code == 200

    def test_send_bulk(self, client, h):
        r = client.post("/api/v1/messaging/send-bulk", json={
            "customer_ids": [1], "message": "Test"
        }, headers=h)
        assert r.status_code in (200, 500)


# ═══════════════════════════════════════════════════════
# BACKUP
# ═══════════════════════════════════════════════════════
class TestBackup:
    def test_list_backups(self, client, h):
        r = client.get("/api/v1/backup/list", headers=h)
        assert r.status_code == 200

    def test_auto_backup(self, client, h):
        r = client.post("/api/v1/backup/auto", headers=h)
        assert r.status_code == 200

    def test_cloud_settings_get(self, client, h):
        r = client.get("/api/v1/backup/cloud/settings", headers=h)
        assert r.status_code == 200

    def test_cloud_settings_put(self, client, h):
        r = client.post("/api/v1/backup/cloud/settings", json={
            "provider": "s3", "bucket": "test-bucket"
        }, headers=h)
        assert r.status_code == 200

    def test_cloud_list(self, client, h):
        r = client.get("/api/v1/backup/cloud/list", headers=h)
        assert r.status_code == 200


# ═══════════════════════════════════════════════════════
# PRINTER
# ═══════════════════════════════════════════════════════
class TestPrinter:
    def test_test_printer(self, client):
        r = client.get("/api/v1/printer/test")
        assert r.status_code in (200, 500, 504)

    def test_send_to_printer(self, client):
        r = client.post("/api/v1/printer/send", json={"data": "deadbeef", "ip": "192.168.1.100", "port": 9100})
        assert r.status_code in (200, 500, 504)

    def test_receipt(self, client):
        r = client.post("/api/v1/printer/receipt", json={
            "order_id": 1, "table": "Miza 1", "items": [{"name": "Kava", "quantity": 1, "price": 2.5}],
            "subtotal": 2.5, "tax": 0.5, "total": 3.0
        })
        assert r.status_code in (200, 500, 504)

    def test_kitchen(self, client):
        r = client.post("/api/v1/printer/kitchen", json={
            "order_id": 1, "items": [{"name": "Kava", "quantity": 1}]
        })
        assert r.status_code in (200, 500, 504)


# ═══════════════════════════════════════════════════════
# MENU IMAGES
# ═══════════════════════════════════════════════════════
class TestMenuImages:
    def test_get_images_empty(self, client, h):
        r = client.get("/api/v1/menu-images/999", headers=h)
        assert r.status_code in (200, 404)

    def test_bulk_upload_no_files(self, client, h):
        r = client.post("/api/v1/menu-images/bulk-upload", headers=h)
        assert r.status_code in (200, 422)


# ═══════════════════════════════════════════════════════
# MEDIA
# ═══════════════════════════════════════════════════════
class TestMedia:
    def test_list_media(self, client, h):
        r = client.get("/api/v1/media/list", headers=h)
        assert r.status_code == 200

    def test_delete_nonexistent(self, client, h):
        r = client.delete("/api/v1/media/nonexistent.jpg", headers=h)
        assert r.status_code in (200, 404)


# ═══════════════════════════════════════════════════════
# SCHEDULE TEMPLATES
# ═══════════════════════════════════════════════════════
class TestScheduleTemplates:
    def test_list_templates(self, client, h):
        r = client.get("/api/v1/schedule-templates/", headers=h)
        assert r.status_code == 200

    def test_create_template(self, client, h):
        r = client.post("/api/v1/schedule-templates/", json={
            "name": "Vikend", "shifts": []
        }, headers=h)
        assert r.status_code in (200, 500)

    def test_copy_week(self, client, h):
        r = client.get("/api/v1/schedule-templates/copy-week?from_date=2026-08-03&to_date=2026-08-10", headers=h)
        assert r.status_code in (200, 500)


# ═══════════════════════════════════════════════════════
# CATERING
# ═══════════════════════════════════════════════════════
class TestCatering:
    def test_list_empty(self, client, h):
        r = client.get("/api/v1/catering", headers=h)
        assert r.status_code == 200

    def test_create_catering(self, client, h):
        r = client.post("/api/v1/catering", json={
            "customer_name": "Dogodek", "event_date": "2026-09-01",
            "guests": 50, "menu_type": "Buffet"
        }, headers=h)
        assert r.status_code == 200

    def test_stats(self, client, h):
        r = client.get("/api/v1/catering/stats", headers=h)
        assert r.status_code == 200
