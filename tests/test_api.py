"""Tests for auth, menu, orders, and customer API endpoints."""

import bcrypt
from app.models.user import User
from tests.conftest import TestingSessionLocal


def test_auth_login(client):
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
    data = r.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"

    r = client.post("/api/v1/auth/login", json={"username": "admin", "password": "wrong"})
    assert r.status_code == 401

    r = client.post("/api/v1/auth/login", json={"username": "nobody", "password": "x"})
    assert r.status_code == 401


def test_auth_me(client, token, auth_header):
    r = client.get("/api/v1/auth/me", headers=auth_header)
    assert r.status_code == 200
    data = r.json()
    assert data["username"] == "admin"
    assert data["role"] == "admin"

    # Without token
    r = client.get("/api/v1/auth/me")
    assert r.status_code == 401


def test_create_category(client, auth_header):
    r = client.post("/api/v1/menu/categories", headers=auth_header, json={"name": "Pizza"})
    assert r.status_code == 200
    data = r.json()
    assert data["name"] == "Pizza"
    assert data["id"] > 0


def test_list_categories(client, auth_header):
    # Create some categories
    for name in ["Pizza", "Pasta", "Salad"]:
        client.post("/api/v1/menu/categories", headers=auth_header, json={"name": name})

    r = client.get("/api/v1/menu/categories", headers=auth_header)
    assert r.status_code == 200
    data = r.json()
    assert len(data) == 3
    names = [c["name"] for c in data]
    assert "Pizza" in names
    assert "Pasta" in names


def test_create_menu_item(client, auth_header):
    # Create category first
    cat = client.post("/api/v1/menu/categories", headers=auth_header, json={"name": "Pizza"}).json()

    r = client.post("/api/v1/menu/items", headers=auth_header, json={
        "name": "Margherita",
        "price": 8.50,
        "category_id": cat["id"],
        "description": "Classic tomato and mozzarella"
    })
    assert r.status_code == 200
    data = r.json()
    assert data["name"] == "Margherita"
    assert float(data["price"]) == 8.50
    assert data["category_id"] == cat["id"]


def test_get_menu(client, auth_header):
    cat = client.post("/api/v1/menu/categories", headers=auth_header, json={"name": "Pizza"}).json()
    client.post("/api/v1/menu/items", headers=auth_header, json={
        "name": "Margherita", "price": 8.50, "category_id": cat["id"]
    })

    r = client.get(f"/api/v1/menu?branch_id=0", headers=auth_header)
    assert r.status_code == 200
    data = r.json()
    assert len(data) > 0
    assert len(data[0]["items"]) > 0
    assert data[0]["items"][0]["name"] == "Margherita"


def test_update_menu_item(client, auth_header):
    cat = client.post("/api/v1/menu/categories", headers=auth_header, json={"name": "Pizza"}).json()
    item = client.post("/api/v1/menu/items", headers=auth_header, json={
        "name": "Margherita", "price": 8.50, "category_id": cat["id"]
    }).json()

    r = client.put(f"/api/v1/menu/items/{item['id']}", headers=auth_header, json={
        "price": 9.00, "description": "Updated"
    })
    assert r.status_code == 200

    # Verify via get all
    r = client.get("/api/v1/menu/all", headers=auth_header)
    updated = r.json()[0]["items"][0]
    assert float(updated["price"]) == 9.00


def test_create_order(client, auth_header):
    # Create table
    r = client.post("/api/v1/tables", headers=auth_header, json={"name": "T1", "capacity": 4})
    table = r.json()

    r = client.post("/api/v1/orders", headers=auth_header, json={
        "table_id": table["id"],
        "customer_name": "Test Guest",
        "items": [],
        "order_type": "dine-in"
    })
    assert r.status_code == 200
    data = r.json()
    assert data["table_id"] == table["id"]
    assert data["customer_name"] == "Test Guest"
    assert float(data["total"]) == 0


def test_create_order_with_items(client, auth_header):
    cat = client.post("/api/v1/menu/categories", headers=auth_header, json={"name": "Pizza"}).json()
    item = client.post("/api/v1/menu/items", headers=auth_header, json={
        "name": "Margherita", "price": 8.50, "category_id": cat["id"]
    }).json()
    table = client.post("/api/v1/tables", headers=auth_header, json={"name": "T2", "capacity": 4}).json()

    r = client.post("/api/v1/orders", headers=auth_header, json={
        "table_id": table["id"],
        "customer_name": "Test",
        "items": [{"menu_item_id": item["id"], "quantity": 2}],
        "order_type": "dine-in"
    })
    assert r.status_code == 200
    data = r.json()
    assert float(data["total"]) == 17.00
    assert len(data["items"]) == 1


def test_get_orders(client, auth_header):
    # Create a table and order
    table = client.post("/api/v1/tables", headers=auth_header, json={"name": "T3", "capacity": 4}).json()
    client.post("/api/v1/orders", headers=auth_header, json={
        "table_id": table["id"], "customer_name": "Guest",
        "items": [], "order_type": "dine-in"
    })

    r = client.get("/api/v1/orders?status=open", headers=auth_header)
    assert r.status_code == 200
    data = r.json()
    assert data["total"] >= 1


