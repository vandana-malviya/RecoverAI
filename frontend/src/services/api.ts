import type {
  DashboardMetrics,
  DashboardCharts,
  PaymentItem,
  Customer,
  AIDecisionOutput,
  RecoveryAttempt,
  SimulationParams,
  SimulationResult,
  DemoScenario,
  DemoBatchResult,
  AgentActivity,
  AuthUser,
  TokenResponse,
  WebhookPreset,
  WebhookSimulateResponse,
} from '../types';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

class ApiService {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('recoverai_token');
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('recoverai_token', token);
    } else {
      localStorage.removeItem('recoverai_token');
    }
  }

  getToken(): string | null {
    return this.token;
  }

  logout() {
    this.setToken(null);
    localStorage.removeItem('recoverai_user');
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    // Example:
    // const res = await fetch(`${API_BASE}/api/demo/reset-all`, { method: 'POST' });



    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    if (!res.ok) {
      let errorMsg = `HTTP Error ${res.status}`;
      try {
        const errJson = await res.json();
        errorMsg = errJson.detail || errorMsg;
      } catch {
        // use default error message
      }
      throw new Error(errorMsg);
    }

    return res.json() as Promise<T>;
  }

  // Auth
  async login(email: string, password: string): Promise<TokenResponse> {
    const res = await this.request<TokenResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (res.access_token) {
      this.setToken(res.access_token);
    }
    return res;
  }

  async getCurrentUser(): Promise<AuthUser> {
    return this.request<AuthUser>('/auth/me');
  }

  // Dashboard
  async getDashboardMetrics(): Promise<DashboardMetrics> {
    return this.request<DashboardMetrics>('/dashboard/metrics');
  }

  async getDashboardCharts(): Promise<DashboardCharts> {
    return this.request<DashboardCharts>('/dashboard/charts');
  }

  // Payments
  async getPayments(params: {
    status?: string;
    recovery_status?: string;
    failure_reason?: string;
    payment_method?: string;
    search?: string;
    min_amount?: number;
    max_amount?: number;
    skip?: number;
    limit?: number;
  } = {}): Promise<{ total: number; skip: number; limit: number; items: PaymentItem[] }> {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        searchParams.append(k, String(v));
      }
    });
    const query = searchParams.toString();
    return this.request<{ total: number; skip: number; limit: number; items: PaymentItem[] }>(
      `/payments${query ? `?${query}` : ''}`
    );
  }

  async getPaymentDetail(paymentId: string): Promise<{
    payment: PaymentItem;
    customer: Customer;
    recovery_attempts: RecoveryAttempt[];
    recent_customer_payments: PaymentItem[];
  }> {
    return this.request(`/payments/${paymentId}`);
  }

  async getPaymentTimeline(paymentId: string): Promise<{
    payment_id: string;
    timeline: Array<{
      event: string;
      title: string;
      timestamp: string;
      description: string;
      confidence?: number;
      status: 'INFO' | 'SUCCESS' | 'WARNING' | 'FAILED';
    }>;
  }> {
    return this.request(`/payments/${paymentId}/timeline`);
  }

  // AI & Recovery
  async analyzePaymentWithAI(paymentId: string): Promise<AIDecisionOutput> {
    return this.request<AIDecisionOutput>('/ai/analyze-payment', {
      method: 'POST',
      body: JSON.stringify({ payment_id: paymentId }),
    });
  }

  async executeRecoveryAction(payload: {
    payment_id: string;
    action?: string;
    channel?: string;
    alternative_method?: string;
  }): Promise<{
    recovery_id: string;
    payment_id: string;
    action: string;
    status: string;
    message: string;
    payment_recovered: boolean;
    new_payment_status: string;
    timestamp: string;
    simulated_gateway_response: any;
    guardrail_applied?: boolean;
    original_action?: string;
  }> {
    return this.request('/recovery/execute', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getAgentActivity(limit: number = 50): Promise<{ activities: AgentActivity[]; count: number }> {
    return this.request(`/agent/activity?limit=${limit}`);
  }

  // Simulator
  async runSimulation(params: SimulationParams): Promise<SimulationResult> {
    return this.request<SimulationResult>('/simulator/run', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  // Demo Center
  async getDemoScenarios(): Promise<{ scenarios: DemoScenario[] }> {
    return this.request('/demo/scenarios');
  }

  async triggerDemoScenario(scenarioId: string): Promise<{
    success: boolean;
    scenario: DemoScenario;
    message: string;
  }> {
    return this.request(`/demo/trigger/${scenarioId}`, {
      method: 'POST',
    });
  }

  async resetAllDemoScenarios(): Promise<{
    success: boolean;
    reset_count: number;
    message: string;
  }> {
    return this.request('/demo/reset-all', {
      method: 'POST',
    });
  }

  async runBatchDemoScenarios(): Promise<DemoBatchResult> {
    return this.request('/demo/run-batch', {
      method: 'POST',
    });
  }

  // Webhook Simulation
  async getWebhookPresets(): Promise<{ presets: WebhookPreset[] }> {
    return this.request('/webhook/presets');
  }

  async simulateWebhook(payload: {
    event?: string;
    event_id?: string;
    payment_id?: string;
    customer_name?: string;
    customer_email?: string;
    amount?: number;
    currency?: string;
    payment_method?: string;
    failure_reason?: string;
    gateway_error_code?: string;
    gateway_error_description?: string;
    auto_analyze?: boolean;
  }): Promise<WebhookSimulateResponse> {
    return this.request<WebhookSimulateResponse>('/webhook/simulate', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }
}

export const api = new ApiService();
