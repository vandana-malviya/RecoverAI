import React, { useEffect, useState } from 'react';
import {
  SlidersHorizontal,
  TrendingUp,
  HelpCircle,
  CheckCircle2,
  RefreshCw,
  Award,
} from 'lucide-react';
import { api } from '../services/api';
import type { SimulationParams, SimulationResult } from '../types';

export const SimulatorPage: React.FC = () => {
  const [params, setParams] = useState<SimulationParams>({
    auto_retry_enabled: true,
    retry_window_minutes: 30,
    max_retries_allowed: 2,
    smart_reminder_enabled: true,
    reminder_channels: ['WHATSAPP', 'EMAIL'],
    suggest_alt_method_enabled: true,
    vip_priority_escalation: true,
  });

  const [result, setResult] = useState<SimulationResult | null>(null);
  const [loading, setLoading] = useState(false);

  const runSimulation = async () => {
    setLoading(true);
    try {
      const res = await api.runSimulation(params);
      setResult(res);
    } catch (err) {
      console.error('Failed to run simulation', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runSimulation();
  }, [params]);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Recovery Strategy Simulator</h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-blue-50 text-blue-700 border border-blue-200">
              Standout Feature
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Model and forecast portfolio revenue recovery lift, gateway risk mitigation, and merchant ROI before deploying policies.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg text-amber-800 text-xs font-semibold shadow-2xs">
          <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
          <span>Simulated Forecast Model</span>
        </div>
      </div>

      {/* Main Grid: Controls on Left (1 Col), Simulation Results on Right (2 Cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Interactive Policy Sliders */}
        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-blue-600" />
              <span>Merchant Recovery Policy</span>
            </h2>
            <button
              onClick={() => runSimulation()}
              className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 font-semibold cursor-pointer"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
              <span>Recalculate</span>
            </button>
          </div>

          {/* Control 1: Automated Smart Retries */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-900">
                Automated Intelligent Retries
              </label>
              <input
                type="checkbox"
                checked={params.auto_retry_enabled}
                onChange={(e) => setParams({ ...params, auto_retry_enabled: e.target.checked })}
                className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
              />
            </div>
            <p className="text-[11px] text-slate-500">
              AI evaluates gateway error codes before scheduling optimal backoff retries.
            </p>
          </div>

          {/* Control 2: Retry Window Slider */}
          {params.auto_retry_enabled && (
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-900">Delayed Backoff Window</span>
                <span className="font-mono font-bold text-blue-600">
                  {params.retry_window_minutes} mins
                </span>
              </div>
              <input
                type="range"
                min="5"
                max="120"
                step="5"
                value={params.retry_window_minutes}
                onChange={(e) =>
                  setParams({ ...params, retry_window_minutes: Number(e.target.value) })
                }
                className="w-full accent-blue-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>5m (Aggressive)</span>
                <span>30m (Recommended)</span>
                <span>120m (Conservative)</span>
              </div>
            </div>
          )}

          {/* Control 3: Max Retries Allowed */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-900">Max Retries Guardrail Limit</span>
              <span className="font-mono font-bold text-blue-600">
                {params.max_retries_allowed} attempts
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="4"
              step="1"
              value={params.max_retries_allowed}
              onChange={(e) =>
                setParams({ ...params, max_retries_allowed: Number(e.target.value) })
              }
              className="w-full accent-blue-600 cursor-pointer"
            />
            <p className="text-[11px] text-slate-500">
              Hard guardrail: Locks automated charges when threshold is reached to prevent gateway penalty.
            </p>
          </div>

          {/* Control 4: Suggest Alternative Method */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-900">
                Dynamic Payment Method Switch
              </label>
              <input
                type="checkbox"
                checked={params.suggest_alt_method_enabled}
                onChange={(e) =>
                  setParams({ ...params, suggest_alt_method_enabled: e.target.checked })
                }
                className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
              />
            </div>
            <p className="text-[11px] text-slate-500">
              Auto-suggests Card/NetBanking during UPI server outages, and UPI during card declines.
            </p>
          </div>

          {/* Control 5: Smart Multi-Channel Reminders */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-900">
                Multi-Channel Smart Reminders
              </label>
              <input
                type="checkbox"
                checked={params.smart_reminder_enabled}
                onChange={(e) =>
                  setParams({ ...params, smart_reminder_enabled: e.target.checked })
                }
                className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
              />
            </div>
            <p className="text-[11px] text-slate-500">
              Dispatches WhatsApp and Email magic links for 1-click checkout completion.
            </p>
          </div>

          {/* Control 6: VIP Priority Escalation */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-900">
                VIP Customer High-Priority Queue
              </label>
              <input
                type="checkbox"
                checked={params.vip_priority_escalation}
                onChange={(e) =>
                  setParams({ ...params, vip_priority_escalation: e.target.checked })
                }
                className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
              />
            </div>
            <p className="text-[11px] text-slate-500">
              Prioritizes high-ticket (&ge; ₹25,000) and High-LTV customer transactions.
            </p>
          </div>
        </div>

        {/* Right 2 Columns: Projected Recovery ROI Forecast */}
        <div className="lg:col-span-2 space-y-6">
          {/* Top Forecast KPI Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-xl bg-gradient-to-br from-blue-50/70 via-white to-emerald-50/40 border border-blue-200 shadow-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700">
                Net Revenue Lift
              </span>
              <div className="text-2xl font-black text-slate-900 mt-1">
                +₹{(result?.net_revenue_lift || 0).toLocaleString('en-IN')}
              </div>
              <div className="text-xs font-semibold text-emerald-700 mt-1 flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                <span>+{result?.lift_percentage || 0}% above static baseline</span>
              </div>
            </div>

            <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Simulated Recovery Rate
              </span>
              <div className="text-2xl font-bold text-emerald-700 mt-1">
                {result?.simulated_recovery_rate_pct || 0}%
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Baseline (Fixed rule): {result?.baseline_recovery_rate_pct || 0}%
              </div>
            </div>

            <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Unnecessary Retries Prevented
              </span>
              <div className="text-2xl font-bold text-blue-700 mt-1">
                {result?.total_unnecessary_retries_prevented || 0}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Shields gateway chargeback SLA score
              </div>
            </div>
          </div>

          {/* Strategy Comparison Breakdown Table */}
          <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-slate-900 flex items-center justify-between">
              <span>Failure Category Recovery Impact</span>
              <span className="text-xs font-mono text-slate-500">
                Total Failed Volume: ₹{(result?.total_failed_amount || 0).toLocaleString('en-IN')}
              </span>
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-[10px] uppercase font-bold text-slate-600">
                    <th className="py-2.5 px-3">Failure Category</th>
                    <th className="py-2.5 px-3">Failed Volume</th>
                    <th className="py-2.5 px-3">Projected Recovered</th>
                    <th className="py-2.5 px-3">Recovery Rate</th>
                    <th className="py-2.5 px-3">Retries Saved</th>
                    <th className="py-2.5 px-3">Customer Friction</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(result?.category_breakdown || []).map((cat, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-3 px-3 font-semibold text-slate-900">{cat.category}</td>
                      <td className="py-3 px-3 font-mono text-slate-600">
                        ₹{cat.total_failed_volume.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-emerald-700">
                        ₹{cat.projected_recovered_revenue.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {cat.recovery_rate_pct}%
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-blue-600 font-semibold">
                        +{cat.unnecessary_retries_saved}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            cat.customer_friction_score <= 3.0
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-amber-50 text-amber-800 border-amber-200'
                          }`}
                        >
                          {cat.customer_friction_score} / 10
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* AI Strategic Policy Recommendations */}
          <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs space-y-3">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-500" />
              <span>AI Strategic Policy Assessment</span>
            </h2>

            <div className="space-y-2">
              {(result?.strategy_recommendations || []).map((rec, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 flex items-start gap-2.5 shadow-2xs"
                >
                  <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <span>{rec}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
