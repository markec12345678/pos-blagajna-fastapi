"""Tests for menu.py, backup.py, printer.py, notifications.py, messaging.py — coverage expansion."""
import json, os, pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from app.models.category import Category
from app.models.menu_item import MenuItem, ComboItem, MenuVersion, CrossSellItem
from app.models.inventory import RecipeItem, Ingredient
from app.models.notification import Notification
from app.models.customer import Customer
from app.models.order import Order, OrderItem
from app.models.settings import Setting


# ═══════════════════════════════════════════
# MENU.PY — 28 endpoints
# ═══════════════════════════════════════════
class TestMenuCategories:
    def test_get_badge_presets(self, client):
        r = client.get("/api/v1/menu/badge-presets")
        assert r.status_code == 200
        data = r.json()
        assert len(data) >= 10
        assert data[0]["value"] == "Vegan"

    def test_get_menu_empty(self, client):
        r = client.get("/api/v1/menu")
        assert r.status_code == 200
        assert r.json() == []

    def test_get_menu_with_data(self, client, db):
        cat = Category(name="Pijače", sort_order=0)
        db.add(cat)
        db.commit()
        db.refresh(cat)
        item = MenuItem(name="Pivo", price=3.5, category_id=cat.id, is_active=True)
        db.add(item)
        db.commit()
        r = client.get("/api/v1/menu")
        assert r.status_code == 200
        data = r.json()
        assert len(data) == 1
        assert data[0]["name"] == "Pijače"
        assert len(data[0]["items"]) == 1

    def test_get_menu_branch_filter(self, client, db):
        cat = Category(name="Test", sort_order=0, branch_id=1)
        db.add(cat)
        db.commit()
        r = client.get("/api/v1/menu?branch_id=1")
        assert r.status_code == 200
        assert len(r.json()) == 1

    def test_get_menu_other_branch(self, client, db):
        cat = Category(name="Test", sort_order=0, branch_id=1)
        db.add(cat)
        db.commit()
        r = client.get("/api/v1/menu?branch_id=2")
        assert len(r.json()) == 0

    def test_get_all_menu(self, client, db):
        cat = Category(name="Hrana", sort_order=0)
        db.add(cat)
        db.commit()
        db.refresh(cat)
        item = MenuItem(name="Pizza", price=8, category_id=cat.id, is_active=False)
        db.add(item)
        db.commit()
        r = client.get("/api/v1/menu/all")
        assert r.status_code == 200
        assert len(r.json()) == 1
        assert len(r.json()[0]["items"]) == 1

    def test_list_categories(self, client, db):
        db.add(Category(name="A", sort_order=1))
        db.add(Category(name="B", sort_order=0))
        db.commit()
        r = client.get("/api/v1/menu/categories")
        assert r.status_code == 200
        assert len(r.json()) == 2

    def test_create_category(self, client):
        r = client.post("/api/v1/menu/categories", json={"name": "Nova"})
        assert r.status_code == 200
        assert r.json()["name"] == "Nova"
        assert "id" in r.json()

    def test_update_category(self, client, db):
        cat = Category(name="Old", sort_order=0)
        db.add(cat)
        db.commit()
        db.refresh(cat)
        r = client.put(f"/api/v1/menu/categories/{cat.id}", json={"name": "New", "sort_order": 5})
        assert r.status_code == 200
        assert r.json()["name"] == "New"
        assert r.json()["sort_order"] == 5

    def test_update_category_404(self, client):
        r = client.put("/api/v1/menu/categories/999", json={"name": "X"})
        assert r.status_code == 404

    def test_delete_category(self, client, db):
        cat = Category(name="ToDelete", sort_order=0)
        db.add(cat)
        db.commit()
        db.refresh(cat)
        r = client.delete(f"/api/v1/menu/categories/{cat.id}")
        assert r.status_code == 200
        assert r.json()["ok"] is True

    def test_delete_category_with_items_400(self, client, db):
        cat = Category(name="HasItems", sort_order=0)
        db.add(cat)
        db.commit()
        db.refresh(cat)
        item = MenuItem(name="X", price=5, category_id=cat.id)
        db.add(item)
        db.commit()
        r = client.delete(f"/api/v1/menu/categories/{cat.id}")
        assert r.status_code == 400

    def test_delete_category_404(self, client):
        r = client.delete("/api/v1/menu/categories/999")
        assert r.status_code == 404


