import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.database import Base, get_db
from app.main import create_app
import hashlib

SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"
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
def db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

@pytest.fixture
def client():
    app = create_app()
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c

@pytest.fixture
def token(client):
    # Seed admin user
    from app.models.user import User
    db = TestingSessionLocal()
    existing = db.query(User).filter(User.username == "admin").first()
    if not existing:
        user = User(
            username="admin", full_name="Admin",
            hashed_password=hashlib.sha256("admin".encode()).hexdigest(),
            role="admin", is_active=True
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    db.close()

    r = client.post("/api/v1/auth/login", json={"username": "admin", "password": "admin"})
    assert r.status_code == 200
    return r.json()["access_token"]

@pytest.fixture
def auth_header(token):
    return {"Authorization": f"Bearer {token}"}
