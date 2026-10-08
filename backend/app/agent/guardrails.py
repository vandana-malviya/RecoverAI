import logging
from typing import Dict, Any, Tuple, Optional
from app.models.recovery import RecoveryAction, ActionPriority
from app.models.payment import FailureReason

logger = logging.getLogger("recoverai.guardrails")


class RecoveryGuardrails:
    """
    Deterministic Business Rules & Guardrails Layer.
    Ensures safe, compliant AI agent behavior and protects merchants against
    excessive retries, gateway penalties, and negative customer friction.
    """

    MAX_RETRIES: int = 3

    @classmethod
    def evaluate(
        cls,
        payment_context: Dict[str, Any],
        customer_history: Optional[Dict[str, Any]],
        proposed_action: RecoveryAction,
        proposed_priority: ActionPriority
    ) -> Tuple[str, RecoveryAction, ActionPriority, str, list]:
        """
        Evaluates the proposed AI action against deterministic merchant guardrails.
        
        Returns:
            (guardrail_status, final_action, final_priority, guardrail_notes, factors_checked)
        """
        retry_count = payment_context.get("retry_count", 0)
        failure_reason = payment_context.get("failure_reason", "UNKNOWN")
        amount = payment_context.get("amount", 0.0)
        customer_segment = customer_history.get("customer_segment") if customer_history else "REGULAR"
        
        factors_checked = []
        
        # 1. Hard Guardrail: Max Retry Boundary
        factors_checked.append(f"Retry Count Check: {retry_count}/{cls.MAX_RETRIES}")
        if retry_count >= cls.MAX_RETRIES:
            status = "OVERRIDDEN" if proposed_action != RecoveryAction.ESCALATE_TO_MERCHANT else "ENFORCED"
            logger.info(f"Guardrail triggered for max retries: {status}")
            return (
                status,
                RecoveryAction.ESCALATE_TO_MERCHANT,
                ActionPriority.HIGH,
                f"Deterministic Safety Guardrail Triggered: Max retry threshold ({cls.MAX_RETRIES}) reached. Automated retries locked to prevent gateway chargeback penalties.",
                factors_checked
            )

        # 2. Hard Guardrail: Expired / Invalid Card Lock
        factors_checked.append(f"Failure Credential Validity: {failure_reason}")
        if failure_reason in [FailureReason.EXPIRED_CARD.value, FailureReason.INVALID_CARD.value]:
            status = "OVERRIDDEN" if proposed_action in [RecoveryAction.RETRY_NOW, RecoveryAction.RETRY_AFTER_DELAY] else "ENFORCED"
            return (
                status,
                RecoveryAction.REQUEST_PAYMENT_METHOD_UPDATE,
                proposed_priority,
                f"Deterministic Safety Guardrail Triggered: Failure mode is {failure_reason}. Re-attempts strictly blocked; customer credential update link enforced.",
                factors_checked
            )

        # 3. Guardrail: Transient UPI Failure Safeguard
        if failure_reason == FailureReason.UPI_FAILURE.value and proposed_action == RecoveryAction.RETRY_NOW:
            status = "OVERRIDDEN"
            notes = "Deterministic Safety Guardrail Triggered: UPI PSP bank node degradation detected. Instant retry blocked and replaced with alternative payment method suggestion to avoid duplicate debit."
            return (
                status,
                RecoveryAction.SUGGEST_ALTERNATIVE_PAYMENT,
                proposed_priority,
                notes,
                factors_checked
            )

        # 4. Guardrail: High-Value VIP Basket Protection
        factors_checked.append(f"Customer Value & Amount Tier: {customer_segment} / ₹{amount:,.0f}")
        final_priority = proposed_priority
        notes = "All deterministic safety guardrails passed successfully."
        status = "PASSED"

        if customer_segment == "HIGH_VALUE" or amount >= 25000.0:
            if final_priority != ActionPriority.HIGH:
                final_priority = ActionPriority.HIGH
                status = "ENFORCED"
                notes = "Deterministic Policy Enforced: High-value VIP transaction promoted to HIGH priority recovery queue."

        return (status, proposed_action, final_priority, notes, factors_checked)