class TestMenuItems:
    def _create_cat(self, db):
        cat = Category(name="Test", sort_order=0)
        db.add(cat)
        db.commit()
        db.refresh(cat)
        return cat

    def test_get_items(self, client, db):
        cat = self._create_cat(db)
        db.add(MenuItem(name="A", price=5, category_id=cat.id, is_active=True))
        db.add(MenuItem(name="B", price=5, category_id=cat.id, is_active=False))
        db.commit()
        r = client.get("/api/v1/menu/items")
        assert r.status_code == 200
        assert r.json()["total"] == 1

    def test_get_items_all(self, client, db):
        cat = self._create_cat(db)
        db.add(MenuItem(name="A", price=5, category_id=cat.id, is_active=False))
        db.commit()
        r = client.get("/api/v1/menu/items?all=true")
        assert r.json()["total"] == 1

    def test_create_item(self, client, db):
        cat = self._create_cat(db)
        r = client.post("/api/v1/menu/items", json={
            "name": "Nova", "price": 7.5, "category_id": cat.id
        })
        assert r.status_code == 200
        assert r.json()["name"] == "Nova"
        assert r.json()["price"] == 7.5

    def test_update_item(self, client, db):
        cat = self._create_cat(db)
        item = MenuItem(name="Old", price=5, category_id=cat.id)
        db.add(item)
        db.commit()
        db.refresh(item)
        r = client.put(f"/api/v1/menu/items/{item.id}", json={"name": "New", "price": 10})
        assert r.status_code == 200
        assert r.json()["name"] == "New"

    def test_update_item_with_combo_price(self, client, db):
        cat = self._create_cat(db)
        item = MenuItem(name="Combo", price=15, category_id=cat.id)
        db.add(item)
        db.commit()
        db.refresh(item)
        r = client.put(f"/api/v1/menu/items/{item.id}", json={"combo_price": 12})
        assert r.status_code == 200

    def test_update_item_404(self, client):
        r = client.put("/api/v1/menu/items/999", json={"name": "X"})
        assert r.status_code == 404

    def test_toggle_out_of_stock(self, client, db):
        cat = self._create_cat(db)
        item = MenuItem(name="Pivo", price=3, category_id=cat.id, is_out_of_stock=False)
        db.add(item)
        db.commit()
        db.refresh(item)
        r = client.post(f"/api/v1/menu/items/{item.id}/toggle-oos")
        assert r.status_code == 200
        assert r.json()["is_out_of_stock"] is True

    def test_toggle_oos_404(self, client):
        r = client.post("/api/v1/menu/items/999/toggle-oos")
        assert r.status_code == 404

    def test_item_cost(self, client, db):
        cat = self._create_cat(db)
        item = MenuItem(name="Pivo", price=5, category_id=cat.id)
        db.add(item)
        db.commit()
        db.refresh(item)
        ing = Ingredient(name="Hmelj", unit="kg", cost_per_unit=2.0, stock=10)
        db.add(ing)
        db.commit()
        db.refresh(ing)
        ri = RecipeItem(menu_item_id=item.id, ingredient_id=ing.id, quantity=0.5)
        db.add(ri)
        db.commit()
        r = client.get(f"/api/v1/menu/items/{item.id}/cost")
        assert r.status_code == 200
        assert r.json()["cost"] == 1.0
        assert r.json()["margin"] == 80.0

    def test_item_cost_404(self, client):
        r = client.get("/api/v1/menu/items/999/cost")
        assert r.status_code == 404

    def test_delete_item(self, client, db):
        cat = self._create_cat(db)
        item = MenuItem(name="Del", price=5, category_id=cat.id)
        db.add(item)
        db.commit()
        db.refresh(item)
        r = client.delete(f"/api/v1/menu/items/{item.id}")
        assert r.status_code == 200
        assert r.json()["ok"] is True

    def test_delete_item_404(self, client):
        r = client.delete("/api/v1/menu/items/999")
        assert r.status_code == 404

    def test_lookup_plu(self, client, db):
        cat = self._create_cat(db)
        item = MenuItem(name="Pivo", price=3.5, category_id=cat.id, plu_code="1001", is_active=True)
        db.add(item)
        db.commit()
        r = client.get("/api/v1/menu/plu/1001")
        assert r.status_code == 200
        assert r.json()["name"] == "Pivo"

    def test_lookup_plu_404(self, client):
        r = client.get("/api/v1/menu/plu/NONEXISTENT")
        assert r.status_code == 404

    def test_auto_out_of_stock(self, client, db):
        cat = self._create_cat(db)
        item = MenuItem(name="Pivo", price=3, category_id=cat.id, is_out_of_stock=False)
        db.add(item)
        db.commit()
        db.refresh(item)
        ing = Ingredient(name="Hmelj", unit="kg", cost_per_unit=1, stock=0.1, min_stock=5)
        db.add(ing)
        db.commit()
        db.refresh(ing)
        ri = RecipeItem(menu_item_id=item.id, ingredient_id=ing.id, quantity=1)
        db.add(ri)
        db.commit()
        r = client.post("/api/v1/menu/auto-out-of-stock")
        assert r.status_code == 200
        assert r.json()["marked_out_of_stock"] == 1

    def test_all_item_costs(self, client, db):
        cat = self._create_cat(db)
        db.add(MenuItem(name="Pivo", price=3.5, category_id=cat.id, is_active=True))
        db.commit()
        r = client.get("/api/v1/menu/costs")
        assert r.status_code == 200
        assert len(r.json()) == 1


