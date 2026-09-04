from pydantic import BaseModel, Field
from typing import Optional
from enum import Enum
from datetime import datetime


class CustomerSegment(str, Enum):
    HIGH_VALUE = "HIGH_VALUE"
    REGULAR = "REGULAR"
    NEW = "NEW"


class CustomerBase(BaseModel):
    customer_id: str
    name: str
    email: str
    total_transactions: int = 0
    successful_transactions: int = 0
    failed_transactions: int = 0
    lifetime_value: float = 0.0  # INR
    preferred_payment_method: str = "UPI"
    last_transaction_date: Optional[datetime] = None
    customer_segment: CustomerSegment = CustomerSegment.REGULAR
    risk_score: float = 0.0  # 0.0 to 1.0 (lower is better)


class CustomerCreate(CustomerBase):
    pass


class CustomerResponse(CustomerBase):
    success_rate: float = Field(default=0.0, description="Calculated success rate %")

    @classmethod
    def from_doc(cls, doc: dict):
        total = doc.get("total_transactions", 0)
        success = doc.get("successful_transactions", 0)
        success_rate = round((success / total * 100), 1) if total > 0 else 0.0
        return cls(
            customer_id=doc["customer_id"],
            name=doc["name"],
            email=doc["email"],
            total_transactions=total,
            successful_transactions=success,
            failed_transactions=doc.get("failed_transactions", 0),
            lifetime_value=float(doc.get("lifetime_value", 0.0)),
            preferred_payment_method=doc.get("preferred_payment_method", "UPI"),
            last_transaction_date=doc.get("last_transaction_date"),
            customer_segment=doc.get("customer_segment", CustomerSegment.REGULAR),
            risk_score=float(doc.get("risk_score", 0.0)),
            success_rate=success_rate,
        )
