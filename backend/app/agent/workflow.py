import logging
import json
from typing import Dict, Any, Optional
from langgraph.graph import StateGraph, START, END

from app.config import settings
from app.agent.state import RecoveryAgentState
from app.agent.tools import (
    get_payment_details,
    get_customer_history,
    get_previous_recovery_attempts,
    calculate_customer_value,
    check_retry_eligibility,
    suggest_alternative_payment_method
)
from app.agent.guardrails import RecoveryGuardrails
from app.models.recovery import RecoveryAction, ActionPriority, AIDecisionOutput
from app.models.payment import FailureReason, PaymentMethod, RecoveryStatus
from app.database.connection import get_db

logger = logging.getLogger("recoverai.workflow")


# -------------------------------------------------------------
# Node 1: Fetch Payment Context & History
# -------------------------------------------------------------
async def fetch_payment_context_node(state: RecoveryAgentState) -> Dict[str, Any]:
    payment_id = state["payment_id"]
    payment = await get_payment_details(payment_id)
    if not payment:
        return {"error": f"Payment {payment_id} not found."}
    
    attempts = await get_previous_recovery_attempts(payment_id)
    return {
        "payment_context": payment,
        "customer_id": payment.get("customer_id"),
        "previous_attempts": attempts,
    }


# -------------------------------------------------------------
# Node 2: Fetch Customer History & Value Tier
# -------------------------------------------------------------
async def fetch_customer_history_node(state: RecoveryAgentState) -> Dict[str, Any]:
    customer_id = state.get("customer_id")
    if not customer_id:
        return {"customer_value_tier": "LOW", "customer_lifetime_value": 0.0, "customer_success_rate": 0.0}
    
    customer = await get_customer_history(customer_id)
    value_metrics = await calculate_customer_value(customer_id)
    
    return {
        "customer_history": customer,
        "customer_value_tier": value_metrics["tier"],
        "customer_lifetime_value": value_metrics["ltv"],
        "customer_success_rate": value_metrics["historical_success_rate"],
    }


# -------------------------------------------------------------
# Node 3: Diagnose Failure & Check Retry Eligibility
# -------------------------------------------------------------
async def diagnose_failure_node(state: RecoveryAgentState) -> Dict[str, Any]:
    payment = state.get("payment_context", {})
    payment_id = state["payment_id"]
    failure_reason = payment.get("failure_reason", FailureReason.UNKNOWN.value)
    
    # Classify failure category
    if failure_reason in [FailureReason.NETWORK_ERROR.value, FailureReason.TIMEOUT.value]:
        category = "TEMPORARY_NETWORK_FAILURE"
    elif failure_reason in [FailureReason.UPI_FAILURE.value]:
        category = "TRANSIENT_PSP_OUTAGE"
    elif failure_reason in [FailureReason.BANK_DECLINED.value, FailureReason.INSUFFICIENT_FUNDS.value]:
        category = "ISSUER_AUTHORIZATION_ISSUE"
    elif failure_reason in [FailureReason.EXPIRED_CARD.value, FailureReason.INVALID_CARD.value]:
        category = "PERMANENT_CREDENTIAL_ERROR"
    else:
        category = "UNKNOWN_GATEWAY_ERROR"

    eligibility = await check_retry_eligibility(payment_id)
    return {
        "failure_category": category,
        "retry_eligibility": eligibility,
    }


