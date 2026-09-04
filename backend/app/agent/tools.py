import logging
import random
from datetime import datetime
from typing import Dict, Any, List, Optional
from app.database.connection import get_db
from app.models.payment import PaymentStatus, RecoveryStatus, PaymentMethod, FailureReason
from app.models.recovery import RecoveryAction

logger = logging.getLogger("recoverai.tools")


async def get_payment_details(payment_id: str) -> Optional[Dict[str, Any]]:
    """Tool 1: Fetches comprehensive payment transaction context from the database."""
    db = get_db()
    payment = await db.payments.find_one({"payment_id": payment_id})
    if not payment:
        return None
    # Remove Mongo _id for clean JSON
    payment = dict(payment)
    payment.pop("_id", None)
    return payment


async def get_customer_history(customer_id: str) -> Optional[Dict[str, Any]]:
    """Tool 2: Fetches customer profile, lifetime value, total transactions, and historical success rate."""
    db = get_db()
    customer = await db.customers.find_one({"customer_id": customer_id})
    if not customer:
        return None
    customer = dict(customer)
    customer.pop("_id", None)
    total = customer.get("total_transactions", 0)
    success = customer.get("successful_transactions", 0)
    customer["historical_success_rate"] = round((success / total * 100), 1) if total > 0 else 0.0
    return customer


async def get_previous_recovery_attempts(payment_id: str) -> List[Dict[str, Any]]:
    """Tool 3: Fetches all prior recovery attempts and decisions for a given payment."""
    db = get_db()
    cursor = db.recovery_attempts.find({"payment_id": payment_id}).sort("timestamp", -1)
    attempts = await cursor.to_list(length=100)
    for a in attempts:
        a.pop("_id", None)
    return attempts


async def calculate_customer_value(customer_id: str) -> Dict[str, Any]:
    """Tool 4: Computes customer value tier, revenue potential, and churn risk score."""
    customer = await get_customer_history(customer_id)
    if not customer:
        return {"tier": "LOW", "ltv": 0.0, "risk_score": 0.5, "priority_weight": 1.0}
    
    ltv = float(customer.get("lifetime_value", 0.0))
    segment = customer.get("customer_segment", "REGULAR")
    success_rate = customer.get("historical_success_rate", 50.0)

    if segment == "HIGH_VALUE" or ltv >= 100000:
        tier = "HIGH"
        priority_weight = 3.0
    elif segment == "REGULAR" or ltv >= 20000 or success_rate >= 80.0:
        tier = "MEDIUM"
        priority_weight = 2.0
    else:
        tier = "LOW"
        priority_weight = 1.0

    return {
        "tier": tier,
        "ltv": ltv,
        "segment": segment,
        "historical_success_rate": success_rate,
        "priority_weight": priority_weight,
        "risk_score": float(customer.get("risk_score", 0.2)),
    }


async def check_retry_eligibility(payment_id: str) -> Dict[str, Any]:
    """Tool 5: Evaluates whether a payment is technically and safely eligible for automated retry."""
    payment = await get_payment_details(payment_id)
    if not payment:
        return {"eligible": False, "reason": "Payment not found"}
    
    retry_count = payment.get("retry_count", 0)
    failure_reason = payment.get("failure_reason", "UNKNOWN")
    status = payment.get("status")

    if status in [PaymentStatus.SUCCESS.value, PaymentStatus.RECOVERED.value]:
        return {"eligible": False, "reason": "Payment already completed or recovered", "retry_count": retry_count}

    if retry_count >= 3:
        return {
            "eligible": False, 
            "reason": f"Maximum automated retry threshold reached ({retry_count}/3). Further retries risk gateway rate-limiting.",
            "retry_count": retry_count,
            "hard_block": True
        }

    # Permanent failure categories cannot be resolved with direct retry
    permanent_failures = [FailureReason.EXPIRED_CARD.value, FailureReason.INVALID_CARD.value]
    if failure_reason in permanent_failures:
        return {
            "eligible": False,
            "reason": f"Failure reason '{failure_reason}' is a permanent credential error. Direct retry will fail.",
            "retry_count": retry_count,
            "requires_credential_update": True
        }

    return {
        "eligible": True,
        "reason": f"Payment is eligible for retry ({retry_count}/3 attempts utilized).",
        "retry_count": retry_count,
        "suggested_backoff_seconds": 60 * (2 ** retry_count)
    }