class TestMenuCombos:
    def _setup(self, db):
        cat = Category(name="Test", sort_order=0)
        db.add(cat)
        db.commit()
        db.refresh(cat)
        combo = MenuItem(name="Combo", price=20, combo_price=15, category_id=cat.id, is_combo=True)
        db.add(combo)
        db.commit()
        db.refresh(combo)
        item = MenuItem(name="Pivo", price=3.5, category_id=cat.id)
        db.add(item)
        db.commit()
        db.refresh(item)
        return combo, item

    def test_list_combos(self, client, db):
        combo, item = self._setup(db)
        r = client.get("/api/v1/menu/combos")
        assert r.status_code == 200
        assert len(r.json()) == 1

    def test_add_combo_item(self, client, db):
        combo, item = self._setup(db)
        r = client.post(f"/api/v1/menu/combos/{combo.id}/items", json={"item_id": item.id, "quantity": 2})
        assert r.status_code == 200
        assert r.json()["ok"] is True

    def test_add_combo_item_404(self, client, db):
        _, item = self._setup(db)
        r = client.post("/api/v1/menu/combos/999/items", json={"item_id": item.id, "quantity": 1})
        assert r.status_code == 404

    def test_add_combo_item_bad_item(self, client, db):
        combo, _ = self._setup(db)
        r = client.post(f"/api/v1/menu/combos/{combo.id}/items", json={"item_id": 999, "quantity": 1})
        assert r.status_code == 404

    def test_remove_combo_item(self, client, db):
        combo, item = self._setup(db)
        ci = ComboItem(combo_id=combo.id, item_id=item.id, quantity=1)
        db.add(ci)
        db.commit()
        r = client.delete(f"/api/v1/menu/combos/{combo.id}/items/{item.id}")
        assert r.status_code == 200

    def test_remove_combo_item_404(self, client):
        r = client.delete("/api/v1/menu/combos/999/items/999")
        assert r.status_code == 404


class TestMenuVersions:
    def _setup(self, db):
        cat = Category(name="T", sort_order=0)
        db.add(cat)
        db.commit()
        db.refresh(cat)
        item = MenuItem(name="Pizza", price=8, category_id=cat.id)
        db.add(item)
        db.commit()
        db.refresh(item)
        return item

    def test_list_versions(self, client, db):
        item = self._setup(db)
        v = MenuVersion(item_id=item.id, price=9)
        db.add(v)
        db.commit()
        r = client.get("/api/v1/menu/versions")
        assert r.status_code == 200
        assert len(r.json()) == 1

    def test_create_version(self, client, db):
        item = self._setup(db)
        r = client.post("/api/v1/menu/versions", json={"item_id": item.id, "price": 10, "valid_from": "2026-01-01"})
        assert r.status_code == 200
        assert r.json()["price"] == 10

    def test_create_version_404(self, client):
        r = client.post("/api/v1/menu/versions", json={"item_id": 999, "price": 10})
        assert r.status_code == 404

    def test_delete_version(self, client, db):
        item = self._setup(db)
        v = MenuVersion(item_id=item.id, price=10)
        db.add(v)
        db.commit()
        db.refresh(v)
        r = client.delete(f"/api/v1/menu/versions/{v.id}")
        assert r.status_code == 200

    def test_delete_version_404(self, client):
        r = client.delete("/api/v1/menu/versions/999")
        assert r.status_code == 404


