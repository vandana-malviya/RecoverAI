import logging
from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Any, List
from datetime import datetime, timedelta
from app.database.connection import get_db
from app.routers.auth import get_current_user
from app.models.auth import User
from app.models.payment import PaymentStatus, RecoveryStatus, PaymentMethod, FailureReason
from app.agent.workflow import run_recovery_agent

logger = logging.getLogger("recoverai.demo")
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
        "gateway_error_code": "GATEWAY_TIMEOUT_504",
        "gateway_error_description": "Connection to bank gateway timed out during TLS handshake.",
        "expected_agent_action": "RETRY_AFTER_DELAY",
        "expected_guardrail": "PASSED",
        "guardrail_override": False,
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
        "gateway_error_code": "CARD_EXPIRED_201",
        "gateway_error_description": "Card expiry date has passed. Upstream payment network declined transaction.",
        "expected_agent_action": "REQUEST_PAYMENT_METHOD_UPDATE",
        "expected_guardrail": "OVERRIDDEN",
        "guardrail_override": True,
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
        "gateway_error_code": "UPI_PSP_TIMEOUT_504",
        "gateway_error_description": "Bank PSP node failed to acknowledge transaction within 30s window.",
        "expected_agent_action": "SUGGEST_ALTERNATIVE_PAYMENT",
        "expected_guardrail": "OVERRIDDEN",
        "guardrail_override": True,
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
        "gateway_error_code": "ISSUER_DECLINE_501",
        "gateway_error_description": "Issuing bank declined transaction under daily risk limit.",
        "expected_agent_action": "SEND_PAYMENT_REMINDER",
        "expected_guardrail": "ENFORCED",
        "guardrail_override": False,
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
        "gateway_error_code": "INSUFFICIENT_FUNDS_502",
        "gateway_error_description": "Customer account balance insufficient.",
        "expected_agent_action": "ESCALATE_TO_MERCHANT",
        "expected_guardrail": "OVERRIDDEN",
        "guardrail_override": True,
        "story": "Transaction has already failed 3 times. The AI and deterministic guardrail prevent further automated retries to protect gateway health, escalating directly to merchant ops.",
        "badge": "Safety Boundary"
    },
]


async def _reset_single_scenario(scenario: Dict[str, Any], db):
    pid = scenario["payment_id"]
    scenario_id = scenario["id"]
    retry_cnt = 3 if scenario_id == "scenario-5" else (1 if scenario_id == "scenario-3" else 0)

    # Check if payment exists; if not, create it
    existing = await db.payments.find_one({"payment_id": pid})
    if existing:
        await db.payments.update_one(
            {"payment_id": pid},
            {
                "$set": {
                    "status": PaymentStatus.FAILED.value,
                    "recovered": False,
                    "recovery_status": RecoveryStatus.UNPROCESSED.value,
                    "retry_count": retry_cnt,
                    "failure_reason": scenario["failure_reason"],
                    "gateway_error_code": scenario.get("gateway_error_code", "GATEWAY_ERROR"),
                    "gateway_error_description": scenario.get("gateway_error_description", "Payment rejected by switch."),
                },
                "$unset": {
                    "metadata.ai_recommendation": ""
                }
            }
        )
    else:
        doc = {
            "payment_id": pid,
            "customer_id": f"CUST_DEMO_{scenario_id[-1]}",
            "customer_name": scenario["customer_name"],
            "customer_email": f"{scenario['customer_name'].lower().replace(' ', '.')}@example.com",
            "amount": scenario["amount"],
            "currency": "INR",
            "payment_method": scenario["payment_method"],
            "status": PaymentStatus.FAILED.value,
            "failure_reason": scenario["failure_reason"],
            "gateway_error_code": scenario.get("gateway_error_code", "GATEWAY_ERROR"),
            "gateway_error_description": scenario.get("gateway_error_description", "Payment rejected by switch."),
            "created_at": datetime.utcnow().isoformat(),
            "retry_count": retry_cnt,
            "recovered": False,
            "recovery_status": RecoveryStatus.UNPROCESSED.value,
            "metadata": {}
        }
        await db.payments.insert_one(doc)

    await db.recovery_attempts.delete_many({"payment_id": pid})


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
    await _reset_single_scenario(scenario, db)

    return {
        "success": True,
        "scenario": scenario,
        "message": f"Scenario '{scenario['title']}' loaded. Payment {scenario['payment_id']} reset to clean failed state for live demonstration."
    }


@router.post("/reset-all")
async def reset_all_demo_scenarios(current_user: User = Depends(get_current_user)):
    """Resets all 5 demo scenarios simultaneously to clean initial failed states."""
    db = get_db()
    for s in DEMO_SCENARIOS:
        await _reset_single_scenario(s, db)

    return {
        "success": True,
        "reset_count": len(DEMO_SCENARIOS),
        "message": "All 5 demo scenarios (PAY_DEMO_001 to PAY_DEMO_005) have been reset to pristine baseline failed state."
    }


@router.post("/run-batch")
async def run_batch_evaluation(current_user: User = Depends(get_current_user)):
    """
    Evaluator Viva Mode: Runs the LangGraph AI Recovery Agent across all 5 demo scenarios in sequence.
    Returns comprehensive comparison matrix with original intent, guardrail verdicts, and confidence scores.
    """
    db = get_db()
    results = []

    for s in DEMO_SCENARIOS:
        await _reset_single_scenario(s, db)
        pid = s["payment_id"]
        
        try:
            decision = await run_recovery_agent(pid)
            results.append({
                "scenario_id": s["id"],
                "title": s["title"],
                "payment_id": pid,
                "amount": s["amount"],
                "failure_reason": s["failure_reason"],
                "recommended_action": decision.recommended_action.value,
                "confidence": decision.confidence,
                "priority": decision.priority.value,
                "guardrail_status": decision.guardrail_status,
                "guardrail_applied": decision.guardrail_applied,
                "original_recommended_action": decision.original_recommended_action.value if decision.original_recommended_action else decision.recommended_action.value,
                "guardrail_notes": decision.guardrail_notes,
                "reason": decision.reason
            })
        except Exception as e:
            logger.error(f"Batch evaluation for {pid} failed: {e}")
            results.append({
                "scenario_id": s["id"],
                "title": s["title"],
                "payment_id": pid,
                "error": str(e)
            })

    return {
        "success": True,
        "batch_size": len(results),
        "results": results,
        "message": "Batch evaluation completed across all 5 demo scenarios."
    }