async def retry_payment(payment_id: str) -> Dict[str, Any]:
    """Tool 6: Simulates executing a real-time payment retry through the mock financial gateway."""
    payment = await get_payment_details(payment_id)
    if not payment:
        return {"success": False, "message": "Payment not found"}

    db = get_db()
    current_retries = payment.get("retry_count", 0) + 1
    failure_reason = payment.get("failure_reason")

    # Simulation logic:
    # 1. Permanent failures (expired/invalid card) always fail retry unless card updated
    # 2. Network error / Timeout / UPI failure has 85% success rate on retry
    # 3. Bank decline / Insufficient funds has 65% success rate on delayed retry
    if failure_reason in [FailureReason.EXPIRED_CARD.value, FailureReason.INVALID_CARD.value]:
        recovered = False
        message = "Gateway declined retry: card credentials invalid or expired."
    elif failure_reason in [FailureReason.NETWORK_ERROR.value, FailureReason.TIMEOUT.value, FailureReason.UPI_FAILURE.value]:
        recovered = True  # High recovery rate for temporary transient errors
        message = "Mock Gateway: Transaction re-authorized successfully via secondary routing node."
    else:
        # Bank decline / insufficient balance / unknown
        recovered = random.random() < 0.70
        message = "Mock Gateway: Account authorized payment upon re-attempt." if recovered else "Mock Gateway: Bank issuer decline persisted."

    new_status = PaymentStatus.RECOVERED.value if recovered else PaymentStatus.FAILED.value
    new_recovery_status = RecoveryStatus.RECOVERED.value if recovered else (
        RecoveryStatus.ESCALATED.value if current_retries >= 3 else RecoveryStatus.ACTION_EXECUTED.value
    )

    await db.payments.update_one(
        {"payment_id": payment_id},
        {
            "$set": {
                "status": new_status,
                "recovered": recovered,
                "recovery_status": new_recovery_status,
            },
            "$inc": {"retry_count": 1}
        }
    )

    if recovered:
        # Update customer stats
        await db.customers.update_one(
            {"customer_id": payment["customer_id"]},
            {
                "$inc": {
                    "successful_transactions": 1,
                    "lifetime_value": payment.get("amount", 0.0)
                }
            }
        )

    return {
        "success": recovered,
        "payment_id": payment_id,
        "new_status": new_status,
        "new_recovery_status": new_recovery_status,
        "retry_count": current_retries,
        "gateway_message": message,
        "gateway_reference": f"MOCK_GW_TXN_{random.randint(100000, 999999)}"
    }


async def send_recovery_notification(payment_id: str, channel: str = "WHATSAPP") -> Dict[str, Any]:
    """Tool 7: Dispatches smart, localized recovery reminders via WhatsApp/SMS/Email magic checkout link."""
    payment = await get_payment_details(payment_id)
    if not payment:
        return {"success": False, "message": "Payment not found"}
    
    db = get_db()
    customer = await get_customer_history(payment["customer_id"])
    customer_name = customer.get("name", "Valued Customer") if customer else "Valued Customer"
    amount = payment.get("amount", 0.0)

    checkout_magic_link = f"https://pay.recoverai.io/checkout/recovery?pid={payment_id}&auth_token=tok_{random.randint(10000, 99999)}"
    
    notification_payload = {
        "channel": channel.upper(),
        "recipient": customer.get("email") if channel.upper() == "EMAIL" else f"+91-{random.randint(7000000000, 9999999999)}",
        "customer_name": customer_name,
        "message": f"Hi {customer_name}, your payment of ₹{amount:,.2f} could not be completed. Click here to instantly retry or choose another payment method: {checkout_magic_link}",
        "dispatched_at": datetime.utcnow().isoformat(),
        "status": "DELIVERED"
    }

    await db.payments.update_one(
        {"payment_id": payment_id},
        {
            "$set": {
                "recovery_status": RecoveryStatus.ACTION_EXECUTED.value,
                "metadata.last_notification": notification_payload
            }
        }
    )

    return {
        "success": True,
        "channel": channel.upper(),
        "notification_id": f"NOTIF_{random.randint(10000, 99999)}",
        "magic_link": checkout_magic_link,
        "status": "DELIVERED",
        "message": f"Recovery reminder dispatched via {channel.upper()} with 1-click checkout recovery link."
    }