class TestMenuBulk:
    def _setup(self, db):
        cat = Category(name="Test", sort_order=0)
        db.add(cat)
        db.commit()
        db.refresh(cat)
        items = []
        for name, price in [("A", 10), ("B", 20)]:
            i = MenuItem(name=name, price=price, category_id=cat.id, is_active=True)
            db.add(i)
            items.append(i)
        db.commit()
        return items

    def test_bulk_price_increase_pct(self, client, db):
        items = self._setup(db)
        r = client.post("/api/v1/menu/bulk", json={"action": "price", "value": "+10%"})
        assert r.status_code == 200
        assert r.json()["updated"] == 2

    def test_bulk_price_decrease_pct(self, client, db):
        items = self._setup(db)
        r = client.post("/api/v1/menu/bulk", json={"action": "price", "value": "-5%"})
        assert r.status_code == 200
        assert r.json()["updated"] == 2

    def test_bulk_price_increase_abs(self, client, db):
        items = self._setup(db)
        r = client.post("/api/v1/menu/bulk", json={"action": "price", "value": "+2"})
        assert r.status_code == 200
        assert r.json()["updated"] == 2

    def test_bulk_price_decrease_abs(self, client, db):
        items = self._setup(db)
        r = client.post("/api/v1/menu/bulk", json={"action": "price", "value": "-1.5"})
        assert r.status_code == 200

    def test_bulk_price_set(self, client, db):
        items = self._setup(db)
        r = client.post("/api/v1/menu/bulk", json={"action": "price", "value": "15"})
        assert r.status_code == 200
        assert r.json()["updated"] == 2

    def test_bulk_price_empty_value(self, client, db):
        items = self._setup(db)
        r = client.post("/api/v1/menu/bulk", json={"action": "price", "value": ""})
        assert r.json()["updated"] == 0

    def test_bulk_activate(self, client, db):
        items = self._setup(db)
        r = client.post("/api/v1/menu/bulk", json={"action": "activate", "value": "activate"})
        assert r.json()["updated"] == 2

    def test_bulk_deactivate(self, client, db):
        items = self._setup(db)
        r = client.post("/api/v1/menu/bulk", json={"action": "activate", "value": "deactivate"})
        assert r.json()["updated"] == 2

    def test_bulk_course(self, client, db):
        items = self._setup(db)
        r = client.post("/api/v1/menu/bulk", json={"action": "course", "course_id": 1})
        assert r.json()["updated"] == 2

    def test_bulk_category(self, client, db):
        items = self._setup(db)
        r = client.post("/api/v1/menu/bulk", json={"action": "category", "category_id": 1})
        assert r.json()["updated"] == 2


class TestMenuTranslations:
    def _setup(self, db):
        cat = Category(name="T", sort_order=0)
        db.add(cat)
        db.commit()
        db.refresh(cat)
        item = MenuItem(name="Pizza", price=8, category_id=cat.id, translations='{"en": {"name": "Pizza"}}')
        db.add(item)
        db.commit()
        db.refresh(item)
        return item

    def test_get_translations(self, client, db):
        item = self._setup(db)
        r = client.get(f"/api/v1/menu/translations/{item.id}")
        assert r.status_code == 200
        assert r.json()["en"]["name"] == "Pizza"

    def test_get_translations_404(self, client):
        r = client.get("/api/v1/menu/translations/999")
        assert r.status_code == 404

    def test_set_translations(self, client, db):
        item = self._setup(db)
        r = client.put(f"/api/v1/menu/translations/{item.id}", json={"sl": {"name": "Pizza"}})
        assert r.status_code == 200
        assert "sl" in r.json()

    def test_set_translations_404(self, client):
        r = client.put("/api/v1/menu/translations/999", json={"en": {"name": "X"}})
        assert r.status_code == 404


class TestMenuCrossSell:
    def _setup(self, db):
        cat = Category(name="T", sort_order=0)
        db.add(cat)
        db.commit()
        db.refresh(cat)
        i1 = MenuItem(name="Pizza", price=8, category_id=cat.id)
        i2 = MenuItem(name="Pivo", price=3.5, category_id=cat.id)
        db.add_all([i1, i2])
        db.commit()
        db.refresh(i1)
        db.refresh(i2)
        return i1, i2

    def test_get_cross_sell(self, client, db):
        i1, i2 = self._setup(db)
        cs = CrossSellItem(item_id=i1.id, suggested_id=i2.id, type="pair")
        db.add(cs)
        db.commit()
        r = client.get(f"/api/v1/menu/cross-sell/{i1.id}")
        assert r.status_code == 200
        assert len(r.json()) == 1

    def test_add_cross_sell(self, client, db):
        i1, i2 = self._setup(db)
        r = client.post("/api/v1/menu/cross-sell", json={"item_id": i1.id, "suggested_id": i2.id, "type": "pair"})
        assert r.status_code == 200

    def test_add_cross_sell_duplicate_400(self, client, db):
        i1, i2 = self._setup(db)
        cs = CrossSellItem(item_id=i1.id, suggested_id=i2.id, type="pair")
        db.add(cs)
        db.commit()
        r = client.post("/api/v1/menu/cross-sell", json={"item_id": i1.id, "suggested_id": i2.id, "type": "pair"})
        assert r.status_code == 400

    def test_delete_cross_sell(self, client, db):
        i1, i2 = self._setup(db)
        cs = CrossSellItem(item_id=i1.id, suggested_id=i2.id, type="pair")
        db.add(cs)
        db.commit()
        db.refresh(cs)
        r = client.delete(f"/api/v1/menu/cross-sell/{cs.id}")
        assert r.status_code == 200

    def test_delete_cross_sell_404(self, client):
        r = client.delete("/api/v1/menu/cross-sell/999")
        assert r.status_code == 404


