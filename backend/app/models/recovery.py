from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from enum import Enum
from datetime import datetime


class RecoveryAction(str, Enum):
    RETRY_NOW = "RETRY_NOW"
    RETRY_AFTER_DELAY = "RETRY_AFTER_DELAY"
    SEND_PAYMENT_REMINDER = "SEND_PAYMENT_REMINDER"
    SUGGEST_ALTERNATIVE_PAYMENT = "SUGGEST_ALTERNATIVE_PAYMENT"
    REQUEST_PAYMENT_METHOD_UPDATE = "REQUEST_PAYMENT_METHOD_UPDATE"
    ESCALATE_TO_MERCHANT = "ESCALATE_TO_MERCHANT"
    NO_ACTION = "NO_ACTION"


class ActionPriority(str, Enum):
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"


class AIDecisionOutput(BaseModel):
    payment_id: str
    recommended_action: RecoveryAction
    confidence: float = Field(ge=0.0, le=1.0)
    priority: ActionPriority
    reason: str
    customer_value: str  # HIGH, MEDIUM, LOW
    failure_category: str
    suggested_delay_minutes: Optional[int] = 0
    alternative_action: Optional[RecoveryAction] = None
    suggested_payment_method: Optional[str] = None
    guardrail_status: str = "PASSED"  # PASSED, OVERRIDDEN, ENFORCED
    guardrail_notes: Optional[str] = None
    factors_considered: List[str] = Field(default_factory=list)


class RecoveryAttempt(BaseModel):
    recovery_id: str
    payment_id: str
    customer_id: str
    action: RecoveryAction
    status: str  # SUCCESS, FAILED, SCHEDULED, DISPATCHED, ESCALATED
    timestamp: datetime
    agent_confidence: float
    reason: str
    result: str
    details: Dict[str, Any] = Field(default_factory=dict)
    guardrail_applied: bool = False


class RecoveryExecutionRequest(BaseModel):
    payment_id: str
    action: Optional[RecoveryAction] = None
    override_reason: Optional[str] = None
    channel: Optional[str] = "WHATSAPP"  # SMS, EMAIL, WHATSAPP
    alternative_method: Optional[str] = "UPI"


class RecoveryExecutionResponse(BaseModel):
    recovery_id: str
    payment_id: str
    action: RecoveryAction
    status: str
    message: str
    payment_recovered: bool
    new_payment_status: str
    timestamp: datetime
    simulated_gateway_response: Dict[str, Any]