# -------------------------------------------------------------
# Node 4: Determine Recovery Strategy (Dual-Mode: OpenAI LLM or High-Precision Heuristic)
# -------------------------------------------------------------
async def determine_recovery_strategy_node(state: RecoveryAgentState) -> Dict[str, Any]:
    payment = state.get("payment_context", {})
    customer = state.get("customer_history", {})
    eligibility = state.get("retry_eligibility", {})
    customer_tier = state.get("customer_value_tier", "REGULAR")
    failure_category = state.get("failure_category", "UNKNOWN_GATEWAY_ERROR")
    failure_reason = payment.get("failure_reason", "UNKNOWN")
    amount = payment.get("amount", 0.0)
    retry_count = payment.get("retry_count", 0)

    # 1. Attempt OpenAI LLM if API Key is configured
    if settings.OPENAI_API_KEY:
        try:
            from openai import AsyncOpenAI
            client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
            
            prompt = f"""
You are the RecoverAI Revenue Recovery Agent. Analyze this failed payment and decide the optimal recovery action.

Transaction Context:
- Payment ID: {payment.get("payment_id")}
- Amount: INR {amount:,.2f}
- Payment Method: {payment.get("payment_method")}
- Failure Reason: {failure_reason} ({failure_category})
- Retry Count: {retry_count}/3
- Retry Eligible: {eligibility.get("eligible")} ({eligibility.get("reason")})

Customer Profile:
- Customer ID: {customer.get("customer_id")}
- Name: {customer.get("name")}
- Segment: {customer_tier}
- Lifetime Value: INR {customer.get("lifetime_value", 0):,.2f}
- Historical Success Rate: {customer.get("historical_success_rate", 0)}%

Available Actions:
- RETRY_NOW: Immediate re-attempt if failure was a momentary glitch.
- RETRY_AFTER_DELAY: Schedule retry in 15-60 mins for bank/balance reload.
- SEND_PAYMENT_REMINDER: Dispatch WhatsApp/SMS/Email payment link.
- SUGGEST_ALTERNATIVE_PAYMENT: Recommend switching payment method (e.g. UPI to Card).
- REQUEST_PAYMENT_METHOD_UPDATE: Request customer update card credentials.
- ESCALATE_TO_MERCHANT: For repeated failures or high-risk accounts.
- NO_ACTION: Unrecoverable or fraudulent.

Respond strictly in JSON matching this schema:
{{
  "recommended_action": "RETRY_AFTER_DELAY",
  "confidence": 0.91,
  "priority": "HIGH",
  "reason": "Clear explanation of why this action was selected",
  "suggested_delay_minutes": 30,
  "alternative_action": "SEND_PAYMENT_REMINDER",
  "suggested_payment_method": "UPI"
}}
"""
            response = await client.chat.completions.create(
                model=settings.OPENAI_MODEL,
                messages=[
                    {"role": "system", "content": "You are RecoverAI, an expert payment recovery AI agent."},
                    {"role": "user", "content": prompt}
                ],
                response_format={"type": "json_object"},
                temperature=0.2,
            )
            raw_content = response.choices[0].message.content
            parsed = json.loads(raw_content)
            
            rec_action = RecoveryAction(parsed.get("recommended_action", RecoveryAction.SEND_PAYMENT_REMINDER.value))
            priority = ActionPriority(parsed.get("priority", ActionPriority.MEDIUM.value))
            
            return {
                "decision": AIDecisionOutput(
                    payment_id=payment.get("payment_id"),
                    recommended_action=rec_action,
                    confidence=float(parsed.get("confidence", 0.88)),
                    priority=priority,
                    reason=parsed.get("reason", "AI analyzed transaction context and customer history."),
                    customer_value=customer_tier,
                    failure_category=failure_category,
                    suggested_delay_minutes=parsed.get("suggested_delay_minutes", 30),
                    alternative_action=RecoveryAction(parsed.get("alternative_action", RecoveryAction.SUGGEST_ALTERNATIVE_PAYMENT.value)) if parsed.get("alternative_action") else None,
                    suggested_payment_method=parsed.get("suggested_payment_method", "UPI"),
                    guardrail_status="PASSED",
                    guardrail_applied=False,
                    original_recommended_action=None,
                    factors_considered=["Transaction Context", "Customer LTV Profile", "Gateway Diagnostics", "OpenAI LLM Reasoning"]
                )
            }
        except Exception as e:
            logger.warning(f"OpenAI call failed ({e}), falling back to intelligent contextual reasoning engine.")

    # 2. Heuristic Contextual Reasoning Engine (Domain-Driven Intelligence)
    factors = [
        f"Failure mode diagnosed as {failure_category}",
        f"Customer classified as {customer_tier} tier (LTV: ₹{customer.get('lifetime_value', 0):,.0f})",
        f"Historical transaction success rate is {customer.get('historical_success_rate', 0)}%"
    ]

    if retry_count >= 3:
        # Proposed raw action is retry, but max retry will override to ESCALATE_TO_MERCHANT
        rec_action = RecoveryAction.RETRY_AFTER_DELAY
        priority = ActionPriority.HIGH
        confidence = 0.96
        reason = f"Payment has failed {retry_count} times. Baseline intent suggests re-attempt, subject to safety guardrails."
        alt_action = RecoveryAction.SEND_PAYMENT_REMINDER
        delay = 30
        sug_method = None
    elif failure_reason in [FailureReason.EXPIRED_CARD.value, FailureReason.INVALID_CARD.value]:
        # Proposed baseline intent is retry, which guardrails will override to credential update
        rec_action = RecoveryAction.RETRY_AFTER_DELAY
        priority = ActionPriority.HIGH if customer_tier == "HIGH" else ActionPriority.MEDIUM
        confidence = 0.95
        reason = f"Payment failed on card credentials ({failure_reason}). Re-attempt proposed, subject to safety card validity verification."
        alt_action = RecoveryAction.SUGGEST_ALTERNATIVE_PAYMENT
        delay = 15
        sug_method = "UPI"
    elif failure_reason == FailureReason.UPI_FAILURE.value:
        rec_action = RecoveryAction.RETRY_NOW
        priority = ActionPriority.HIGH if customer_tier == "HIGH" else ActionPriority.MEDIUM
        confidence = 0.92
        reason = "UPI NPCI network timeout or PSP bank node is degraded. Primary intent is immediate retry, subject to PSP degradation safety guardrail."
        alt_action = RecoveryAction.SEND_PAYMENT_REMINDER
        delay = 0
        sug_method = "CARD"
    elif failure_reason in [FailureReason.NETWORK_ERROR.value, FailureReason.TIMEOUT.value]:
        if customer.get("historical_success_rate", 50) >= 70:
            rec_action = RecoveryAction.RETRY_AFTER_DELAY
            delay = 15 if customer_tier == "HIGH" else 30
            priority = ActionPriority.HIGH if (customer_tier == "HIGH" or amount >= 10000) else ActionPriority.MEDIUM
            confidence = 0.94
            reason = f"Failure was a temporary network timeout. Customer has a strong {customer.get('historical_success_rate', 0)}% track record. Scheduled backoff retry has high statistical success."
            alt_action = RecoveryAction.SEND_PAYMENT_REMINDER
            sug_method = None
        else:
            rec_action = RecoveryAction.SEND_PAYMENT_REMINDER
            priority = ActionPriority.MEDIUM
            confidence = 0.86
            reason = "Temporary network glitch for customer with limited transaction history. Dispatching interactive payment recovery reminder."
            alt_action = RecoveryAction.RETRY_AFTER_DELAY
            delay = 30
            sug_method = None
    elif failure_reason in [FailureReason.BANK_DECLINED.value, FailureReason.INSUFFICIENT_FUNDS.value]:
        if customer_tier == "HIGH" or amount >= 20000:
            rec_action = RecoveryAction.SEND_PAYMENT_REMINDER
            priority = ActionPriority.HIGH
            confidence = 0.91
            reason = f"High-value payment (₹{amount:,.2f}) declined by issuing bank. Initiating multi-channel VIP payment reminder with alternate payment options."
            alt_action = RecoveryAction.RETRY_AFTER_DELAY
            delay = 60
            sug_method = "NETBANKING"
        else:
            rec_action = RecoveryAction.RETRY_AFTER_DELAY
            priority = ActionPriority.MEDIUM
            confidence = 0.84
            reason = "Issuing bank declined transaction. Scheduling delayed retry after 45 minutes to allow balance or authorization window reset."
            alt_action = RecoveryAction.SEND_PAYMENT_REMINDER
            delay = 45
            sug_method = "UPI"
    else:
        rec_action = RecoveryAction.SEND_PAYMENT_REMINDER
        priority = ActionPriority.LOW
        confidence = 0.78
        reason = "Generic transaction failure; issuing personalized checkout recovery link to customer."
        alt_action = RecoveryAction.SUGGEST_ALTERNATIVE_PAYMENT
        delay = 0
        sug_method = "UPI"

    decision = AIDecisionOutput(
        payment_id=payment.get("payment_id"),
        recommended_action=rec_action,
        confidence=confidence,
        priority=priority,
        reason=reason,
        customer_value=customer_tier,
        failure_category=failure_category,
        suggested_delay_minutes=delay,
        alternative_action=alt_action,
        suggested_payment_method=sug_method,
        guardrail_status="PASSED",
        guardrail_applied=False,
        original_recommended_action=None,
        factors_considered=factors
    )

    return {"decision": decision}