def test_close_order(client, auth_header):
    table = client.post("/api/v1/tables", headers=auth_header, json={"name": "T4", "capacity": 4}).json()
    order = client.post("/api/v1/orders", headers=auth_header, json={
        "table_id": table["id"], "customer_name": "Close Test",
        "items": [], "order_type": "dine-in"
    }).json()

    r = client.post(f"/api/v1/orders/{order['id']}/close", headers=auth_header)
    assert r.status_code == 200

    # Verify closed
    r = client.get("/api/v1/orders?status=closed", headers=auth_header)
    ids = [o["id"] for o in r.json()["items"]]
    assert order["id"] in ids


def test_create_customer(client, auth_header):
    r = client.post("/api/v1/customers", headers=auth_header, json={
        "name": "Janez Novak",
        "phone": "+38640123456",
        "email": "janez@example.com"
    })
    assert r.status_code == 200
    data = r.json()
    assert data["name"] == "Janez Novak"
    assert data["phone"] == "+38640123456"


def test_search_customers(client, auth_header):
    client.post("/api/v1/customers", headers=auth_header, json={
        "name": "Janez Novak", "phone": "+38640123456"
    })
    client.post("/api/v1/customers", headers=auth_header, json={
        "name": "Marija Horvat", "phone": "+38640987654"
    })

    r = client.get("/api/v1/customers?search=Janez", headers=auth_header)
    assert r.status_code == 200
    data = r.json()
    assert data["total"] >= 1
    assert data["items"][0]["name"] == "Janez Novak"


def test_bulk_price_update(client, auth_header):
    cat = client.post("/api/v1/menu/categories", headers=auth_header, json={"name": "Test"}).json()
    for name, price in [("A", 10), ("B", 20), ("C", 30)]:
        client.post("/api/v1/menu/items", headers=auth_header, json={
            "name": name, "price": price, "category_id": cat["id"]
        })

    # Apply +10% to all items
    r = client.post("/api/v1/menu/bulk", headers=auth_header, json={
        "action": "price", "value": "+10%"
    })
    assert r.status_code == 200
    assert r.json()["updated"] == 3

    # Verify prices updated
    r = client.get("/api/v1/menu/all", headers=auth_header)
    prices = [i["price"] for c in r.json() for i in c["items"]]
    assert 11.0 in prices
    assert 22.0 in prices
    assert 33.0 in prices


def test_unauthorized_access_blocks(client):
    """Protected endpoints should return 401 without auth."""
    r = client.get("/api/v1/users")
    assert r.status_code == 401
    r = client.get("/api/v1/settings")
    assert r.status_code == 401
    r = client.get("/api/v1/expenses")
    assert r.status_code == 401


def test_token_expiry(client, auth_header):
    """Expired tokens should be rejected."""
    import jwt
    from app.core.config import get_settings
    settings = get_settings()
    expired = jwt.encode(
        {"sub": "1", "role": "admin", "exp": 0},
        settings.SECRET_KEY, algorithm=settings.ALGORITHM
    )
    r = client.get("/api/v1/users", headers={"Authorization": f"Bearer {expired}"})
    assert r.status_code == 401


def test_invalid_token(client):
    """Invalid tokens should be rejected."""
    r = client.get("/api/v1/users", headers={"Authorization": "Bearer invalidtoken123"})
    assert r.status_code == 401


def test_user_crud(client, auth_header):
    """Test creating, updating, and listing users."""
    r = client.post("/api/v1/users", headers=auth_header, json={
        "username": "testuser", "password": "pass1234", "full_name": "Test User", "role": "waiter"
    })
    assert r.status_code == 200
    uid = r.json()["id"]

    r = client.get("/api/v1/users", headers=auth_header)
    assert r.status_code == 200
    assert len(r.json()) >= 2

    r = client.put(f"/api/v1/users/{uid}", headers=auth_header, json={"role": "cashier"})
    assert r.status_code == 200
    assert r.json()["role"] == "cashier"

    r = client.delete(f"/api/v1/users/{uid}", headers=auth_header)
    assert r.status_code == 200


def test_pagination_customers(client, auth_header):
    """Test pagination response format for customers."""
    for i in range(5):
        client.post("/api/v1/customers", headers=auth_header, json={
            "name": f"Customer {i}", "phone": f"+3864000000{i}"
        })
    r = client.get("/api/v1/customers?skip=0&limit=3", headers=auth_header)
    assert r.status_code == 200
    data = r.json()
    assert "items" in data
    assert "total" in data
    assert data["total"] >= 5
    assert len(data["items"]) == 3

    r = client.get("/api/v1/customers?skip=3&limit=3", headers=auth_header)
    data = r.json()
    assert len(data["items"]) == 2


def test_pin_validation(client):
    """PIN login should validate PIN format."""
    r = client.post("/api/v1/auth/pin", json={"pin": "12"})
    assert r.status_code == 400  # too short
