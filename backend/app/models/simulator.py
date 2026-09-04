from pydantic import BaseModel, Field
from typing import List, Dict, Any


class SimulationParams(BaseModel):
    auto_retry_enabled: bool = True
    retry_window_minutes: int = Field(default=30, ge=5, le=1440)
    max_retries_allowed: int = Field(default=2, ge=1, le=5)
    smart_reminder_enabled: bool = True
    reminder_channels: List[str] = Field(default=["WHATSAPP", "EMAIL"])
    suggest_alt_method_enabled: bool = True
    vip_priority_escalation: bool = True


class SimulationScenarioMetric(BaseModel):
    category: str
    total_failed_volume: float
    total_failed_count: int
    projected_recovered_revenue: float
    projected_recovered_count: int
    recovery_rate_pct: float
    unnecessary_retries_saved: int
    customer_friction_score: float  # 0 to 10 (lower is better)


class SimulationResult(BaseModel):
    total_failed_amount: float
    total_failed_count: int
    baseline_recovery_revenue: float
    baseline_recovery_rate_pct: float
    simulated_recovery_revenue: float
    simulated_recovery_rate_pct: float
    net_revenue_lift: float
    lift_percentage: float
    total_unnecessary_retries_prevented: int
    high_value_revenue_protected: float
    estimated_merchant_roi_x: float
    category_breakdown: List[SimulationScenarioMetric]
    strategy_recommendations: List[str]