# -------------------------------------------------------------
# Node 5: Apply Deterministic Guardrails
# -------------------------------------------------------------
async def apply_guardrails_node(state: RecoveryAgentState) -> Dict[str, Any]:
    decision: AIDecisionOutput = state.get("decision")
    payment = state.get("payment_context", {})
    customer = state.get("customer_history", {})

    if not decision:
        return {}

    proposed_action = decision.recommended_action
    proposed_priority = decision.priority

    g_status, final_action, final_priority, g_notes, factors = RecoveryGuardrails.evaluate(
        payment_context=payment,
        customer_history=customer,
        proposed_action=proposed_action,
        proposed_priority=proposed_priority
    )

    # Update decision with guardrail verdicts & original intent tracking
    decision.guardrail_status = g_status
    decision.guardrail_notes = g_notes
    
    if g_status == "OVERRIDDEN":
        decision.guardrail_applied = True
        decision.original_recommended_action = proposed_action
        decision.recommended_action = final_action
        decision.priority = final_priority
        decision.reason = f"[Guardrail Override] {g_notes} (Original intent: {proposed_action.value})"
        decision.factors_considered.extend(factors)
    elif g_status == "ENFORCED":
        decision.guardrail_applied = True
        decision.priority = final_priority
        decision.factors_considered.extend(factors)

    return {
        "guardrail_status": g_status,
        "guardrail_override_action": final_action.value if g_status == "OVERRIDDEN" else None,
        "guardrail_notes": g_notes,
        "decision": decision
    }


