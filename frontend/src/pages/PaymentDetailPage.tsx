import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Bot,
  CheckCircle2,
  AlertOctagon,
  Clock,
  User,
  History,
  AlertTriangle,
} from 'lucide-react';
import { api } from '../services/api';
import type { PaymentItem, Customer, RecoveryAttempt, AIDecisionOutput } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { AIExplanationCard } from '../components/AIExplanationCard';
import { PaymentTimeline } from '../components/PaymentTimeline';

export const PaymentDetailPage: React.FC = () => {
  const { paymentId } = useParams<{ paymentId: string }>();
  const [payment, setPayment] = useState<PaymentItem | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [attempts, setAttempts] = useState<RecoveryAttempt[]>([]);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [aiDecision, setAiDecision] = useState<AIDecisionOutput | null>(null);

  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadData = async () => {
    if (!paymentId) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const [detailRes, timelineRes] = await Promise.all([
        api.getPaymentDetail(paymentId),
        api.getPaymentTimeline(paymentId),
      ]);
      setPayment(detailRes.payment);
      setCustomer(detailRes.customer);
      setAttempts(detailRes.recovery_attempts);
      setTimeline(timelineRes.timeline);

      // If already analyzed before, load from metadata
      if (detailRes.payment.metadata?.ai_recommendation) {
        setAiDecision(detailRes.payment.metadata.ai_recommendation);
      }
    } catch (err: any) {
      console.error('Failed to load payment detail', err);
      setErrorMsg(err.message || 'Payment not found');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [paymentId]);

  const handleAnalyzeWithAI = async () => {
    if (!paymentId) return;
    setAnalyzing(true);
    setErrorMsg(null);
    try {
      const decision = await api.analyzePaymentWithAI(paymentId);
      setAiDecision(decision);
      // Reload timeline and payment
      await loadData();
    } catch (err: any) {
      setErrorMsg(err.message || 'AI agent analysis failed');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleExecuteRecovery = async () => {
    if (!paymentId || !aiDecision) return;
    setExecuting(true);
    setErrorMsg(null);
    try {
      const res = await api.executeRecoveryAction({
        payment_id: paymentId,
        action: aiDecision.recommended_action,
        alternative_method: aiDecision.suggested_payment_method,
      });
      setExecutionResult(res);
      // Refresh data to reflect state
      await loadData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Recovery execution simulation failed');
    } finally {
      setExecuting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-slate-500 font-medium">Loading Transaction Intelligence...</span>
        </div>
      </div>
    );
  }

  if (errorMsg && !payment) {
    return (
      <div className="p-8 text-center bg-white rounded-xl border border-slate-200 shadow-xs">
        <AlertOctagon className="w-10 h-10 text-rose-500 mx-auto mb-3" />
        <h2 className="text-base font-bold text-slate-900 mb-1">Transaction Lookup Failed</h2>
        <p className="text-xs text-slate-500 mb-4">{errorMsg}</p>
        <Link
          to="/payments"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white transition-colors shadow-sm shadow-blue-500/20"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Payments Queue</span>
        </Link>
      </div>
    );
  }

  if (!payment) return null;

  return (
    <div className="space-y-6 pb-12">
      {/* Navigation Breadcrumb */}
      <div className="flex items-center justify-between gap-4">
        <Link
          to="/payments"
          className="inline-flex items-center gap-2 text-xs text-slate-500 hover:text-slate-900 font-semibold transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Failed Payments Queue</span>
        </Link>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Transaction ID:</span>
          <span className="font-mono text-xs font-bold text-blue-600">{payment.payment_id}</span>
        </div>
      </div>

      {/* Main Title & Action Bar */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 flex flex-wrap items-center justify-between gap-6 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              ₹{payment.amount.toLocaleString('en-IN')}
            </h1>
            <StatusBadge type="status" value={payment.status} />
            <StatusBadge type="method" value={payment.payment_method} />
            {payment.failure_reason && <StatusBadge type="reason" value={payment.failure_reason} />}
          </div>
          <p className="text-xs text-slate-500">
            Payment initiated on {new Date(payment.created_at).toLocaleString('en-IN')} • Retry count:{' '}
            <strong className="text-slate-800">{payment.retry_count}/3</strong>
          </p>
        </div>

        {/* Action Button: Analyze with AI */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleAnalyzeWithAI}
            disabled={analyzing}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white text-xs font-bold transition-all shadow-md shadow-blue-500/20 flex items-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {analyzing ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Running LangGraph Recovery Agent...</span>
              </>
            ) : (
              <>
                <Bot className="w-4 h-4" />
                <span>{aiDecision ? 'Re-Analyze with AI' : 'Analyze with AI Recovery Agent'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error Alert if any */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-3 shadow-2xs">
          <AlertTriangle className="w-5 h-5 shrink-0 text-rose-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Execution Feedback Notification */}
      {executionResult && (
        <div
          className={`p-4 rounded-xl border text-xs flex items-start gap-3 shadow-xs ${
            executionResult.payment_recovered
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-blue-50 border-blue-200 text-blue-800'
          }`}
        >
          <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-emerald-600" />
          <div className="space-y-1">
            <div className="font-bold text-sm">
              {executionResult.payment_recovered ? '🎉 Revenue Recovered Successfully!' : 'Action Executed Successfully'}
            </div>
            <p>{executionResult.message}</p>
            <div className="text-[11px] font-mono text-slate-500">
              Recovery Reference: {executionResult.recovery_id} • Status: {executionResult.new_payment_status}
            </div>
          </div>
        </div>
      )}

      {/* AI Decision Explanation Card */}
      {aiDecision && (
        <AIExplanationCard
          decision={aiDecision}
          onExecuteRecovery={handleExecuteRecovery}
          isExecuting={executing}
          hasExecuted={payment.status === 'RECOVERED' || !!executionResult}
        />
      )}

      {/* Two Column Diagnostic Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Gateway Diagnostics & Customer Intelligence */}
        <div className="lg:col-span-2 space-y-6">
          {/* Failure Technical Diagnostics */}
          <div className="p-5 rounded-xl bg-white border border-slate-200 space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <AlertOctagon className="w-4 h-4 text-rose-600" />
                <span>Financial Gateway Diagnostics</span>
              </h2>
              <span className="font-mono text-xs text-slate-500">
                Code: <strong className="text-rose-600">{payment.gateway_error_code || 'N/A'}</strong>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-[11px] text-slate-500 uppercase font-semibold">Failure Mode</span>
                <div className="text-slate-900 font-bold mt-1">
                  {payment.failure_reason?.replace(/_/g, ' ') || 'None Recorded'}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-[11px] text-slate-500 uppercase font-semibold">Retry Threshold</span>
                <div className="text-slate-900 font-bold mt-1">
                  {payment.retry_count} of 3 maximum allowable retries
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-xs">
              <span className="text-[11px] text-slate-500 font-semibold uppercase">Error Description</span>
              <p className="text-slate-700 mt-1 leading-relaxed">
                {payment.gateway_error_description || 'No detailed error message provided by upstream switch.'}
              </p>
            </div>
          </div>

          {/* Customer Behavioral Profile & LTV */}
          {customer && (
            <div className="p-5 rounded-xl bg-white border border-slate-200 space-y-4 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-blue-600" />
                  <h2 className="text-sm font-bold text-slate-900">Customer Profile & Value Intelligence</h2>
                </div>
                <StatusBadge type="segment" value={customer.customer_segment} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-[11px] text-slate-500 font-medium">Customer Name</span>
                  <div className="text-slate-900 font-bold mt-1">{customer.name}</div>
                  <div className="text-[11px] text-slate-500 font-mono">{customer.email}</div>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-[11px] text-slate-500 font-medium">Lifetime Value (LTV)</span>
                  <div className="text-emerald-700 font-extrabold text-sm mt-1">
                    ₹{customer.lifetime_value.toLocaleString('en-IN')}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {customer.total_transactions} historical orders
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-[11px] text-slate-500 font-medium">Payment Success Rate</span>
                  <div className="text-blue-700 font-extrabold text-sm mt-1">
                    {customer.success_rate}%
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {customer.successful_transactions} success / {customer.failed_transactions} failures
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Past Recovery Attempts */}
          <div className="p-5 rounded-xl bg-white border border-slate-200 space-y-4 shadow-xs">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-200 pb-3">
              <History className="w-4 h-4 text-blue-600" />
              <span>Historical Recovery Log</span>
            </h2>

            {attempts.length === 0 ? (
              <div className="text-xs text-slate-500 py-4 text-center">
                No recovery attempts executed for this payment yet. Click "Analyze with AI" above.
              </div>
            ) : (
              <div className="space-y-2">
                {attempts.map((att) => (
                  <div
                    key={att.recovery_id}
                    className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between gap-4 text-xs"
                  >
                    <div>
                      <div className="font-bold text-slate-900">
                        {att.action.replace(/_/g, ' ')}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{att.result}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[10px] font-mono text-slate-500">
                        {new Date(att.timestamp).toLocaleTimeString()}
                      </span>
                      <div className="text-[10px] font-bold text-emerald-700">
                        {att.status}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Lifecycle Timeline */}
        <div className="p-5 rounded-xl bg-white border border-slate-200 space-y-4 shadow-xs">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-200 pb-3">
            <Clock className="w-4 h-4 text-blue-600" />
            <span>Transaction Lifecycle Timeline</span>
          </h2>

          <PaymentTimeline events={timeline} />
        </div>
      </div>
    </div>
  );
};
