import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_health_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.get("/health")
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "healthy"


@pytest.mark.asyncio
async def test_dashboard_metrics():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.get("/api/dashboard/metrics")
        assert res.status_code == 200
        data = res.json()
        assert data["total_revenue"] > 0
        assert data["failed_payments_volume"] > 0
        assert "recovery_rate_pct" in data


@pytest.mark.asyncio
async def test_dashboard_charts():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.get("/api/dashboard/charts")
        assert res.status_code == 200
        data = res.json()
        assert len(data["revenue_over_time"]) > 0
        assert len(data["failed_by_reason"]) > 0
        assert len(data["recovery_by_method"]) > 0


@pytest.mark.asyncio
async def test_payments_search_and_filters():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.get("/api/payments?payment_method=UPI&limit=10")
        assert res.status_code == 200
        data = res.json()
        assert "items" in data
        assert len(data["items"]) <= 10


@pytest.mark.asyncio
async def test_simulator_execution():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        payload = {
            "auto_retry_enabled": True,
            "retry_window_minutes": 30,
            "max_retries_allowed": 2,
            "smart_reminder_enabled": True,
            "reminder_channels": ["WHATSAPP", "EMAIL"],
            "suggest_alt_method_enabled": True,
            "vip_priority_escalation": True
        }
        res = await ac.post("/api/simulator/run", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert data["net_revenue_lift"] > 0
        assert len(data["category_breakdown"]) > 0


@pytest.mark.asyncio
async def test_webhook_simulate_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        payload = {
            "event": "payment.failed",
            "amount": 5499.0,
            "payment_method": "UPI",
            "failure_reason": "UPI_FAILURE",
            "customer_name": "Test Webhook User",
            "customer_email": "webhook.test@example.com",
            "auto_analyze": True
        }
        res = await ac.post("/api/webhook/simulate", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True
        assert "payment_id" in data
        assert data["payment_id"].startswith("PAY_WH_")
        assert data["ai_recommendation"] is not None


@pytest.mark.asyncio
async def test_demo_reset_all_and_run_batch():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Reset all
        res_reset = await ac.post("/api/demo/reset-all")
        assert res_reset.status_code == 200
        assert res_reset.json()["reset_count"] == 5

        # Run batch
        res_batch = await ac.post("/api/demo/run-batch")
        assert res_batch.status_code == 200
        data = res_batch.json()
        assert data["success"] is True
        assert data["batch_size"] == 5
        assert len(data["results"]) == 5
