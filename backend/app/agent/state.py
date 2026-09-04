from typing import TypedDict, Optional, List, Dict, Any
from app.models.recovery import RecoveryAction, ActionPriority, AIDecisionOutput


class RecoveryAgentState(TypedDict):
    payment_id: str
    customer_id: Optional[str]
    payment_context: Optional[Dict[str, Any]]
    customer_history: Optional[Dict[str, Any]]
    previous_attempts: Optional[List[Dict[str, Any]]]
    customer_value_tier: Optional[str]  # HIGH, MEDIUM, LOW
    customer_lifetime_value: Optional[float]
    customer_success_rate: Optional[float]
    failure_category: Optional[str]
    retry_eligibility: Optional[Dict[str, Any]]
    
    # Guardrails evaluation
    guardrail_status: Optional[str]  # PASSED, OVERRIDDEN, ENFORCED
    guardrail_override_action: Optional[str]
    guardrail_notes: Optional[str]
    
    # Final AI Decision
    decision: Optional[AIDecisionOutput]
    execution_result: Optional[Dict[str, Any]]
    error: Optional[str]
