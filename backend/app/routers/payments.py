from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Dict, Any, List, Optional
from app.database.connection import get_db
from app.routers.auth import get_current_user
from app.models.auth import User
from app.models.payment import PaymentResponse, PaymentStatus, RecoveryStatus, PaymentMethod, FailureReason

router = APIRouter(prefix="/payments", tags=["Payments"])


@router.get("")
async def get_payments(
    status: Optional[str] = Query(None, description="Filter by payment status: FAILED, SUCCESS, RECOVERED, PENDING"),
    recovery_status: Optional[str] = Query(None, description="Filter by recovery status"),
    failure_reason: Optional[str] = Query(None, description="Filter by failure reason"),
    payment_method: Optional[str] = Query(None, description="Filter by payment method: UPI, CARD, NETBANKING, WALLET"),
    search: Optional[str] = Query(None, description="Search by payment ID, customer ID, or customer name/email"),
    min_amount: Optional[float] = Query(None, description="Minimum amount"),
    max_amount: Optional[float] = Query(None, description="Maximum amount"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    current_user: User = Depends(get_current_user)
):
    """Retrieves paginated payments list with rich multi-facet filters and search."""
    db = get_db()
    query: Dict[str, Any] = {}

    if status:
        query["status"] = status
    if recovery_status:
        query["recovery_status"] = recovery_status
    if failure_reason:
        query["failure_reason"] = failure_reason
    if payment_method:
        query["payment_method"] = payment_method
    
    if min_amount is not None or max_amount is not None:
        amt_query = {}
        if min_amount is not None:
            amt_query["$gte"] = min_amount
        if max_amount is not None:
            amt_query["$lte"] = max_amount
        query["amount"] = amt_query

    # Fetch customers map to enrich responses and support search by customer name/email
    all_customers = await db.customers.find({}).to_list(length=1000)
    customer_map = {c["customer_id"]: c for c in all_customers}

    if search:
        search_term = search.strip().lower()
        matched_cust_ids = [
            cid for cid, c in customer_map.items()
            if search_term in c.get("name", "").lower() or search_term in c.get("email", "").lower()
        ]
        or_clauses = [
            {"payment_id": {"$regex": search, "$options": "i"}},
            {"customer_id": {"$regex": search, "$options": "i"}},
        ]
        if matched_cust_ids:
            or_clauses.append({"customer_id": {"$in": matched_cust_ids}})
        query["$or"] = or_clauses

    cursor = db.payments.find(query).sort("created_at", -1)
    total_matching = await db.payments.count_documents(query)
    raw_payments = await cursor.skip(skip).limit(limit).to_list(length=limit)

    results = []
    for p in raw_payments:
        cid = p.get("customer_id")
        cust = customer_map.get(cid, {})
        ai_rec = p.get("metadata", {}).get("ai_recommendation", {})
        
        results.append({
            "payment_id": p["payment_id"],
            "customer_id": cid,
            "customer_name": cust.get("name", "Unknown Customer"),
            "customer_email": cust.get("email", ""),
            "customer_segment": cust.get("customer_segment", "REGULAR"),
            "amount": p["amount"],
            "currency": p.get("currency", "INR"),
            "payment_method": p["payment_method"],
            "status": p["status"],
            "failure_reason": p.get("failure_reason"),
            "gateway_error_code": p.get("gateway_error_code"),
            "gateway_error_description": p.get("gateway_error_description"),
            "created_at": p["created_at"],
            "retry_count": p.get("retry_count", 0),
            "recovered": p.get("recovered", False),
            "recovery_status": p.get("recovery_status", "UNPROCESSED"),
            "ai_recommendation": ai_rec.get("recommended_action"),
            "ai_confidence": ai_rec.get("confidence"),
            "ai_priority": ai_rec.get("priority"),
            "metadata": p.get("metadata", {}),
        })

    return {
        "total": total_matching,
        "skip": skip,
        "limit": limit,
        "items": results
    }


@router.get("/{payment_id}")
async def get_payment_detail(payment_id: str, current_user: User = Depends(get_current_user)):
    """Fetches comprehensive payment details, linked customer profile, and all historical recovery attempts."""
    db = get_db()
    payment = await db.payments.find_one({"payment_id": payment_id})
    if not payment:
        raise HTTPException(status_code=404, detail=f"Payment {payment_id} not found")
    
    payment = dict(payment)
    payment.pop("_id", None)

    customer = await db.customers.find_one({"customer_id": payment["customer_id"]})
    if customer:
        customer = dict(customer)
        customer.pop("_id", None)
        total = customer.get("total_transactions", 0)
        success = customer.get("successful_transactions", 0)
        customer["historical_success_rate"] = round((success / total * 100), 1) if total > 0 else 0.0

    attempts = await db.recovery_attempts.find({"payment_id": payment_id}).sort("timestamp", -1).to_list(length=50)
    for a in attempts:
        a.pop("_id", None)

    # Customer other transactions summary
    other_payments = await db.payments.find({"customer_id": payment["customer_id"]}).sort("created_at", -1).to_list(length=10)
    for op in other_payments:
        op.pop("_id", None)

    return {
        "payment": payment,
        "customer": customer,
        "recovery_attempts": attempts,
        "recent_customer_payments": other_payments
    }


@router.get("/{payment_id}/timeline")
async def get_payment_timeline(payment_id: str, current_user: User = Depends(get_current_user)):
    """Generates an audit trail timeline of payment lifecycle events."""
    db = get_db()
    payment = await db.payments.find_one({"payment_id": payment_id})
    if not payment:
        raise HTTPException(status_code=404, detail=f"Payment {payment_id} not found")

    timeline = [
        {
            "event": "PAYMENT_INITIATED",
            "title": "Payment Authorization Initiated",
            "timestamp": payment["created_at"],
            "description": f"Customer initiated ₹{payment['amount']:,.2f} checkout via {payment['payment_method']}.",
            "status": "INFO"
        }
    ]

    if payment.get("failure_reason"):
        timeline.append({
            "event": "PAYMENT_FAILED",
            "title": f"Payment Authorization Failed: {payment['failure_reason']}",
            "timestamp": payment["created_at"],
            "description": payment.get("gateway_error_description", "Gateway reported transaction failure."),
            "status": "FAILED"
        })

    attempts = await db.recovery_attempts.find({"payment_id": payment_id}).sort("timestamp", 1).to_list(length=50)
    for a in attempts:
        timeline.append({
            "event": "RECOVERY_ACTION",
            "title": f"AI Recovery: {a['action']}",
            "timestamp": a["timestamp"],
            "description": a["result"],
            "confidence": a.get("agent_confidence"),
            "status": "SUCCESS" if "success" in a["result"].lower() or "recovered" in a["result"].lower() else "WARNING"
        })

    if payment.get("recovered"):
        timeline.append({
            "event": "REVENUE_RECOVERED",
            "title": "Revenue Successfully Recovered",
            "timestamp": attempts[-1]["timestamp"] if attempts else payment["created_at"],
            "description": f"₹{payment['amount']:,.2f} settled to merchant account.",
            "status": "SUCCESS"
        })

    return {"payment_id": payment_id, "timeline": timeline}
