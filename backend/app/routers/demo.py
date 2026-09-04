from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Any, List
from datetime import datetime, timedelta
from app.database.connection import get_db
from app.routers.auth import get_current_user
from app.models.auth import User
from app.models.payment import PaymentStatus, RecoveryStatus, PaymentMethod, FailureReason

router = APIRouter(prefix="/demo", tags=["Demo Center"])

DEMO_SCENARIOS = [
    {
        "id": "scenario-1",
        "title": "Scenario 1: Temporary Network Glitch",
        "payment_id": "PAY_DEMO_001",
        "customer_name": "Aditi Sharma",
        "customer_segment": "HIGH_VALUE",
        "amount": 14500.0,
        "payment_method": "CARD",
        "failure_reason": "NETWORK_ERROR",
        "expected_agent_action": "RETRY_AFTER_DELAY",
        "expected_guardrail": "PASSED",
        "story": "A VIP subscriber experiences an upstream gateway timeout. The AI identifies strong customer history and schedules a delayed retry with high priority, recovering 100% of revenue.",
        "badge": "High Success Recovery"
    },
    {
        "id": "scenario-2",
        "title": "Scenario 2: Expired Card on Subscription",
        "payment_id": "PAY_DEMO_002",
        "customer_name": "Neha Joshi",
        "customer_segment": "REGULAR",
        "amount": 4200.0,
        "payment_method": "CARD",
        "failure_reason": "EXPIRED_CARD",
        "expected_agent_action": "REQUEST_PAYMENT_METHOD_UPDATE",
        "expected_guardrail": "OVERRIDDEN",
        "story": "Card authorization fails due to expiration. Guardrails prevent blind retries and the AI triggers an instant secure card-update portal link to the customer.",
        "badge": "Credential Guardrail"
    },
    {
        "id": "scenario-3",
        "title": "Scenario 3: UPI Failure / NPCI Timeout",
        "payment_id": "PAY_DEMO_003",
        "customer_name": "Siddharth Rao",
        "customer_segment": "REGULAR",
        "amount": 2850.0,
        "payment_method": "UPI",
        "failure_reason": "UPI_FAILURE",
        "expected_agent_action": "SUGGEST_ALTERNATIVE_PAYMENT",
        "expected_guardrail": "OVERRIDDEN",
        "story": "UPI network node suffers PSP degradation. Instead of spamming failed UPI retries, the AI immediately routes the customer to Card / NetBanking fallback.",
        "badge": "Dynamic Routing"
    },
    {
        "id": "scenario-4",
        "title": "Scenario 4: High-Value VIP Basket Bank Decline",
        "payment_id": "PAY_DEMO_004",
        "customer_name": "Vikram Malhotra",
        "customer_segment": "HIGH_VALUE",
        "amount": 48500.0,
        "payment_method": "CARD",
        "failure_reason": "BANK_DECLINED",
        "expected_agent_action": "SEND_PAYMENT_REMINDER",
        "expected_guardrail": "ENFORCED",
        "story": "A high-ticket ₹48,500 enterprise transaction declines. AI elevates priority to HIGH and triggers a proactive multi-channel VIP concierge reminder.",
        "badge": "VIP Protection"
    },
    {
        "id": "scenario-5",
        "title": "Scenario 5: Repeated Failure / Retry Exhaustion",
        "payment_id": "PAY_DEMO_005",
        "customer_name": "Simran Gill",
        "customer_segment": "NEW",
        "amount": 3400.0,
        "payment_method": "CARD",
        "failure_reason": "INSUFFICIENT_FUNDS",
        "expected_agent_action": "ESCALATE_TO_MERCHANT",
        "expected_guardrail": "OVERRIDDEN",
        "story": "Transaction has already failed 3 times. The AI and deterministic guardrail prevent further automated retries to protect gateway health, escalating directly to merchant ops.",
        "badge": "Safety Boundary"
    },
]


@router.get("/scenarios")
async def list_demo_scenarios(current_user: User = Depends(get_current_user)):
    """Returns the list of 5 predefined presentation scenarios."""
    return {"scenarios": DEMO_SCENARIOS}


@router.post("/trigger/{scenario_id}")
async def trigger_demo_scenario(scenario_id: str, current_user: User = Depends(get_current_user)):
    """Resets the designated payment to its initial failed state so it can be re-analyzed live in presentation."""
    scenario = next((s for s in DEMO_SCENARIOS if s["id"] == scenario_id), None)
    if not scenario:
        raise HTTPException(status_code=404, detail="Scenario not found")

    db = get_db()
    pid = scenario["payment_id"]

    # Reset payment to initial state
    retry_cnt = 3 if scenario_id == "scenario-5" else (1 if scenario_id == "scenario-3" else 0)
    
    await db.payments.update_one(
        {"payment_id": pid},
        {
            "$set": {
                "status": PaymentStatus.FAILED.value,
                "recovered": False,
                "recovery_status": RecoveryStatus.UNPROCESSED.value,
                "retry_count": retry_cnt,
            },
            "$unset": {
                "metadata.ai_recommendation": ""
            }
        }
    )

    # Remove temporary recovery attempts for this payment to allow fresh run
    await db.recovery_attempts.delete_many({"payment_id": pid})

    return {
        "success": True,
        "scenario": scenario,
        "message": f"Scenario '{scenario['title']}' loaded. Payment {pid} reset to fresh failed state for live demonstration."
    }
