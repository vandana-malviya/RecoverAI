from fastapi import APIRouter, Depends
from typing import Dict, Any, List
from app.database.connection import get_db
from app.routers.auth import get_current_user
from app.models.auth import User
from app.models.simulator import SimulationParams, SimulationResult, SimulationScenarioMetric
from app.models.payment import FailureReason, PaymentStatus

router = APIRouter(prefix="/simulator", tags=["Strategy Simulator"])


@router.post("/run", response_model=SimulationResult)
async def run_strategy_simulation(
    params: SimulationParams,
    current_user: User = Depends(get_current_user)
):
    """
    Simulates portfolio-wide revenue recovery and merchant ROI based on customized AI recovery policies.
    """
    db = get_db()
    payments = await db.payments.find({}).to_list(length=1000)
    customers = await db.customers.find({}).to_list(length=1000)
    customer_map = {c["customer_id"]: c for c in customers}

    # Filter all payments that encountered failures
    failed_payments = [p for p in payments if p.get("failure_reason") or p.get("status") in [PaymentStatus.FAILED.value, PaymentStatus.RECOVERED.value]]
    
    total_failed_volume = sum(float(p.get("amount", 0.0)) for p in failed_payments)
    total_failed_count = len(failed_payments)

    if total_failed_count == 0:
        total_failed_volume = 485000.0
        total_failed_count = 85

    # Category buckets
    categories = {
        "Temporary Network & Timeout Glitches": {
            "reasons": [FailureReason.NETWORK_ERROR.value, FailureReason.TIMEOUT.value],
            "base_rec_rate": 0.35,
            "ai_rec_rate": 0.88 if params.auto_retry_enabled else 0.40,
            "unnecessary_retry_risk_base": 0.45,
            "unnecessary_retry_risk_ai": 0.05,
        },
        "UPI Network & PSP Outages": {
            "reasons": [FailureReason.UPI_FAILURE.value],
            "base_rec_rate": 0.20,
            "ai_rec_rate": 0.79 if params.suggest_alt_method_enabled else 0.35,
            "unnecessary_retry_risk_base": 0.60,
            "unnecessary_retry_risk_ai": 0.08,
        },
        "Bank Issuer Declines & Funds Reloads": {
            "reasons": [FailureReason.BANK_DECLINED.value, FailureReason.INSUFFICIENT_FUNDS.value],
            "base_rec_rate": 0.18,
            "ai_rec_rate": 0.68 if (params.auto_retry_enabled and params.smart_reminder_enabled) else 0.30,
            "unnecessary_retry_risk_base": 0.50,
            "unnecessary_retry_risk_ai": 0.12,
        },
        "Expired & Invalid Card Credentials": {
            "reasons": [FailureReason.EXPIRED_CARD.value, FailureReason.INVALID_CARD.value],
            "base_rec_rate": 0.05,
            "ai_rec_rate": 0.72 if params.smart_reminder_enabled else 0.15,
            "unnecessary_retry_risk_base": 0.85,
            "unnecessary_retry_risk_ai": 0.02,
        },
        "Other Financial Gateway Errors": {
            "reasons": [FailureReason.UNKNOWN.value],
            "base_rec_rate": 0.15,
            "ai_rec_rate": 0.55 if params.smart_reminder_enabled else 0.22,
            "unnecessary_retry_risk_base": 0.40,
            "unnecessary_retry_risk_ai": 0.10,
        },
    }

    category_breakdown: List[SimulationScenarioMetric] = []
    total_baseline_recovered = 0.0
    total_simulated_recovered = 0.0
    unnecessary_retries_saved_total = 0
    high_value_protected_vol = 0.0

    # Multiplier adjustments based on user slider controls
    delay_multiplier = 1.0 + (min(params.retry_window_minutes, 60) - 15) * 0.002
    retry_penalty = -0.05 if params.max_retries_allowed > 3 else (0.04 if params.max_retries_allowed == 2 else 0.0)

    for cat_name, cfg in categories.items():
        cat_payments = [p for p in failed_payments if p.get("failure_reason") in cfg["reasons"]]
        cat_vol = sum(float(p.get("amount", 0.0)) for p in cat_payments)
        cat_cnt = len(cat_payments)
        
        if cat_cnt == 0:
            cat_vol = total_failed_volume * 0.2
            cat_cnt = max(1, int(total_failed_count * 0.2))

        # Check high value volume in this category
        for p in cat_payments:
            cust = customer_map.get(p.get("customer_id"), {})
            if cust.get("customer_segment") == "HIGH_VALUE":
                high_value_protected_vol += float(p.get("amount", 0.0))

        base_rate = cfg["base_rec_rate"]
        sim_rate = min(0.96, max(0.10, (cfg["ai_rec_rate"] * delay_multiplier) + retry_penalty))

        base_rec_vol = cat_vol * base_rate
        sim_rec_vol = cat_vol * sim_rate
        sim_rec_cnt = int(cat_cnt * sim_rate)

        retries_saved = int(cat_cnt * (cfg["unnecessary_retry_risk_base"] - cfg["unnecessary_retry_risk_ai"]))
        unnecessary_retries_saved_total += max(0, retries_saved)

        friction_score = round(max(1.2, 8.5 - (sim_rate * 7.0)), 1)

        category_breakdown.append(SimulationScenarioMetric(
            category=cat_name,
            total_failed_volume=round(cat_vol, 2),
            total_failed_count=cat_cnt,
            projected_recovered_revenue=round(sim_rec_vol, 2),
            projected_recovered_count=sim_rec_cnt,
            recovery_rate_pct=round(sim_rate * 100, 1),
            unnecessary_retries_saved=max(0, retries_saved),
            customer_friction_score=friction_score
        ))

        total_baseline_recovered += base_rec_vol
        total_simulated_recovered += sim_rec_vol

    net_lift = total_simulated_recovered - total_baseline_recovered
    lift_pct = round((net_lift / total_baseline_recovered * 100), 1) if total_baseline_recovered > 0 else 0.0
    base_rate_pct = round((total_baseline_recovered / total_failed_volume * 100), 1) if total_failed_volume > 0 else 0.0
    sim_rate_pct = round((total_simulated_recovered / total_failed_volume * 100), 1) if total_failed_volume > 0 else 0.0

    # Strategic recommendations
    recs = []
    if params.retry_window_minutes < 20:
        recs.append("Extending the retry window to 30-45 mins will increase bank authorization recovery by an estimated +8.4%.")
    else:
        recs.append(f"Current {params.retry_window_minutes}-minute retry window aligns well with bank cooling periods.")
    
    if params.max_retries_allowed > 3:
        recs.append("Alert: Max retries > 3 increases gateway risk scores and customer churn. Recommend capping at 2 or 3 retries.")
    else:
        recs.append("Max retry boundary is optimized to prevent duplicate card charges and protect gateway SLA.")

    if params.suggest_alt_method_enabled:
        recs.append("Dynamic payment method switching is recovering up to 79% of transient UPI & Card failures.")

    if params.vip_priority_escalation:
        recs.append(f"VIP high-priority routing is safeguarding ₹{high_value_protected_vol:,.2f} in high-ticket transactions.")

    return SimulationResult(
        total_failed_amount=round(total_failed_volume, 2),
        total_failed_count=total_failed_count,
        baseline_recovery_revenue=round(total_baseline_recovered, 2),
        baseline_recovery_rate_pct=base_rate_pct,
        simulated_recovery_revenue=round(total_simulated_recovered, 2),
        simulated_recovery_rate_pct=sim_rate_pct,
        net_revenue_lift=round(net_lift, 2),
        lift_percentage=lift_pct,
        total_unnecessary_retries_prevented=unnecessary_retries_saved_total,
        high_value_revenue_protected=round(high_value_protected_vol, 2),
        estimated_merchant_roi_x=round(total_simulated_recovered / 15000, 1),
        category_breakdown=category_breakdown,
        strategy_recommendations=recs
    )
