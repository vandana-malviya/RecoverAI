from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from enum import Enum
from datetime import datetime


class PaymentMethod(str, Enum):
    UPI = "UPI"
    CARD = "CARD"
    NETBANKING = "NETBANKING"
    WALLET = "WALLET"


class PaymentStatus(str, Enum):
    SUCCESS = "SUCCESS"
    FAILED = "FAILED"
    PENDING = "PENDING"
    RECOVERED = "RECOVERED"


class FailureReason(str, Enum):
    NETWORK_ERROR = "NETWORK_ERROR"
    BANK_DECLINED = "BANK_DECLINED"
    INSUFFICIENT_FUNDS = "INSUFFICIENT_FUNDS"
    EXPIRED_CARD = "EXPIRED_CARD"
    INVALID_CARD = "INVALID_CARD"
    UPI_FAILURE = "UPI_FAILURE"
    TIMEOUT = "TIMEOUT"
    UNKNOWN = "UNKNOWN"


class RecoveryStatus(str, Enum):
    UNPROCESSED = "UNPROCESSED"
    ANALYZING = "ANALYZING"
    ACTION_RECOMMENDED = "ACTION_RECOMMENDED"
    ACTION_EXECUTED = "ACTION_EXECUTED"
    RECOVERED = "RECOVERED"
    ESCALATED = "ESCALATED"
    UNRECOVERABLE = "UNRECOVERABLE"


class PaymentBase(BaseModel):
    payment_id: str
    customer_id: str
    amount: float
    currency: str = "INR"
    payment_method: PaymentMethod
    status: PaymentStatus
    failure_reason: Optional[FailureReason] = None
    gateway_error_code: Optional[str] = None
    gateway_error_description: Optional[str] = None
    created_at: datetime
    retry_count: int = 0
    recovered: bool = False
    recovery_status: RecoveryStatus = RecoveryStatus.UNPROCESSED
    metadata: Dict[str, Any] = Field(default_factory=dict)


class PaymentCreate(PaymentBase):
    pass


class PaymentResponse(PaymentBase):
    customer_name: Optional[str] = None
    customer_email: Optional[str] = None
    customer_segment: Optional[str] = None
    ai_recommendation: Optional[str] = None
    ai_confidence: Optional[float] = None
    ai_priority: Optional[str] = None
