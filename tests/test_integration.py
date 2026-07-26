"""Integration tests for critical POS paths: auth, orders, payments, inventory."""
import bcrypt
from app.models.user import User
from tests.conftest import TestingSessionLocal


# ─── AUTH INTEGRATION ───────────────────────────────────────────────

def test_login_returns_valid_jwt(client):
    db = TestingSessionLocal()
    if not db.query(User).filter(User.username == "admin").first():
        db.add(User(
            username="admin", full_name="Admin",
            hashed_password=bcrypt.hashpw("admin".encode(), bcrypt.gensalt()).decode(),
            role="admin", is_active=True
        ))
        db.commit()
    db.close()

    r = client.post("/api/v1/auth/login", json={"username": "admin", "password": "admin"})
    assert r.status_code == 200
    token = r.json()["access_token"]
    assert len(token) > 20

    r = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    assert r.json()["username"] == "admin"


def test_pin_login_endpoint(client, auth_header):
    r = client.post("/api/v1/auth/pin", json={"pin": "12"})
    assert r.status_code in [400, 401]


def test_token_expiry_claim_present(client):
    db = TestingSessionLocal()
    if not db.query(User).filter(User.username == "admin").first():
        db.add(User(
            username="admin", full_name="Admin",
            hashed_password=bcrypt.hashpw("admin".encode(), bcrypt.gensalt()).decode(),
            role="admin", is_active=True
        ))
        db.commit()
    db.close()

    r = client.post("/api/v1/auth/login", json={"username": "admin", "password": "admin"})
    assert r.status_code == 200
    import jwt
    token = r.json()["access_token"]
    payload = jwt.decode(token, options={"verify_signature": False})
    assert "exp" in payload


# ─── ORDERS INTEGRATION ─────────────────────────────────────────────

def test_order_full_lifecycle(client, auth_header):
    cat = client.post("/api/v1/menu/categories", headers=auth_header, json={"name": "Test"}).json()
    item = client.post("/api/v1/menu/items", headers=auth_header, json={
        "name": "Test Item", "price": 10.0, "category_id": cat["id"]
    }).json()

    table = client.post("/api/v1/tables", headers=auth_header, json={
        "name": "T99", "capacity": 4
    }).json()
    table_id = table["id"]

    r = client.post("/api/v1/orders", headers=auth_header, json={
        "table_id": table_id,
        "items": [{"menu_item_id": item["id"], "quantity": 2}]
    })
    assert r.status_code == 200
    order = r.json()
    order_id = order.get("id") or order.get("order_id")
    assert order_id is not None

    r = client.get(f"/api/v1/orders/{order_id}", headers=auth_header)
    assert r.status_code == 200

    r = client.post(f"/api/v1/orders/{order_id}/close", headers=auth_header)
    assert r.status_code in [200, 204]


def test_order_item_validations(client, auth_header):
    r = client.post("/api/v1/orders", headers=auth_header, json={
        "table_id": 99999, "items": []
    })
    assert r.status_code in [400, 404, 422]


# ─── MENU INTEGRATION ───────────────────────────────────────────────

def test_menu_crud_chain(client, auth_header):
    cat = client.post("/api/v1/menu/categories", headers=auth_header, json={"name": "Drinks"}).json()
    assert "id" in cat
    cat_id = cat["id"]

    item = client.post("/api/v1/menu/items", headers=auth_header, json={
        "name": "Coffee", "price": 3.50, "category_id": cat_id
    }).json()
    assert item["name"] == "Coffee"
    item_id = item["id"]

    r = client.put(f"/api/v1/menu/items/{item_id}", headers=auth_header, json={"price": 4.00})
    assert r.status_code == 200
    assert float(r.json()["price"]) == 4.00

    r = client.get("/api/v1/menu/items", headers=auth_header)
    assert r.status_code == 200
    data = r.json()
    names = [i["name"] for i in data.get("items", data if isinstance(data, list) else [])]
    assert "Coffee" in names


def test_menu_delete(client, auth_header):
    cat = client.post("/api/v1/menu/categories", headers=auth_header, json={"name": "Temp"}).json()
    item = client.post("/api/v1/menu/items", headers=auth_header, json={
        "name": "Temp Item", "price": 1.0, "category_id": cat["id"]
    }).json()

    r = client.delete(f"/api/v1/menu/items/{item['id']}", headers=auth_header)
    assert r.status_code in [200, 204]

    r = client.get("/api/v1/menu/items", headers=auth_header)
    data = r.json()
    names = [i["name"] for i in data.get("items", data if isinstance(data, list) else [])]
    assert "Temp Item" not in names


# ─── CUSTOMERS INTEGRATION ──────────────────────────────────────────

def test_customer_lifecycle(client, auth_header):
    r = client.post("/api/v1/customers", headers=auth_header, json={
        "name": "Test Customer", "email": "test@test.si", "phone": "+38640123456"
    })
    assert r.status_code == 200
    cid = r.json()["id"]

    r = client.get(f"/api/v1/customers/{cid}", headers=auth_header)
    assert r.status_code == 200
    assert r.json()["name"] == "Test Customer"

    r = client.get("/api/v1/customers?search=Test", headers=auth_header)
    assert r.status_code == 200
    assert len(r.json()) >= 1


# ─── TABLES INTEGRATION ─────────────────────────────────────────────

def test_tables_crud(client, auth_header):
    r = client.post("/api/v1/tables", headers=auth_header, json={
        "name": "Test Table", "capacity": 4
    })
    assert r.status_code == 200
    tid = r.json()["id"]

    r = client.get("/api/v1/tables", headers=auth_header)
    assert r.status_code == 200


# ─── RESERVATIONS INTEGRATION ───────────────────────────────────────

def test_reservation_create(client, auth_header):
    table = client.post("/api/v1/tables", headers=auth_header, json={
        "name": "Res Table", "capacity": 6
    }).json()

    r = client.post("/api/v1/reservations", headers=auth_header, json={
        "customer_name": "Rezervacija Test",
        "customer_phone": "+38640123456",
        "reservation_time": "2026-12-31T19:00:00",
        "guests": 4,
        "table_id": table["id"]
    })
    assert r.status_code == 200


# ─── RBAC INTEGRATION ───────────────────────────────────────────────

def test_unauthorized_access_rejected(client):
    r = client.get("/api/v1/auth/me")
    assert r.status_code == 401


def test_invalid_token_rejected(client):
    r = client.get("/api/v1/auth/me", headers={"Authorization": "Bearer invalid.token.here"})
    assert r.status_code == 401


# ─── SYSTEM ──────────────────────────────────────────────────────────

def test_health_check(client):
    r = client.get("/api/v1/system/health")
    assert r.status_code == 200


# ─── PUBLIC ENDPOINTS ───────────────────────────────────────────────

def test_menu_public(client, auth_header):
    table = client.post("/api/v1/tables", headers=auth_header, json={
        "name": "Pub Table", "capacity": 2
    }).json()

    r = client.get(f"/api/v1/public/menu/{table['id']}")
    assert r.status_code == 200