# ═══════════════════════════════════════════
# PRINTER.PY — 5 endpoints
# ═══════════════════════════════════════════
class TestPrinter:
    def test_generate_receipt(self, client):
        r = client.post("/api/v1/printer/receipt", json={
            "order_id": 1, "table": "T1", "total": 25.5,
            "items": [{"name": "Pivo", "quantity": 2, "price": 3.5, "total": 7.0}]
        })
        assert r.status_code == 200
        assert "hex" in r.json()
        assert r.json()["length"] > 0

    def test_generate_receipt_empty(self, client):
        r = client.post("/api/v1/printer/receipt", json={})
        assert r.status_code == 200

    def test_generate_kitchen_order(self, client):
        r = client.post("/api/v1/printer/kitchen", json={
            "order_id": 1, "table": "T3", "items": [{"name": "Pizza", "quantity": 1, "price": 8}]
        })
        assert r.status_code == 200
        assert "hex" in r.json()

    def test_generate_kitchen_empty(self, client):
        r = client.post("/api/v1/printer/kitchen", json={})
        assert r.status_code == 200

    def test_generate_z_report(self, client):
        r = client.post("/api/v1/printer/z-report", json={
            "date": "2026-07-18",
            "totals": {"gotovina": "150.00", "kartica": "200.00"}
        })
        assert r.status_code == 200
        assert "hex" in r.json()

    def test_send_to_printer_timeout(self, client):
        r = client.post("/api/v1/printer/send", json={
            "ip": "192.168.1.99", "port": 9100, "data": "0a0a"
        })
        assert r.status_code in [500, 502, 504]

    def test_test_printer_timeout(self, client):
        r = client.get("/api/v1/printer/test?ip=192.168.1.99&port=9100")
        assert r.status_code in [500, 502, 504]


# ═══════════════════════════════════════════
# NOTIFICATIONS.PY — 5 REST endpoints
# ═══════════════════════════════════════════
class TestNotifications:
    def test_get_notifications_empty(self, client, auth_header):
        r = client.get("/api/v1/notifications/", headers=auth_header)
        assert r.status_code == 200
        assert r.json()["notifications"] == []
        assert r.json()["unread_count"] == 0

    def test_send_notification(self, client, auth_header):
        r = client.post("/api/v1/notifications/send", json={
            "title": "Test", "message": "Hello", "type": "info"
        }, headers=auth_header)
        assert r.status_code == 200
        assert "id" in r.json()

    def test_send_notification_targeted(self, client, auth_header):
        r = client.post("/api/v1/notifications/send", json={
            "title": "Targeted", "message": "For you", "type": "warning", "target_user_id": 1
        }, headers=auth_header)
        assert r.status_code == 200

    def test_get_notifications_after_send(self, client, auth_header):
        client.post("/api/v1/notifications/send", json={
            "title": "T", "message": "M", "type": "info"
        }, headers=auth_header)
        r = client.get("/api/v1/notifications/", headers=auth_header)
        assert len(r.json()["notifications"]) == 1
        assert r.json()["unread_count"] == 1

    def test_mark_read(self, client, auth_header, db):
        n = Notification(title="T", message="M", type="info", read=False)
        db.add(n)
        db.commit()
        db.refresh(n)
        r = client.put(f"/api/v1/notifications/{n.id}/read", headers=auth_header)
        assert r.status_code == 200

    def test_mark_read_nonexistent(self, client, auth_header):
        r = client.put("/api/v1/notifications/999/read", headers=auth_header)
        assert r.status_code == 200

    def test_mark_all_read(self, client, auth_header, db):
        for _ in range(3):
            db.add(Notification(title="T", message="M", type="info", read=False))
        db.commit()
        r = client.put("/api/v1/notifications/read-all", headers=auth_header)
        assert r.status_code == 200

    def test_delete_notification(self, client, auth_header, db):
        n = Notification(title="T", message="M", type="info")
        db.add(n)
        db.commit()
        db.refresh(n)
        r = client.delete(f"/api/v1/notifications/{n.id}", headers=auth_header)
        assert r.status_code == 200

    def test_delete_nonexistent(self, client, auth_header):
        r = client.delete("/api/v1/notifications/999", headers=auth_header)
        assert r.status_code == 200

    def test_get_unread_only(self, client, auth_header, db):
        db.add(Notification(title="T", message="M", type="info", read=False))
        db.add(Notification(title="T2", message="M2", type="info", read=True))
        db.commit()
        r = client.get("/api/v1/notifications/?unread_only=true", headers=auth_header)
        assert len(r.json()["notifications"]) == 1

    @patch("app.api.v1.notifications.manager")
    def test_notify_new_order(self, mock_mgr):
        import asyncio
        from unittest.mock import AsyncMock
        from app.api.v1.notifications import notify_new_order
        mock_mgr.send_to_role = AsyncMock()
        asyncio.run(notify_new_order(1, "T1"))
        mock_mgr.send_to_role.assert_called_once()

    @patch("app.api.v1.notifications.manager")
    def test_notify_low_stock(self, mock_mgr):
        import asyncio
        from unittest.mock import AsyncMock
        from app.api.v1.notifications import notify_low_stock
        mock_mgr.send_to_role = AsyncMock()
        asyncio.run(notify_low_stock("Pivo", 2, "l"))
        mock_mgr.send_to_role.assert_called_once()

    @patch("app.api.v1.notifications.manager")
    def test_notify_order_ready(self, mock_mgr):
        import asyncio
        from unittest.mock import AsyncMock
        from app.api.v1.notifications import notify_order_ready
        mock_mgr.send_to_role = AsyncMock()
        asyncio.run(notify_order_ready(1, "T1"))
        mock_mgr.send_to_role.assert_called_once()

    def test_connection_manager(self):
        from app.api.v1.notifications import ConnectionManager
        mgr = ConnectionManager()
        assert len(mgr.all_connections) == 0
        assert len(mgr.active_connections) == 0


