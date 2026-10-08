import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  Zap,
  Send,
  CheckCircle2,
  AlertCircle,
  Code2,
  SlidersHorizontal,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { api } from '../services/api';
import type { WebhookPreset, WebhookSimulateResponse } from '../types';

interface WebhookSimulationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (response: WebhookSimulateResponse) => void;
}

export const WebhookSimulationModal: React.FC<WebhookSimulationModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const navigate = useNavigate();
  const [presets, setPresets] = useState<WebhookPreset[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState<string>('preset_upi_timeout');
  const [activeTab, setActiveTab] = useState<'form' | 'json'>('form');

  // Form states
  const [eventName, setEventName] = useState('payment.failed');
  const [paymentId, setPaymentId] = useState('');
  const [customerName, setCustomerName] = useState('Siddharth Rao');
  const [customerEmail, setCustomerEmail] = useState('siddharth.rao@enterprise.io');
  const [amount, setAmount] = useState<number>(3499);
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [failureReason, setFailureReason] = useState('UPI_FAILURE');
  const [gatewayErrorCode, setGatewayErrorCode] = useState('UPI_PSP_TIMEOUT_504');
  const [gatewayErrorDesc, setGatewayErrorDesc] = useState(
    'Bank PSP node failed to acknowledge transaction within 30s SLA window.'
  );
  const [autoAnalyze, setAutoAnalyze] = useState(true);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<WebhookSimulateResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setResult(null);
      setError(null);
      api
        .getWebhookPresets()
        .then((res) => {
          if (res.presets && res.presets.length > 0) {
            setPresets(res.presets);
            applyPreset(res.presets[0]);
          }
        })
        .catch((err) => {
          console.error('Failed to load webhook presets:', err);
        });
    }
  }, [isOpen]);

  const applyPreset = (preset: WebhookPreset) => {
    setSelectedPresetId(preset.id);
    setEventName(preset.event);
    setCustomerName(preset.customer_name);
    setCustomerEmail(preset.customer_email);
    setAmount(preset.amount);
    setPaymentMethod(preset.payment_method);
    setFailureReason(preset.failure_reason);
    setGatewayErrorCode(preset.gateway_error_code);
    setGatewayErrorDesc(preset.gateway_error_description);
    setPaymentId(`PAY_WH_${Math.floor(1000 + Math.random() * 9000)}`);
  };

  const handlePresetChange = (presetId: string) => {
    const p = presets.find((item) => item.id === presetId);
    if (p) {
      applyPreset(p);
    }
  };

  const getPayloadJson = () => {
    return {
      event: eventName,
      event_id: `evt_sim_${Date.now()}`,
      created_at: Math.floor(Date.now() / 1000),
      payload: {
        payment: {
          entity: {
            id: paymentId || `PAY_WH_${Math.floor(1000 + Math.random() * 9000)}`,
            amount: amount,
            currency: 'INR',
            status: 'failed',
            method: paymentMethod.toLowerCase(),
            error_code: gatewayErrorCode,
            error_description: gatewayErrorDesc,
            customer_name: customerName,
            customer_email: customerEmail,
          },
        },
      },
      auto_analyze: autoAnalyze,
    };
  };

  const handleDispatchWebhook = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const resp = await api.simulateWebhook({
        event: eventName,
        payment_id: paymentId || undefined,
        customer_name: customerName,
        customer_email: customerEmail,
        amount: Number(amount),
        payment_method: paymentMethod,
        failure_reason: failureReason,
        gateway_error_code: gatewayErrorCode,
        gateway_error_description: gatewayErrorDesc,
        auto_analyze: autoAnalyze,
      });

      setResult(resp);
      if (onSuccess) {
        onSuccess(resp);
      }
    } catch (err: any) {
      setError(err.message || 'Webhook transmission failed');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>Simulate Gateway Webhook Ingestion</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                  Async Event
                </span>
              </h3>
              <p className="text-[11px] text-slate-500">
                Dispatch an incoming <code className="text-blue-700 font-semibold font-mono">payment.failed</code> event from Razorpay / Stripe to test live recovery.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Preset Selector */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center justify-between">
              <span>Select Gateway Scenario Preset</span>
              <span className="text-[11px] text-blue-600 font-normal">Real-world drop templates</span>
            </label>
            <select
              value={selectedPresetId}
              onChange={(e) => handlePresetChange(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white"
            >
              {presets.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} (₹{p.amount.toLocaleString()} - {p.failure_reason})
                </option>
              ))}
            </select>
          </div>

          {/* Tab Navigation (Form vs JSON) */}
          <div className="flex border-b border-slate-200">
            <button
              onClick={() => setActiveTab('form')}
              className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === 'form'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Event Parameters</span>
            </button>
            <button
              onClick={() => setActiveTab('json')}
              className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === 'json'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>Gateway JSON Payload</span>
            </button>
          </div>

          {activeTab === 'form' ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Event Type
                  </label>
                  <input
                    type="text"
                    value={eventName}
                    onChange={(e) => setEventName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Payment ID
                  </label>
                  <input
                    type="text"
                    value={paymentId}
                    onChange={(e) => setPaymentId(e.target.value)}
                    placeholder="e.g. PAY_WH_8891"
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Customer Name
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Customer Email
                  </label>
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Amount (INR)
                  </label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Payment Method
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900"
                  >
                    <option value="UPI">UPI</option>
                    <option value="CARD">Card</option>
                    <option value="NETBANKING">NetBanking</option>
                    <option value="WALLET">Wallet</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Failure Reason
                  </label>
                  <select
                    value={failureReason}
                    onChange={(e) => setFailureReason(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900"
                  >
                    <option value="UPI_FAILURE">UPI_FAILURE</option>
                    <option value="EXPIRED_CARD">EXPIRED_CARD</option>
                    <option value="BANK_DECLINED">BANK_DECLINED</option>
                    <option value="NETWORK_ERROR">NETWORK_ERROR</option>
                    <option value="INSUFFICIENT_FUNDS">INSUFFICIENT_FUNDS</option>
                    <option value="TIMEOUT">TIMEOUT</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Gateway Error Diagnostics
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={gatewayErrorCode}
                    onChange={(e) => setGatewayErrorCode(e.target.value)}
                    placeholder="Error Code"
                    className="sm:col-span-1 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs font-mono text-slate-900"
                  />
                  <input
                    type="text"
                    value={gatewayErrorDesc}
                    onChange={(e) => setGatewayErrorDesc(e.target.value)}
                    placeholder="Gateway Raw Error Description"
                    className="sm:col-span-2 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="autoAnalyzeCheck"
                  checked={autoAnalyze}
                  onChange={(e) => setAutoAnalyze(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="autoAnalyzeCheck" className="text-xs text-slate-700 font-medium">
                  Trigger LangGraph AI Recovery Agent automatically on ingestion
                </label>
              </div>
            </div>
          ) : (
            <div>
              <div className="text-[11px] text-slate-500 mb-2 flex items-center justify-between">
                <span>Standard Razorpay Webhook Contract:</span>
                <span className="font-mono text-slate-400">Content-Type: application/json</span>
              </div>
              <pre className="p-3.5 rounded-xl bg-slate-900 text-slate-100 font-mono text-[11px] overflow-x-auto max-h-56 leading-relaxed border border-slate-800">
                {JSON.stringify(getPayloadJson(), null, 2)}
              </pre>
            </div>
          )}

          {/* Success Notification Banner */}
          {result && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 space-y-2 shadow-xs animate-in zoom-in-95">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Webhook Event Ingested Successfully!</span>
                </div>
                <span className="text-[10px] font-mono font-bold bg-white px-2 py-0.5 rounded border border-emerald-200 text-emerald-800">
                  {result.event_id}
                </span>
              </div>
              <p className="text-xs text-emerald-800 leading-relaxed">
                Payment <strong className="font-mono">{result.payment_id}</strong> (₹{result.amount.toLocaleString()}) has been placed into the active recovery queue.
              </p>
              {result.ai_recommendation && (
                <div className="p-2.5 rounded-lg bg-white/90 border border-emerald-200 flex items-center justify-between text-xs">
                  <span className="text-slate-600">
                    AI Decision:{' '}
                    <strong className="text-slate-900">{result.ai_recommendation.replace(/_/g, ' ')}</strong>
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border ${
                      result.guardrail_status === 'OVERRIDDEN'
                        ? 'bg-amber-50 text-amber-800 border-amber-300'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}
                  >
                    Guardrail: {result.guardrail_status || 'PASSED'}
                  </span>
                </div>
              )}
              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    navigate(`/payments/${result.payment_id}`);
                  }}
                  className="px-4 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <span>Inspect Ingested Transaction</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/80 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
            <span>Simulated Gateway Sandbox Environment</span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleDispatchWebhook}
              disabled={loading}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-blue-500/20 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Transmitting Webhook...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Dispatch Webhook Event</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