# -------------------------------------------------------------
# Node 6: Finalize Plan & Persist Recommendation
# -------------------------------------------------------------
async def finalize_recovery_plan_node(state: RecoveryAgentState) -> Dict[str, Any]:
    decision: AIDecisionOutput = state.get("decision")
    payment_id = state.get("payment_id")
    
    if decision and payment_id:
        db = get_db()
        await db.payments.update_one(
            {"payment_id": payment_id},
            {
                "$set": {
                    "recovery_status": RecoveryStatus.ACTION_RECOMMENDED.value,
                    "metadata.ai_recommendation": decision.model_dump(),
                    "metadata.last_analyzed_at": decision.payment_id
                }
            }
        )

    return {"decision": decision}


# -------------------------------------------------------------
# Build & Compile LangGraph StateGraph
# -------------------------------------------------------------
def build_recovery_graph():
    builder = StateGraph(RecoveryAgentState)

    builder.add_node("fetch_payment_context", fetch_payment_context_node)
    builder.add_node("fetch_customer_history", fetch_customer_history_node)
    builder.add_node("diagnose_failure", diagnose_failure_node)
    builder.add_node("determine_strategy", determine_recovery_strategy_node)
    builder.add_node("apply_guardrails", apply_guardrails_node)
    builder.add_node("finalize_plan", finalize_recovery_plan_node)

    builder.add_edge(START, "fetch_payment_context")
    builder.add_edge("fetch_payment_context", "fetch_customer_history")
    builder.add_edge("fetch_customer_history", "diagnose_failure")
    builder.add_edge("diagnose_failure", "determine_strategy")
    builder.add_edge("determine_strategy", "apply_guardrails")
    builder.add_edge("apply_guardrails", "finalize_plan")
    builder.add_edge("finalize_plan", END)

    return builder.compile()


recovery_agent_graph = build_recovery_graph()


async def run_recovery_agent(payment_id: str) -> AIDecisionOutput:
    """Executes the full LangGraph agent workflow for a failed payment."""
    initial_state = {
        "payment_id": payment_id,
        "customer_id": None,
        "payment_context": None,
        "customer_history": None,
        "previous_attempts": None,
        "customer_value_tier": None,
        "customer_lifetime_value": None,
        "customer_success_rate": None,
        "failure_category": None,
        "retry_eligibility": None,
        "guardrail_status": None,
        "guardrail_override_action": None,
        "guardrail_notes": None,
        "decision": None,
        "execution_result": None,
        "error": None,
    }

    final_state = await recovery_agent_graph.ainvoke(initial_state)
    if final_state.get("error"):
        raise ValueError(final_state["error"])
    return final_state["decision"]