# ═══════════════════════════════════════════
# BACKUP.PY — 11 endpoints
# ═══════════════════════════════════════════
class TestBackup:
    def test_export_backup(self, client, auth_header):
        r = client.get("/api/v1/backup", headers=auth_header)
        assert r.status_code == 200
        assert "application/json" in r.headers.get("content-type", "")

    def test_create_auto_backup(self, client, auth_header):
        r = client.post("/api/v1/backup/auto", headers=auth_header)
        assert r.status_code == 200
        assert r.json()["ok"] is True
        assert "path" in r.json()

    def test_list_backups(self, client, auth_header):
        client.post("/api/v1/backup/auto", headers=auth_header)
        r = client.get("/api/v1/backup/list", headers=auth_header)
        assert r.status_code == 200
        assert len(r.json()) >= 1

    def test_download_backup_not_found(self, client, auth_header):
        r = client.get("/api/v1/backup/download/nonexistent.json", headers=auth_header)
        assert r.status_code == 200
        assert "error" in r.json()

    def test_restore_backup(self, client, auth_header):
        export = client.get("/api/v1/backup", headers=auth_header)
        data = export.json()
        r = client.post("/api/v1/backup/restore", json=data, headers=auth_header)
        assert r.status_code == 200
        assert r.json()["ok"] is True

    def test_get_cloud_settings(self, client, auth_header):
        r = client.get("/api/v1/backup/cloud/settings", headers=auth_header)
        assert r.status_code == 200
        assert "cloud_provider" in r.json()

    def test_save_cloud_settings(self, client, auth_header):
        r = client.post("/api/v1/backup/cloud/settings", json={
            "cloud_provider": "s3", "s3_bucket": "my-bucket"
        }, headers=auth_header)
        assert r.status_code == 200
        assert r.json()["ok"] is True

    @patch("app.api.v1.backup.s3_upload", return_value=True)
    def test_cloud_upload_s3(self, mock_s3, client, auth_header, db):
        s = Setting(key="cloud_provider", value="s3")
        db.add(s)
        db.commit()
        r = client.post("/api/v1/backup/cloud/upload", headers=auth_header)
        assert r.status_code == 200
        assert r.json()["ok"] is True

    @patch("app.api.v1.backup.s3_upload", return_value=False)
    def test_cloud_upload_fail(self, mock_s3, client, auth_header, db):
        s = Setting(key="cloud_provider", value="s3")
        db.add(s)
        db.commit()
        r = client.post("/api/v1/backup/cloud/upload", headers=auth_header)
        assert r.status_code == 200
        assert r.json()["ok"] is False

    @patch("app.api.v1.backup.s3_list", return_value=[{"key": "b1.json"}])
    def test_cloud_list_s3(self, mock_list, client, auth_header, db):
        s = Setting(key="cloud_provider", value="s3")
        db.add(s)
        db.commit()
        r = client.get("/api/v1/backup/cloud/list", headers=auth_header)
        assert r.status_code == 200

    @patch("app.api.v1.backup.gdrive_upload", return_value=True)
    def test_cloud_upload_gdrive(self, mock_gd, client, auth_header, db):
        s = Setting(key="cloud_provider", value="gdrive")
        db.add(s)
        db.commit()
        r = client.post("/api/v1/backup/cloud/upload", headers=auth_header)
        assert r.status_code == 200
        assert r.json()["ok"] is True

    @patch("app.api.v1.backup.gdrive_list", return_value=[])
    def test_cloud_list_gdrive(self, mock_list, client, auth_header, db):
        s = Setting(key="cloud_provider", value="gdrive")
        db.add(s)
        db.commit()
        r = client.get("/api/v1/backup/cloud/list", headers=auth_header)
        assert r.status_code == 200

    def test_cloud_download_no_provider(self, client, auth_header):
        r = client.post("/api/v1/backup/cloud/download/test.json", headers=auth_header)
        assert r.status_code == 200
        assert r.json()["ok"] is False

    @patch("app.api.v1.backup.s3_download", return_value=True)
    def test_cloud_download_s3(self, mock_dl, client, auth_header, db):
        s = Setting(key="cloud_provider", value="s3")
        db.add(s)
        db.commit()
        r = client.post("/api/v1/backup/cloud/download/backup.json", headers=auth_header)
        assert r.status_code == 200
        assert r.json()["ok"] is True

    @patch("app.api.v1.backup.gdrive_download", return_value=True)
    def test_cloud_download_gdrive(self, mock_dl, client, auth_header, db):
        s = Setting(key="cloud_provider", value="gdrive")
        db.add(s)
        db.commit()
        r = client.post("/api/v1/backup/cloud/download/gd_file.json", headers=auth_header)
        assert r.status_code == 200

    def test_cloud_delete_no_provider(self, client, auth_header):
        r = client.post("/api/v1/backup/cloud/delete/test.json", headers=auth_header)
        assert r.status_code == 200
        assert r.json()["ok"] is False

    @patch("app.api.v1.backup.s3_delete", return_value=True)
    def test_cloud_delete_s3(self, mock_del, client, auth_header, db):
        s = Setting(key="cloud_provider", value="s3")
        db.add(s)
        db.commit()
        r = client.post("/api/v1/backup/cloud/delete/backup.json", headers=auth_header)
        assert r.status_code == 200
        assert r.json()["ok"] is True

    @patch("app.api.v1.backup.gdrive_delete", return_value=True)
    def test_cloud_delete_gdrive(self, mock_del, client, auth_header, db):
        s = Setting(key="cloud_provider", value="gdrive")
        db.add(s)
        db.commit()
        r = client.post("/api/v1/backup/cloud/delete/gd_file.json", headers=auth_header)
        assert r.status_code == 200

    def test_rotate_backups(self):
        from app.api.v1.backup import rotate_backups
        rotate_backups(retain_days=0)

    def test_helper_get_setting(self):
        from app.api.v1.backup import get_setting
        val = get_setting("nonexistent_key_xyz", "default")
        assert val == "default"

    def test_start_auto_backup(self):
        from app.api.v1.backup import start_auto_backup, _scheduler_running
        old = _scheduler_running
        import app.api.v1.backup as bp
        bp._scheduler_running = True
        start_auto_backup()
        bp._scheduler_running = old


