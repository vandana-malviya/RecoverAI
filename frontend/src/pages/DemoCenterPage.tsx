import React, { useEffect, useState } from 'react';
import {
  Bot,
  Play,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import type { DemoScenario } from '../types';
import { StatusBadge } from '../components/StatusBadge';

export const DemoCenterPage: React.FC = () => {
  const navigate = useNavigate();
  const [scenarios, setScenarios] = useState<DemoScenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [triggeringId, setTriggeringId] = useState<string | null>(null);

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
            Test and demonstrate the 5 core real-world recovery workflows with deterministic guardrails.
          </p>
        </div>
      </div>

      {/* Intro Note */}
      <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 flex items-start gap-3.5 text-xs text-slate-700 shadow-2xs">
        <Bot className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div>
          <strong className="text-blue-900">How to demonstrate during an evaluation interview:</strong>
          <p className="text-slate-600 mt-0.5 leading-relaxed">
            Clicking <strong>"Launch Live Demo"</strong> on any scenario below will reset the transaction to its failed state and open the Payment Detail workspace. You can then trigger the LangGraph AI Recovery Agent and execute the simulated recovery in real time.
          </p>
        </div>
      </div>

      {/* 5 Scenario Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {scenarios.map((s) => (
          <div
            key={s.id}
            className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all shadow-xs flex flex-col justify-between space-y-4 group"
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

              {/* Expected Decision Spec */}
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
    </div>
  );
};
