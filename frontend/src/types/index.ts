export type PaymentMethod = 'UPI' | 'CARD' | 'NETBANKING' | 'WALLET';
export type PaymentStatus = 'SUCCESS' | 'FAILED' | 'PENDING' | 'RECOVERED';
export type FailureReason = 
  | 'NETWORK_ERROR' 
  | 'BANK_DECLINED' 
  | 'INSUFFICIENT_FUNDS' 
  | 'EXPIRED_CARD' 
  | 'INVALID_CARD' 
  | 'UPI_FAILURE' 
  | 'TIMEOUT' 
  | 'UNKNOWN';

export type RecoveryStatus = 
  | 'UNPROCESSED' 
  | 'ANALYZING' 
  | 'ACTION_RECOMMENDED' 
  | 'ACTION_EXECUTED' 
  | 'RECOVERED' 
  | 'ESCALATED' 
  | 'UNRECOVERABLE';

export type RecoveryAction = 
  | 'RETRY_NOW' 
  | 'RETRY_AFTER_DELAY' 
  | 'SEND_PAYMENT_REMINDER' 
  | 'SUGGEST_ALTERNATIVE_PAYMENT' 
  | 'REQUEST_PAYMENT_METHOD_UPDATE' 
  | 'ESCALATE_TO_MERCHANT' 
  | 'NO_ACTION';

export type ActionPriority = 'HIGH' | 'MEDIUM' | 'LOW';
export type CustomerSegment = 'HIGH_VALUE' | 'REGULAR' | 'NEW';

export interface AuthUser {
  user_id: string;
  email: string;
  name: string;
  merchant_name: string;
  role: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user_id: string;
  email: string;
  name: string;
  role: string;
}

export interface Customer {
  customer_id: string;
  name: string;
  email: string;
  total_transactions: number;
  successful_transactions: number;
  failed_transactions: number;
  lifetime_value: number;
  preferred_payment_method: string;
  customer_segment: CustomerSegment;
  success_rate: number;
  risk_score: number;
  last_transaction_date?: string;
}

export interface PaymentItem {
  payment_id: string;
  customer_id: string;
  customer_name?: string;
  customer_email?: string;
  customer_segment?: CustomerSegment;
  amount: number;
  currency: string;
  payment_method: PaymentMethod;
  status: PaymentStatus;
  failure_reason?: FailureReason;
  gateway_error_code?: string;
  gateway_error_description?: string;
  created_at: string;
  retry_count: number;
  recovered: boolean;
  recovery_status: RecoveryStatus;
  ai_recommendation?: RecoveryAction;
  ai_confidence?: number;
  ai_priority?: ActionPriority;
  metadata?: Record<string, any>;
}

export interface AIDecisionOutput {
  payment_id: string;
  recommended_action: RecoveryAction;
  confidence: number;
  priority: ActionPriority;
  reason: string;
  customer_value: string;
  failure_category: string;
  suggested_delay_minutes?: number;
  alternative_action?: RecoveryAction;
  suggested_payment_method?: string;
  guardrail_status: 'PASSED' | 'OVERRIDDEN' | 'ENFORCED';
  guardrail_notes?: string;
  guardrail_applied?: boolean;
  original_recommended_action?: RecoveryAction;
  factors_considered: string[];
}

export interface RecoveryAttempt {
  recovery_id: string;
  payment_id: string;
  customer_id: string;
  action: RecoveryAction;
  status: string;
  timestamp: string;
  agent_confidence: number;
  reason: string;
  result: string;
  details?: Record<string, any>;
  guardrail_applied?: boolean;
  original_action?: RecoveryAction;
}

export interface DashboardMetrics {
  total_revenue: number;
  total_transactions: number;
  failed_payments_volume: number;
  failed_payments_count: number;
  recoverable_revenue: number;
  recovered_revenue: number;
  recovered_count: number;
  recovery_rate_pct: number;
  recovery_count_rate_pct: number;
  ai_actions_count: number;
  average_recovery_time_minutes: number;
  active_recovery_queue_count: number;
}

export interface DashboardCharts {
  revenue_over_time: Array<{ date: string; recovered: number; failed: number }>;
  failed_by_reason: Array<{ reason: string; code: string; count: number; volume: number }>;
  recovery_by_method: Array<{ method: string; failed_volume: number; recovered_volume: number; recovery_rate_pct: number; total_failures: number }>;
  action_distribution: Array<{ action: string; raw_action: string; count: number }>;
  recovered_vs_unrecovered: Array<{ name: string; value: number; color: string }>;
}

export interface SimulationParams {
  auto_retry_enabled: boolean;
  retry_window_minutes: number;
  max_retries_allowed: number;
  smart_reminder_enabled: boolean;
  reminder_channels: string[];
  suggest_alt_method_enabled: boolean;
  vip_priority_escalation: boolean;
}

export interface SimulationScenarioMetric {
  category: string;
  total_failed_volume: number;
  total_failed_count: number;
  projected_recovered_revenue: number;
  projected_recovered_count: number;
  recovery_rate_pct: number;
  unnecessary_retries_saved: number;
  customer_friction_score: number;
}

export interface SimulationResult {
  total_failed_amount: number;
  total_failed_count: number;
  baseline_recovery_revenue: number;
  baseline_recovery_rate_pct: number;
  simulated_recovery_revenue: number;
  simulated_recovery_rate_pct: number;
  net_revenue_lift: number;
  lift_percentage: number;
  total_unnecessary_retries_prevented: number;
  high_value_revenue_protected: number;
  estimated_merchant_roi_x: number;
  category_breakdown: SimulationScenarioMetric[];
  strategy_recommendations: string[];
}

export interface DemoScenario {
  id: string;
  title: string;
  payment_id: string;
  customer_name: string;
  customer_segment: string;
  amount: number;
  payment_method: string;
  failure_reason: string;
  gateway_error_code?: string;
  gateway_error_description?: string;
  expected_agent_action: string;
  expected_guardrail: string;
  guardrail_override?: boolean;
  story: string;
  badge: string;
}

export interface DemoBatchResultItem {
  scenario_id: string;
  title: string;
  payment_id: string;
  amount: number;
  failure_reason: string;
  recommended_action: string;
  confidence: number;
  priority: string;
  guardrail_status: string;
  guardrail_applied: boolean;
  original_recommended_action: string;
  guardrail_notes?: string;
  reason: string;
}

export interface DemoBatchResult {
  success: boolean;
  batch_size: number;
  results: DemoBatchResultItem[];
  message: string;
}

export interface WebhookPreset {
  id: string;
  name: string;
  description: string;
  event: string;
  amount: number;
  payment_method: string;
  failure_reason: string;
  gateway_error_code: string;
  gateway_error_description: string;
  customer_name: string;
  customer_email: string;
}

export interface WebhookSimulateResponse {
  success: boolean;
  event_id: string;
  event: string;
  payment_id: string;
  customer_name: string;
  amount: number;
  payment_method: string;
  failure_reason: string;
  status: string;
  recovery_status: string;
  ai_recommendation?: string;
  guardrail_status?: string;
  guardrail_applied?: boolean;
  original_recommended_action?: string;
  message: string;
}

export interface AgentActivity {
  activity_id: string;
  payment_id: string;
  customer_id: string;
  customer_name: string;
  amount: number;
  action: string;
  confidence: number;
  timestamp: string;
  status: string;
  reason: string;
  result: string;
}
