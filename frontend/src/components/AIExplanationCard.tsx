import React from 'react';
import {
  Bot,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  Clock,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  Zap,
  ShieldAlert,
} from 'lucide-react';
import type { AIDecisionOutput } from '../types';
import { StatusBadge } from './StatusBadge';

interface AIExplanationCardProps {
  decision: AIDecisionOutput;
  onExecuteRecovery?: () => void;
  isExecuting?: boolean;
  hasExecuted?: boolean;
}

export const AIExplanationCard: React.FC<AIExplanationCardProps> = ({
  decision,
  onExecuteRecovery,
  isExecuting = false,
  hasExecuted = false,
}) => {
  const confidencePct = Math.round(decision.confidence * 100);
  const isOverridden = decision.guardrail_status === 'OVERRIDDEN' || decision.guardrail_applied;

  const actionLabels: Record<string, { label: string; desc: string; icon: any }> = {
    RETRY_NOW: {
      label: 'Execute Immediate Retry',
      desc: 'Re-authorize transaction immediately via secondary low-latency routing gateway.',
      icon: Zap,
    },
    RETRY_AFTER_DELAY: {
      label: `Retry After Delayed Backoff (${decision.suggested_delay_minutes || 30} mins)`,
      desc: 'Schedule transaction retry after optimal bank cooling window.',
      icon: Clock,
    },
    SEND_PAYMENT_REMINDER: {
      label: 'Dispatch Multi-Channel Payment Reminder',
      desc: 'Send personalized 1-click checkout recovery link via WhatsApp & Email.',
      icon: Lightbulb,
    },
    SUGGEST_ALTERNATIVE_PAYMENT: {
      label: `Suggest Alternative Method (${decision.suggested_payment_method || 'Cards/NetBanking'})`,
      desc: 'Prompt customer to complete checkout via alternate available payment channels.',
      icon: ArrowRight,
    },
    REQUEST_PAYMENT_METHOD_UPDATE: {
      label: 'Request Payment Credential Update',
      desc: 'Dispatch secure customer portal link to update expired or invalid card details.',
      icon: AlertCircle,
    },
    ESCALATE_TO_MERCHANT: {
      label: 'Escalate to Merchant Operations',
      desc: 'Halt automated retries and assign ticket to customer success team to prevent chargeback.',
      icon: AlertTriangle,
    },
    NO_ACTION: {
      label: 'No Action Taken',
      desc: 'Transaction marked unrecoverable due to high fraud risk or customer cancellation.',
      icon: AlertCircle,
    },
  };

  const actionInfo = actionLabels[decision.recommended_action] || {
    label: decision.recommended_action.replace(/_/g, ' '),
    desc: 'Perform recommended recovery action.',
    icon: Bot,
  };

  const ActionIcon = actionInfo.icon;

  return (
    <div className="p-6 rounded-2xl bg-gradient-to-br from-blue-50/70 via-white to-slate-50 border border-blue-200 shadow-md shadow-blue-500/5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-600 shadow-xs">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900">AI Recovery Agent Decision</h3>
              <StatusBadge type="priority" value={decision.priority} />
            </div>
            <p className="text-xs text-slate-500">
              Orchestrated via LangGraph • Failure diagnosed as{' '}
              <span className="font-mono text-blue-700 font-semibold">{decision.failure_category}</span>
            </p>
          </div>
        </div>

        {/* Confidence Gauge */}
        <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-right">
            <div className="text-[11px] text-slate-500 font-medium">Confidence Score</div>
            <div className="text-lg font-extrabold text-blue-700">{confidencePct}%</div>
          </div>
          <div className="w-12 h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                confidencePct >= 85 ? 'bg-emerald-500' : 'bg-blue-600'
              }`}
              style={{ width: `${confidencePct}%` }}
            />
          </div>
        </div>
      </div>

      {/* 🛡️ Dedicated Visual Guardrail Override Comparison Badge */}
      {isOverridden && (
        <div className="mt-5 p-4 rounded-xl bg-amber-50/90 border border-amber-300 shadow-xs">
          <div className="flex items-center justify-between flex-wrap gap-2 pb-2.5 border-b border-amber-200/80">
            <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
              <ShieldAlert className="w-4 h-4 text-amber-600" />
              <span>DETERMINISTIC SAFETY GUARDRAIL INTERVENTION</span>
            </div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">
              POLICY OVERRIDE ACTIVE
            </span>
          </div>

          <div className="mt-3 grid grid-cols-1 sm:grid-cols-11 items-center gap-3">
            {/* Original Intent */}
            <div className="sm:col-span-5 p-3 rounded-lg bg-white/90 border border-amber-200">
              <div className="text-[10px] uppercase font-bold text-slate-500 mb-1">
                Original Agent Intent
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold line-through text-slate-400">
                  {decision.original_recommended_action
                    ? decision.original_recommended_action.replace(/_/g, ' ')
                    : 'AUTOMATED RETRY'}
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
                  BLOCKED
                </span>
              </div>
            </div>

            {/* Transition Arrow */}
            <div className="sm:col-span-1 flex justify-center text-amber-700 font-bold">
              <ArrowRight className="w-4 h-4" />
            </div>

            {/* Enforced Override Action */}
            <div className="sm:col-span-5 p-3 rounded-lg bg-emerald-50/90 border border-emerald-300">
              <div className="text-[10px] uppercase font-bold text-emerald-800 mb-1">
                Deterministic Safety Override Enforced
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900">
                  {decision.recommended_action.replace(/_/g, ' ')}
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                  ENFORCED
                </span>
              </div>
            </div>
          </div>

          {decision.guardrail_notes && (
            <div className="mt-2.5 text-[11px] text-amber-900 leading-relaxed font-medium bg-amber-100/50 p-2 rounded-lg border border-amber-200">
              <strong>Guardrail Reason:</strong> {decision.guardrail_notes}
            </div>
          )}
        </div>
      )}

      {/* Recommended Action Highlight Card */}
      <div className="mt-5 p-4 rounded-xl bg-blue-50/90 border border-blue-200 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 rounded-lg bg-blue-600 text-white shadow-sm mt-0.5">
            <ActionIcon className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] uppercase font-bold tracking-wider text-blue-700">
              {isOverridden ? 'Final Enforced Recovery Action' : 'Recommended Recovery Action'}
            </span>
            <div className="text-base font-bold text-slate-900 mt-0.5">{actionInfo.label}</div>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">{actionInfo.desc}</p>
          </div>
        </div>

        {/* Execution Trigger */}
        {onExecuteRecovery && (
          <div className="shrink-0 flex items-center">
            {hasExecuted ? (
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold shadow-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Action Simulated & Executed</span>
              </div>
            ) : (
              <button
                onClick={onExecuteRecovery}
                disabled={isExecuting}
                className="w-full md:w-auto px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white text-xs font-bold transition-all shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {isExecuting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Executing Recovery...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Execute Recovery Action</span>
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Decision Explanation (Why this decision was made) */}
      <div className="mt-5">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
          <Lightbulb className="w-4 h-4 text-amber-500" />
          <span>Decision Explanation & Reasoning</span>
        </h4>
        <div className="p-3.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-700 leading-relaxed shadow-xs">
          {decision.reason}
        </div>
      </div>

      {/* Signals Considered & Guardrails Verification */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        {/* Factors Considered */}
        <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
            Contextual Factors Analyzed
          </div>
          <ul className="space-y-1.5">
            {decision.factors_considered.map((factor, idx) => (
              <li key={idx} className="flex items-center gap-2 text-xs text-slate-700">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>{factor}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Guardrails Verification Checklist */}
        <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center justify-between">
            <span>Deterministic Guardrails Check</span>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border ${
                decision.guardrail_status === 'PASSED'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : decision.guardrail_status === 'OVERRIDDEN'
                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                  : 'bg-blue-50 text-blue-700 border-blue-200'
              }`}
            >
              {decision.guardrail_status}
            </span>
          </div>

          <div className="space-y-1.5 text-xs text-slate-700">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span>Retry Boundary Check (Limit: &le; 3)</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span>Credential Expiry & Checksum Lock</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span>VIP Customer Protection Routing</span>
            </div>
          </div>

          {decision.guardrail_notes && (
            <p className="mt-2 text-[11px] text-slate-500 italic border-t border-slate-100 pt-1.5">
              {decision.guardrail_notes}
            </p>
          )}
        </div>
      </div>

      {/* Alternative Recovery Option */}
      {decision.alternative_action && (
        <div className="mt-4 p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <span className="text-slate-500">Alternative Secondary Action:</span>
            <strong className="text-slate-900 font-semibold">
              {decision.alternative_action.replace(/_/g, ' ')}
            </strong>
          </div>
          {decision.suggested_payment_method && (
            <span className="text-[11px] text-blue-700 font-semibold">
              Method: <strong>{decision.suggested_payment_method}</strong>
            </span>
          )}
        </div>
      )}
    </div>
  );
};
