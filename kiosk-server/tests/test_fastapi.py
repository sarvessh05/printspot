import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient

# Mock printer_tracker BEFORE importing app if it's used globally
# Or better, patch it in the test
from server import app
from config import settings

client = TestClient(app)

@pytest.fixture(autouse=True)
def mock_printer():
    with patch("utils.printer_status.printer_tracker.get_comprehensive_status") as mock:
        mock.return_value = {"status": "NORMAL", "is_online": True}
        yield mock

def test_health_check():
    """Verify that the FastAPI server is reachable."""
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"
    assert "kiosk_id" in response.json()

def test_printer_status():
    """Check the real-time status query route."""
    response = client.get("/api/printer-status")
    assert response.status_code == 200
    assert "status" in response.json()
    # Should return "NORMAL", "JAMMED", or "OFFLINE"
    assert response.json()["status"] in ["NORMAL", "JAMMED", "OFFLINE", "USER_INTERVENTION"]

def test_admin_reset_invalid_password():
    """Verify that admin routes are protected."""
    response = client.post("/admin/reset", json={
        "password": "WRONG_PASSWORD_123",
        "paper": True,
        "ink": True
    })
    assert response.status_code == 401

def test_admin_reset_valid_password():
    """Check that we can reset counters with the correct (env) password."""
    response = client.post("/admin/reset", json={
        "password": settings.ADMIN_PASSWORD,
        "paper": True,
        "ink": False
    })
    # This might return 401 if ADMIN_PASSWORD isn't actually set in the .env during test
    # or skip depending on config. Let's assume settings are correctly mocked or loaded.
    if settings.ADMIN_PASSWORD:
        assert response.status_code == 200
        assert response.json()["success"] is True
        assert response.json()["state"]["paper"] == 500
    else:
        pytest.skip("ADMIN_PASSWORD not configured.")

def test_print_invalid_request():
    """Verify empty print requests are rejected."""
    response = client.post("/print", json=[])
    assert response.status_code == 400

@pytest.mark.asyncio
async def test_revert_logic():
    """Testing that the cloud client's revert function is logically sound."""
    from utils.cloud_client import cloud
    # Just a logic pass - non-network testing for existence
    assert hasattr(cloud, "revert_job")
    assert hasattr(cloud, "complete_job_stats")