# ═══════════════════════════════════════════
# MESSAGING.PY — 10 endpoints
# ═══════════════════════════════════════════
class TestMessaging:
    @patch("app.api.v1.messaging.send_marketing", return_value={"ok": True})
    def test_send_message_sms(self, mock_send, client):
        r = client.post("/api/v1/messaging/send", json={"phone": "040123456", "message": "Hello"})
        assert r.status_code == 200
        assert r.json()["ok"] is True

    @patch("app.api.v1.messaging.send_marketing_whatsapp", return_value={"ok": True})
    def test_send_message_whatsapp(self, mock_send, client):
        r = client.post("/api/v1/messaging/send", json={"phone": "040123", "message": "Hi", "channel": "whatsapp"})
        assert r.status_code == 200

    def test_send_message_no_phone_400(self, client):
        r = client.post("/api/v1/messaging/send", json={"phone": "", "message": "Hi"})
        assert r.status_code == 400

    @patch("app.api.v1.messaging.send_marketing", return_value={"ok": True})
    def test_send_bulk(self, mock_send, client, db):
        c1 = Customer(name="A", phone="040111")
        c2 = Customer(name="B", phone="040222")
        db.add_all([c1, c2])
        db.commit()
        db.refresh(c1)
        db.refresh(c2)
        r = client.post("/api/v1/messaging/send-bulk", json={
            "customer_ids": [c1.id, c2.id], "message": "Promo"
        })
        assert r.status_code == 200
        assert r.json()["sent"] == 2

    def test_send_bulk_no_phone(self, client, db):
        c = Customer(name="NoPhone", phone=None)
        db.add(c)
        db.commit()
        db.refresh(c)
        with patch("app.api.v1.messaging.send_marketing", return_value={"ok": True}):
            r = client.post("/api/v1/messaging/send-bulk", json={
                "customer_ids": [c.id], "message": "Test"
            })
        assert r.json()["failed"] == 1

    def test_send_receipt_order_not_found(self, client):
        r = client.post("/api/v1/messaging/send-receipt", json={
            "order_id": 999, "phone": "040123"
        })
        assert r.status_code == 404

    def test_send_receipt_no_phone(self, client, db):
        o = Order(table_id=1, status="paid", total=10)
        db.add(o)
        db.commit()
        db.refresh(o)
        r = client.post("/api/v1/messaging/send-receipt", json={
            "order_id": o.id, "phone": ""
        })
        assert r.status_code == 400

    @patch("app.api.v1.messaging.send_receipt_sms", return_value={"ok": True})
    def test_send_receipt_sms(self, mock_send, client, db):
        o = Order(table_id=1, status="paid", total=10)
        db.add(o)
        db.commit()
        db.refresh(o)
        r = client.post("/api/v1/messaging/send-receipt", json={
            "order_id": o.id, "phone": "040123"
        })
        assert r.status_code == 200

    @patch("app.api.v1.messaging.send_receipt_whatsapp", return_value={"ok": True})
    def test_send_receipt_whatsapp(self, mock_send, client, db):
        o = Order(table_id=1, status="paid", total=10)
        db.add(o)
        db.commit()
        db.refresh(o)
        r = client.post("/api/v1/messaging/send-receipt", json={
            "order_id": o.id, "phone": "040123", "channel": "whatsapp"
        })
        assert r.status_code == 200

    def test_send_order_status_not_found(self, client):
        r = client.post("/api/v1/messaging/send-order-status?order_id=999&status=preparing")
        assert r.status_code == 404

    @patch("app.api.v1.messaging.send_order_status", return_value={"ok": True})
    def test_send_order_status_no_phone(self, mock_send, client, db):
        o = Order(table_id=1, status="open", total=10)
        db.add(o)
        db.commit()
        db.refresh(o)
        r = client.post(f"/api/v1/messaging/send-order-status?order_id={o.id}&status=ready")
        assert r.json()["ok"] is False

    @patch("app.api.v1.messaging.send_order_status", return_value={"ok": True})
    def test_send_order_status_ok(self, mock_send, client, db):
        o = Order(table_id=1, status="open", total=10, customer_phone="040123")
        db.add(o)
        db.commit()
        db.refresh(o)
        r = client.post(f"/api/v1/messaging/send-order-status?order_id={o.id}&status=ready")
        assert r.status_code == 200

    def test_send_loyalty_update_not_found(self, client):
        r = client.post("/api/v1/messaging/send-loyalty-update?customer_id=999&points_earned=10")
        assert r.status_code == 404

    @patch("app.api.v1.messaging.send_loyalty_update", return_value={"ok": True})
    def test_send_loyalty_update_no_phone(self, mock_send, client, db):
        c = Customer(name="NoPhone", phone=None, loyalty_points=100)
        db.add(c)
        db.commit()
        db.refresh(c)
        r = client.post(f"/api/v1/messaging/send-loyalty-update?customer_id={c.id}&points_earned=10")
        assert r.json()["ok"] is False

    @patch("app.api.v1.messaging.send_loyalty_update", return_value={"ok": True})
    def test_send_loyalty_update_ok(self, mock_send, client, db):
        c = Customer(name="Janez", phone="040123", loyalty_points=100)
        db.add(c)
        db.commit()
        db.refresh(c)
        r = client.post(f"/api/v1/messaging/send-loyalty-update?customer_id={c.id}&points_earned=10")
        assert r.status_code == 200

    def test_send_birthday_no_members(self, client):
        r = client.post("/api/v1/messaging/send-birthday")
        assert r.status_code == 200
        assert r.json()["sent"] == 0

    def test_get_messaging_settings(self, client):
        r = client.get("/api/v1/messaging/settings")
        assert r.status_code == 200
        assert "provider" in r.json()

    def test_update_messaging_settings(self, client):
        r = client.put("/api/v1/messaging/settings", json={"enabled": "true"})
        assert r.status_code == 200
        assert r.json()["ok"] is True

    def test_get_message_log(self, client):
        r = client.get("/api/v1/messaging/log")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_get_messaging_stats(self, client):
        r = client.get("/api/v1/messaging/stats")
        assert r.status_code == 200
        assert "total_messages" in r.json()

    def test_log_message_helper(self, client, db):
        from app.api.v1.messaging import _log_message
        _log_message(db, "test", "040123", "sms", "preview", True)
        assert db.query(Setting).filter(Setting.key.like("msglog_%")).count() == 1
