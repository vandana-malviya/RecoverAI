import React, { useEffect, useState } from 'react';
import {
  Bot,
  Play,
  RotateCcw,
  Sparkles,
  Zap,
  CheckCircle2,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
import type { DemoScenario, DemoBatchResultItem } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { WebhookSimulationModal } from '../components/WebhookSimulationModal';

export const DemoCenterPage: React.FC = () => {
  const navigate = useNavigate();
  const [scenarios, setScenarios] = useState<DemoScenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [triggeringId, setTriggeringId] = useState<string | null>(null);

  // Reset & Batch states
  const [isResettingAll, setIsResettingAll] = useState(false);
  const [isBatchRunning, setIsBatchRunning] = useState(false);
  const [batchResults, setBatchResults] = useState<DemoBatchResultItem[] | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Webhook Modal state
  const [isWebhookModalOpen, setIsWebhookModalOpen] = useState(false);

  const loadScenarios = async () => {
    try {
      const data = await api.getDemoScenarios();
      setScenarios(data.scenarios);
    } catch (err) {
      console.error('Failed to load demo scenarios', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadScenarios();
  }, []);

  const handleLaunchScenario = async (scenario: DemoScenario) => {
    setTriggeringId(scenario.id);
    try {
      await api.triggerDemoScenario(scenario.id);
      // Navigate straight to payment detail page to demonstrate
      navigate(`/payments/${scenario.payment_id}`);
    } catch (err) {
      console.error('Failed to trigger demo scenario', err);
    } finally {
      setTriggeringId(null);
    }
  };

  const handleResetAll = async () => {
    setIsResettingAll(true);
    setActionMessage(null);
    try {
      const res = await api.resetAllDemoScenarios();
      setActionMessage(res.message || 'All 5 scenarios reset to clean failed state.');
      setBatchResults(null);
      await loadScenarios();
    } catch (err: any) {
      setActionMessage(err.message || 'Failed to reset scenarios.');
    } finally {
      setIsResettingAll(false);
    }
  };

  const handleBatchEvaluate = async () => {
    setIsBatchRunning(true);
    setActionMessage(null);
    try {
      const res = await api.runBatchDemoScenarios();
      setBatchResults(res.results);
      setActionMessage('Batch evaluation completed across all 5 demo scenarios.');
    } catch (err: any) {
      setActionMessage(err.message || 'Failed to run batch evaluation.');
    } finally {
      setIsBatchRunning(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-slate-500 font-medium">Loading Presentation Demo Scenarios...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Interactive Demo Scenarios Center</h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
              Evaluator Ready
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Demonstrate the 5 core real-world recovery workflows with deterministic guardrails and live webhook ingestion.
          </p>
        </div>

        {/* Action Controls Toolbar */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={handleResetAll}
            disabled={isResettingAll || isBatchRunning}
            className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-all disabled:opacity-50 cursor-pointer"
          >
            <RotateCcw className={`w-3.5 h-3.5 text-slate-500 ${isResettingAll ? 'animate-spin' : ''}`} />
            <span>Reset 5 Scenarios</span>
          </button>

          <button
            type="button"
            onClick={handleBatchEvaluate}
            disabled={isResettingAll || isBatchRunning}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-500/20 transition-all disabled:opacity-50 cursor-pointer"
          >
            {isBatchRunning ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Evaluating 5 Scenarios...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Batch Evaluate All (Viva Mode)</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => setIsWebhookModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5 text-emerald-600" />
            <span>Simulate Gateway Webhook</span>
          </button>
        </div>
      </div>

      {/* Action Notification Message */}
      {actionMessage && (
        <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
            <span>{actionMessage}</span>
          </div>
          <button
            onClick={() => setActionMessage(null)}
            className="text-blue-500 hover:text-blue-800 font-bold"
          >
            &times;
          </button>
        </div>
      )}

      {/* Batch Evaluation Summary Matrix (When Batch Evaluated) */}
      {batchResults && (
        <div className="p-5 rounded-2xl bg-white border border-blue-200 shadow-md space-y-4 animate-in fade-in-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Batch Evaluation Matrix (All 5 Scenarios Analyzed)
                </h3>
                <p className="text-[11px] text-slate-500">
                  Real-time decision matrix showcasing deterministic guardrail overrides vs direct AI passes.
                </p>
              </div>
            </div>
            <button
              onClick={() => setBatchResults(null)}
              className="text-xs text-slate-400 hover:text-slate-700"
            >
              Dismiss Table
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-[10px] font-bold uppercase text-slate-500">
                  <th className="py-2.5 px-3">Scenario</th>
                  <th className="py-2.5 px-3">Payment</th>
                  <th className="py-2.5 px-3">Amount</th>
                  <th className="py-2.5 px-3">Original Intent</th>
                  <th className="py-2.5 px-3">Guardrail Status</th>
                  <th className="py-2.5 px-3">Enforced Recovery Action</th>
                  <th className="py-2.5 px-3">Confidence</th>
                  <th className="py-2.5 px-3 text-right">View</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {batchResults.map((r) => (
                  <tr key={r.scenario_id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-3 font-semibold text-slate-900">{r.title}</td>
                    <td className="py-3 px-3 font-mono text-blue-600 font-bold">{r.payment_id}</td>
                    <td className="py-3 px-3 font-mono font-bold text-slate-900">₹{r.amount.toLocaleString()}</td>
                    <td className="py-3 px-3 font-mono text-[11px] text-slate-500">
                      {r.guardrail_applied ? (
                        <span className="line-through text-slate-400">
                          {r.original_recommended_action.replace(/_/g, ' ')}
                        </span>
                      ) : (
                        <span className="text-slate-700">{r.recommended_action.replace(/_/g, ' ')}</span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                          r.guardrail_status === 'OVERRIDDEN'
                            ? 'bg-amber-50 text-amber-800 border-amber-300'
                            : r.guardrail_status === 'ENFORCED'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}
                      >
                        {r.guardrail_status}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <strong className="text-slate-900 font-mono text-[11px]">
                        {r.recommended_action.replace(/_/g, ' ')}
                      </strong>
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-blue-700">
                      {Math.round(r.confidence * 100)}%
                    </td>
                    <td className="py-3 px-3 text-right">
                      <Link
                        to={`/payments/${r.payment_id}`}
                        className="text-blue-600 hover:text-blue-800 font-bold hover:underline"
                      >
                        Inspect &rarr;
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Intro Note */}
      <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 flex items-start gap-3.5 text-xs text-slate-700 shadow-2xs">
        <Bot className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div>
          <strong className="text-blue-900">How to demonstrate during an evaluation interview:</strong>
          <p className="text-slate-600 mt-0.5 leading-relaxed">
            Click <strong>"Launch Live Demo Workflow"</strong> on any scenario below to reset the transaction and load the diagnostic workspace. The LangGraph agent will evaluate the payment, apply deterministic guardrails, and execute simulated recovery in real time.
          </p>
        </div>
      </div>

      {/* 5 Scenario Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {scenarios.map((s) => (
          <div
            key={s.id}
            className={`p-5 rounded-2xl bg-white border transition-all shadow-xs flex flex-col justify-between space-y-4 group ${
              s.expected_guardrail === 'OVERRIDDEN'
                ? 'border-amber-200 hover:border-amber-400'
                : 'border-slate-200 hover:border-blue-300'
            }`}
          >
            <div className="space-y-3">
              {/* Card Header */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-blue-600">{s.payment_id}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                      {s.badge}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 mt-1 group-hover:text-blue-700 transition-colors">
                    {s.title}
                  </h3>
                </div>

                <div className="text-right">
                  <div className="text-base font-black text-slate-900">
                    ₹{s.amount.toLocaleString('en-IN')}
                  </div>
                  <StatusBadge type="method" value={s.payment_method} />
                </div>
              </div>

              {/* Story Description */}
              <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200">
                {s.story}
              </p>

              {/* 🛡️ Visual Guardrail Override Comparison Badge on Card */}
              {s.expected_guardrail === 'OVERRIDDEN' ? (
                <div className="p-2.5 rounded-lg bg-amber-50/90 border border-amber-300 space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-bold text-amber-900">
                    <div className="flex items-center gap-1.5">
                      <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                      <span>Deterministic Guardrail Override</span>
                    </div>
                    <span className="px-1.5 py-0.2 rounded bg-amber-200/80 text-amber-900 text-[9px] uppercase">
                      OVERRIDDEN
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] pt-0.5">
                    <span className="line-through text-slate-400 font-mono text-[10px]">
                      {s.id === 'scenario-2' ? 'RETRY_AFTER_DELAY' : 'RETRY_NOW'}
                    </span>
                    <ArrowRight className="w-3 h-3 text-amber-600" />
                    <strong className="text-slate-900 font-mono text-[11px]">
                      {s.expected_agent_action.replace(/_/g, ' ')}
                    </strong>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="text-slate-500 block">Expected AI Action:</span>
                    <strong className="text-blue-700 font-mono text-[10px]">
                      {s.expected_agent_action.replace(/_/g, ' ')}
                    </strong>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="text-slate-500 block">Guardrail Verdict:</span>
                    <strong className="text-emerald-700 font-mono text-[10px]">
                      {s.expected_guardrail}
                    </strong>
                  </div>
                </div>
              )}
            </div>

            {/* Launch Button */}
            <div className="pt-3 border-t border-slate-100">
              <button
                onClick={() => handleLaunchScenario(s)}
                disabled={triggeringId === s.id}
                className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white text-xs font-bold transition-all shadow-sm shadow-blue-500/20 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {triggeringId === s.id ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Loading Scenario Workspace...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Launch Live Demo Workflow</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Webhook Simulation Modal */}
      <WebhookSimulationModal
        isOpen={isWebhookModalOpen}
        onClose={() => setIsWebhookModalOpen(false)}
        onSuccess={() => {
          loadScenarios();
        }}
      />
    </div>
  );
};
