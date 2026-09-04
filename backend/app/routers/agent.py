from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Any, List, Optional
from datetime import datetime
from app.database.connection import get_db
from app.routers.auth import get_current_user
from app.models.auth import User
from app.models.recovery import (
    AIDecisionOutput,
    RecoveryAction,
    RecoveryExecutionRequest,
    RecoveryExecutionResponse,
    ActionPriority
)
from app.models.payment import PaymentStatus, RecoveryStatus
from app.agent.workflow import run_recovery_agent
from app.agent.tools import (
    retry_payment,
    send_recovery_notification,
    suggest_alternative_payment_method,
    record_recovery_action,
    get_payment_details,
    get_customer_history
)

router = APIRouter(prefix="", tags=["Agent & Recovery"])


@router.post("/ai/analyze-payment", response_model=AIDecisionOutput)
async def analyze_payment(
    request: Dict[str, str],
    current_user: User = Depends(get_current_user)
):
    """Triggers the full LangGraph Recovery Agent workflow for a failed payment."""
    payment_id = request.get("payment_id")
    if not payment_id:
        raise HTTPException(status_code=400, detail="payment_id is required")

    db = get_db()
    payment = await db.payments.find_one({"payment_id": payment_id})
    if not payment:
        raise HTTPException(status_code=404, detail=f"Payment {payment_id} not found")

    try:
        decision = await run_recovery_agent(payment_id)
        return decision
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI Agent error: {str(e)}")


@router.post("/recovery/execute", response_model=RecoveryExecutionResponse)
async def execute_recovery_action(
    req: RecoveryExecutionRequest,
    current_user: User = Depends(get_current_user)
):
    """Executes or simulates the chosen recovery action (retry, smart notification, alternate method, escalation)."""
    db = get_db()
    payment = await db.payments.find_one({"payment_id": req.payment_id})
    if not payment:
        raise HTTPException(status_code=404, detail=f"Payment {req.payment_id} not found")

    action = req.action
    if not action:
        # Default to recommended action if available
        ai_rec = payment.get("metadata", {}).get("ai_recommendation", {})
        rec_str = ai_rec.get("recommended_action", RecoveryAction.RETRY_NOW.value)
        action = RecoveryAction(rec_str)

    payment_recovered = False
    new_status = payment.get("status", PaymentStatus.FAILED.value)
    now = datetime.utcnow()
    gateway_sim_response: Dict[str, Any] = {}
    result_message = ""

    if action in [RecoveryAction.RETRY_NOW, RecoveryAction.RETRY_AFTER_DELAY]:
        retry_res = await retry_payment(req.payment_id)
        payment_recovered = retry_res["success"]
        new_status = retry_res["new_status"]
        gateway_sim_response = retry_res
        result_message = f"Payment retry executed. Outcome: {'RECOVERED' if payment_recovered else 'FAILED'}. ({retry_res.get('gateway_message')})"
        
        await record_recovery_action(
            payment_id=req.payment_id,
            action=action.value,
            result=result_message,
            confidence=0.92,
            reason="Automated retry triggered based on transaction recovery strategy.",
            details=retry_res
        )

    elif action == RecoveryAction.SEND_PAYMENT_REMINDER:
        notif_res = await send_recovery_notification(req.payment_id, channel=req.channel or "WHATSAPP")
        gateway_sim_response = notif_res
        result_message = f"Recovery notification dispatched via {req.channel or 'WHATSAPP'} with 1-click checkout recovery link."
        
        await record_recovery_action(
            payment_id=req.payment_id,
            action=action.value,
            result=result_message,
            confidence=0.88,
            reason="Customer payment reminder dispatched via direct digital channel.",
            details=notif_res
        )

    elif action == RecoveryAction.SUGGEST_ALTERNATIVE_PAYMENT:
        alt_res = await suggest_alternative_payment_method(req.payment_id)
        gateway_sim_response = alt_res
        result_message = f"Alternative payment recommendation ({alt_res.get('suggested_primary_alternative')}) prepared and checkout routing updated."
        
        await record_recovery_action(
            payment_id=req.payment_id,
            action=action.value,
            result=result_message,
            confidence=0.90,
            reason=alt_res.get("reasoning", "Suggested alternative payment routing."),
            details=alt_res
        )

    elif action == RecoveryAction.REQUEST_PAYMENT_METHOD_UPDATE:
        update_link = f"https://pay.recoverai.io/portal/update-payment-method?pid={req.payment_id}"
        gateway_sim_response = {"update_portal_link": update_link, "status": "REQUESTED"}
        result_message = "Secure payment credential update request dispatched to customer."
        
        await db.payments.update_one(
            {"payment_id": req.payment_id},
            {"$set": {"recovery_status": RecoveryStatus.ACTION_EXECUTED.value}}
        )
        
        await record_recovery_action(
            payment_id=req.payment_id,
            action=action.value,
            result=result_message,
            confidence=0.95,
            reason="Customer credentials invalid or expired. Update link sent.",
            details=gateway_sim_response
        )

    elif action == RecoveryAction.ESCALATE_TO_MERCHANT:
        gateway_sim_response = {"ticket_id": f"TICK_{now.strftime('%y%m%d')}_{req.payment_id}", "priority": "HIGH"}
        result_message = "Payment escalated to Merchant Operations queue for manual review."
        
        await db.payments.update_one(
            {"payment_id": req.payment_id},
            {"$set": {"recovery_status": RecoveryStatus.ESCALATED.value}}
        )
        
        await record_recovery_action(
            payment_id=req.payment_id,
            action=action.value,
            result=result_message,
            confidence=0.96,
            reason="Automated recovery limit reached or high risk detected; escalated to merchant ops.",
            details=gateway_sim_response
        )

    else:
        result_message = "No automated action taken based on risk policy."
        gateway_sim_response = {"status": "NO_ACTION_RECORDED"}

    return RecoveryExecutionResponse(
        recovery_id=f"REC_EXEC_{now.strftime('%H%M%S')}_{req.payment_id}",
        payment_id=req.payment_id,
        action=action,
        status="SUCCESS",
        message=result_message,
        payment_recovered=payment_recovered,
        new_payment_status=new_status,
        timestamp=now,
        simulated_gateway_response=gateway_sim_response
    )


@router.get("/agent/activity")
async def get_agent_activity(
    limit: int = 50,
    current_user: User = Depends(get_current_user)
):
    """Fetches real-time chronological activity audit logs of AI agent actions and results."""
    db = get_db()
    activities = await db.agent_activities.find({}).sort("timestamp", -1).limit(limit).to_list(length=limit)
    for act in activities:
        act.pop("_id", None)
    return {"activities": activities, "count": len(activities)}


@router.get("/recovery/history")
async def get_recovery_history(
    payment_id: Optional[str] = None,
    limit: int = 50,
    current_user: User = Depends(get_current_user)
):
    """Fetches past recovery attempts across all payments or for a specific payment."""
    db = get_db()
    query = {"payment_id": payment_id} if payment_id else {}
    attempts = await db.recovery_attempts.find(query).sort("timestamp", -1).limit(limit).to_list(length=limit)
    for a in attempts:
        a.pop("_id", None)
    return {"attempts": attempts, "count": len(attempts)}
