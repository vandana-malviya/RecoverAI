import uuid
import logging
from datetime import datetime
from typing import Dict, Any, Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter, HTTPException, Depends

from app.database.connection import get_db
from app.routers.auth import get_current_user
from app.models.auth import User
from app.models.payment import PaymentStatus, RecoveryStatus, PaymentMethod, FailureReason
from app.agent.workflow import run_recovery_agent

logger = logging.getLogger("recoverai.webhook")

router = APIRouter(prefix="/webhook", tags=["Webhook Simulation"])


class WebhookSimulateRequest(BaseModel):
    event: str = Field(default="payment.failed", description="Standard webhook event name, e.g. payment.failed")
    event_id: Optional[str] = None
    payment_id: Optional[str] = None
    customer_id: Optional[str] = None
    customer_name: str = "Rahul Verma"
    customer_email: str = "rahul.verma@fintech-demo.in"
    amount: float = 4999.0
    currency: str = "INR"
    payment_method: str = "UPI"
    failure_reason: str = "UPI_FAILURE"
    gateway_error_code: str = "UPI_PSP_TIMEOUT_504"
    gateway_error_description: str = "Customer bank PSP server timed out during MPIN validation."
    auto_analyze: bool = True
    raw_payload: Optional[Dict[str, Any]] = None


WEBHOOK_PRESETS = [
    {
        "id": "preset_upi_timeout",
        "name": "Razorpay: UPI PSP Degradation Timeout",
        "description": "UPI switch server timeout on high-traffic festival day.",
        "event": "payment.failed",
        "amount": 3499.0,
        "payment_method": "UPI",
        "failure_reason": "UPI_FAILURE",
        "gateway_error_code": "UPI_PSP_TIMEOUT_504",
        "gateway_error_description": "Bank PSP node failed to acknowledge transaction within 30s SLA window.",
        "customer_name": "Siddharth Rao",
        "customer_email": "siddharth.rao@enterprise.io",
    },
    {
        "id": "preset_expired_card",
        "name": "Razorpay: Expired Card Subscription Drop",
        "description": "Recurring SaaS renewal failed due to expired credit card.",
        "event": "payment.failed",
        "amount": 8900.0,
        "payment_method": "CARD",
        "failure_reason": "EXPIRED_CARD",
        "gateway_error_code": "CARD_EXPIRED_201",
        "gateway_error_description": "Card expiry date 08/26 has lapsed. Upstream switch rejected charge.",
        "customer_name": "Neha Joshi",
        "customer_email": "neha.j@cloudmatrix.com",
    },
    {
        "id": "preset_bank_decline_vip",
        "name": "Razorpay: High-Value VIP Bank Decline",
        "description": "High-ticket enterprise purchase declined by issuing bank balance rules.",
        "event": "payment.failed",
        "amount": 42000.0,
        "payment_method": "CARD",
        "failure_reason": "BANK_DECLINED",
        "gateway_error_code": "ISSUER_DECLINE_501",
        "gateway_error_description": "Issuing bank declined transaction under daily e-commerce risk limit.",
        "customer_name": "Vikram Malhotra",
        "customer_email": "vikram.m@malhotracorp.com",
    },
    {
        "id": "preset_network_timeout",
        "name": "Stripe/Razorpay: Network Gateway Timeout",
        "description": "Ephemeral TLS handshake failure during checkout peak.",
        "event": "payment.failed",
        "amount": 14500.0,
        "payment_method": "CARD",
        "failure_reason": "NETWORK_ERROR",
        "gateway_error_code": "GATEWAY_TIMEOUT_504",
        "gateway_error_description": "Connection to bank gateway timed out during TLS handshake.",
        "customer_name": "Aditi Sharma",
        "customer_email": "aditi.sharma@techcorp.io",
    },
]


@router.get("/presets")
async def get_webhook_presets(current_user: User = Depends(get_current_user)):
    """Returns realistic pre-configured gateway webhook templates."""
    return {"presets": WEBHOOK_PRESETS}


@router.post("/simulate")
async def simulate_gateway_webhook(req: WebhookSimulateRequest, current_user: User = Depends(get_current_user)):
    """
    Simulates receiving an asynchronous gateway payment.failed webhook from Razorpay/Stripe.
    Ingests transaction into database and triggers LangGraph AI recovery workflow.
    """
    db = get_db()
    
    event_id = req.event_id or f"evt_{uuid.uuid4().hex[:10]}"
    payment_id = req.payment_id or f"PAY_WH_{uuid.uuid4().hex[:6].upper()}"
    customer_id = req.customer_id or f"CUST_WH_{uuid.uuid4().hex[:4].upper()}"
    
    # 1. Upsert Customer Record if needed
    existing_cust = await db.customers.find_one({"email": req.customer_email})
    if not existing_cust:
        cust_doc = {
            "customer_id": customer_id,
            "name": req.customer_name,
            "email": req.customer_email,
            "customer_segment": "HIGH_VALUE" if req.amount >= 25000.0 else "REGULAR",
            "preferred_payment_method": req.payment_method,
            "lifetime_value": float(req.amount * 4),
            "total_transactions": 6,
            "successful_transactions": 5,
            "failed_transactions": 1,
            "risk_score": 0.08,
            "created_at": datetime.utcnow().isoformat()
        }
        await db.customers.insert_one(cust_doc)
    else:
        customer_id = existing_cust["customer_id"]

    # 2. Insert Payment Record
    payment_doc = {
        "payment_id": payment_id,
        "customer_id": customer_id,
        "customer_name": req.customer_name,
        "customer_email": req.customer_email,
        "amount": float(req.amount),
        "currency": req.currency,
        "payment_method": req.payment_method,
        "status": PaymentStatus.FAILED.value,
        "failure_reason": req.failure_reason,
        "gateway_error_code": req.gateway_error_code,
        "gateway_error_description": req.gateway_error_description,
        "created_at": datetime.utcnow().isoformat(),
        "retry_count": 0,
        "recovered": False,
        "recovery_status": RecoveryStatus.UNPROCESSED.value,
        "metadata": {
            "webhook_event_id": event_id,
            "webhook_event": req.event,
            "ingested_via": "SIMULATED_GATEWAY_WEBHOOK",
            "ingested_at": datetime.utcnow().isoformat()
        }
    }
    await db.payments.insert_one(payment_doc)

    ai_decision = None
    if req.auto_analyze:
        try:
            ai_decision = await run_recovery_agent(payment_id)
        except Exception as e:
            logger.error(f"Auto AI analysis after webhook failed: {e}")

    return {
        "success": True,
        "event_id": event_id,
        "event": req.event,
        "payment_id": payment_id,
        "customer_name": req.customer_name,
        "amount": req.amount,
        "payment_method": req.payment_method,
        "failure_reason": req.failure_reason,
        "status": PaymentStatus.FAILED.value,
        "recovery_status": RecoveryStatus.ACTION_RECOMMENDED.value if ai_decision else RecoveryStatus.UNPROCESSED.value,
        "ai_recommendation": ai_decision.recommended_action.value if ai_decision else None,
        "guardrail_status": ai_decision.guardrail_status if ai_decision else None,
        "guardrail_applied": ai_decision.guardrail_applied if ai_decision else False,
        "original_recommended_action": ai_decision.original_recommended_action.value if (ai_decision and ai_decision.original_recommended_action) else None,
        "message": f"Gateway webhook '{req.event}' received and ingested. Payment {payment_id} is live in RecoverAI workbench."
    }