async def suggest_alternative_payment_method(payment_id: str) -> Dict[str, Any]:
    """Tool 8: Generates dynamic alternate payment methods based on failure mode and customer preferences."""
    payment = await get_payment_details(payment_id)
    if not payment:
        return {"success": False, "message": "Payment not found"}

    db = get_db()
    current_method = payment.get("payment_method", "CARD")
    customer = await get_customer_history(payment["customer_id"])

    # Compute optimal alternative method
    if current_method == PaymentMethod.UPI.value:
        suggested = PaymentMethod.CARD.value
        fallback_reason = "UPI network node experiencing upstream latency; suggesting Credit/Debit Card or NetBanking."
        alternatives = [PaymentMethod.CARD.value, PaymentMethod.NETBANKING.value, PaymentMethod.WALLET.value]
    elif current_method == PaymentMethod.CARD.value:
        suggested = PaymentMethod.UPI.value
        fallback_reason = "Card authorization failed; suggesting instant UPI 1-click payment."
        alternatives = [PaymentMethod.UPI.value, PaymentMethod.NETBANKING.value]
    else:
        suggested = PaymentMethod.UPI.value
        fallback_reason = "Suggesting fastest alternative instant payment channel."
        alternatives = [PaymentMethod.UPI.value, PaymentMethod.CARD.value]

    await db.payments.update_one(
        {"payment_id": payment_id},
        {
            "$set": {
                "recovery_status": RecoveryStatus.ACTION_RECOMMENDED.value,
                "metadata.suggested_alternative_method": suggested
            }
        }
    )

    return {
        "success": True,
        "current_method": current_method,
        "suggested_primary_alternative": suggested,
        "all_alternatives": alternatives,
        "reasoning": fallback_reason,
    }


async def record_recovery_action(
    payment_id: str,
    action: str,
    result: str,
    confidence: float = 0.9,
    reason: str = "",
    details: Dict[str, Any] = None,
    guardrail_applied: bool = False
) -> Dict[str, Any]:
    """Tool 9: Writes recovery attempt audit record into database and updates agent activity feeds."""
    db = get_db()
    payment = await get_payment_details(payment_id)
    customer_id = payment.get("customer_id", "UNKNOWN") if payment else "UNKNOWN"
    customer = await get_customer_history(customer_id)
    customer_name = customer.get("name", "Merchant Customer") if customer else "Merchant Customer"
    amount = payment.get("amount", 0.0) if payment else 0.0

    rec_id = f"REC_{payment_id}_{random.randint(100, 999)}"
    now = datetime.utcnow()

    recovery_record = {
        "recovery_id": rec_id,
        "payment_id": payment_id,
        "customer_id": customer_id,
        "action": action,
        "status": "EXECUTED" if "success" in result.lower() or "recovered" in result.lower() else "RECORDED",
        "timestamp": now,
        "agent_confidence": confidence,
        "reason": reason,
        "result": result,
        "details": details or {},
        "guardrail_applied": guardrail_applied,
    }
    await db.recovery_attempts.insert_one(recovery_record)

    activity_record = {
        "activity_id": f"ACT_{rec_id}",
        "payment_id": payment_id,
        "customer_id": customer_id,
        "customer_name": customer_name,
        "amount": amount,
        "action": action,
        "confidence": confidence,
        "timestamp": now,
        "status": "RECOVERED" if ("recovered" in result.lower() or "success" in result.lower()) else "ACTION_TAKEN",
        "reason": reason,
        "result": result,
    }
    await db.agent_activities.insert_one(activity_record)

    return {
        "success": True,
        "recovery_id": rec_id,
        "logged_at": now.isoformat()
    }
