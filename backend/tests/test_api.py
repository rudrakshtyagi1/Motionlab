"""
test_api.py — FastAPI endpoint tests with database isolation.

Uses an in-memory SQLite database (sqlite:///:memory:) with StaticPool so test execution
shares the in-memory tables and never modifies motionlab.db.
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.database import Base, get_db

# ── Test Database Setup (Isolated shared in-memory SQLite) ───────────────────
SQLALCHEMY_TEST_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_test_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


# ── Health Check Tests ────────────────────────────────────────────────────────

def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "motionlab-backend"
    assert "numpy_version" in data


# ── Session API Tests ─────────────────────────────────────────────────────────

def test_create_and_get_session():
    payload = {
        "id": "test_session_001",
        "exercise": "squat",
        "started_at": 1723456000000,
        "ended_at": 1723456154000,
        "total_reps": 5,
        "good_reps": 4,
        "warning_reps": 1,
        "poor_reps": 0,
        "form_consistency": 80,
        "primary_improvement": "Keep your torso more upright.",
        "reps": [
            {
                "rep_number": 1,
                "duration_ms": 1800,
                "minimum_knee_angle": 92.5,
                "depth_status": "GOOD",
                "knee_alignment_status": "GOOD",
                "torso_status": "GOOD",
                "stability_status": "GOOD",
                "overall_status": "GOOD",
                "score": 100,
            },
            {
                "rep_number": 2,
                "duration_ms": 2000,
                "minimum_knee_angle": 108.0,
                "depth_status": "WARNING",
                "knee_alignment_status": "GOOD",
                "torso_status": "WARNING",
                "stability_status": "GOOD",
                "overall_status": "WARNING",
                "score": 75,
            }
        ]
    }

    # 1. POST /api/sessions
    response = client.post("/api/sessions", json=payload)
    assert response.status_code == 201
    res_data = response.json()
    assert res_data["id"] == "test_session_001"
    assert res_data["total_reps"] == 5
    assert len(res_data["reps"]) == 2

    # 2. GET /api/sessions/{session_id}
    get_res = client.get("/api/sessions/test_session_001")
    assert get_res.status_code == 200
    get_data = get_res.json()
    assert get_data["id"] == "test_session_001"
    assert get_data["good_reps"] == 4

    # 3. GET /api/sessions
    list_res = client.get("/api/sessions?limit=10")
    assert list_res.status_code == 200
    list_data = list_res.json()
    assert len(list_data) == 1
    assert list_data[0]["id"] == "test_session_001"


def test_get_nonexistent_session_returns_404():
    response = client.get("/api/sessions/nonexistent_id_999")
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()


def test_invalid_session_payload_rejected():
    invalid_payload = {
        "started_at": 1000,
        "ended_at": 500,  # Invalid: ended_at before started_at
        "total_reps": -5, # Invalid negative reps
    }
    response = client.post("/api/sessions", json=invalid_payload)
    assert response.status_code == 422  # Unprocessable Entity
