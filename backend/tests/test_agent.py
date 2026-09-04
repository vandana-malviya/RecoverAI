import pytest
from app.agent.workflow import run_recovery_agent
from app.models.recovery import RecoveryAction, ActionPriority
from app.agent.tools import check_retry_eligibility, retry_payment


@pytest.mark.asyncio
async def test_scenario_1_network_error():
    """Scenario 1: Temporary network glitch on high-value customer -> RETRY_AFTER_DELAY."""
    decision = await run_recovery_agent("PAY_DEMO_001")
    assert decision.payment_id == "PAY_DEMO_001"
    assert decision.recommended_action == RecoveryAction.RETRY_AFTER_DELAY
    assert decision.priority == ActionPriority.HIGH
    assert decision.confidence >= 0.85
    assert decision.guardrail_status in ["PASSED", "ENFORCED"]


@pytest.mark.asyncio
async def test_scenario_2_expired_card():
    """Scenario 2: Expired card -> Guardrail enforces REQUEST_PAYMENT_METHOD_UPDATE."""
    decision = await run_recovery_agent("PAY_DEMO_002")
    assert decision.payment_id == "PAY_DEMO_002"
    assert decision.recommended_action == RecoveryAction.REQUEST_PAYMENT_METHOD_UPDATE
    assert decision.guardrail_status in ["PASSED", "OVERRIDDEN", "ENFORCED"]


@pytest.mark.asyncio
async def test_scenario_3_upi_failure():
    """Scenario 3: UPI failure -> AI suggests SUGGEST_ALTERNATIVE_PAYMENT."""
    decision = await run_recovery_agent("PAY_DEMO_003")
    assert decision.payment_id == "PAY_DEMO_003"
    assert decision.recommended_action == RecoveryAction.SUGGEST_ALTERNATIVE_PAYMENT
    assert decision.suggested_payment_method in ["CARD", "NETBANKING", "UPI"]


@pytest.mark.asyncio
async def test_scenario_5_retry_exhaustion_guardrail():
    """Scenario 5: 3 failed attempts -> Deterministic guardrail enforces ESCALATE_TO_MERCHANT."""
    decision = await run_recovery_agent("PAY_DEMO_005")
    assert decision.payment_id == "PAY_DEMO_005"
    assert decision.recommended_action == RecoveryAction.ESCALATE_TO_MERCHANT
    assert decision.guardrail_status in ["OVERRIDDEN", "ENFORCED"]


@pytest.mark.asyncio
async def test_retry_eligibility_tool():
    """Tests the retry eligibility check tool for hard limits."""
    elig_exhausted = await check_retry_eligibility("PAY_DEMO_005")
    assert elig_exhausted["eligible"] is False
    assert "threshold" in elig_exhausted["reason"].lower()
