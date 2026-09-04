import React, { useEffect, useState } from 'react';
import {
  Bot,
  ArrowUpRight,
  RefreshCw,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import type { AgentActivity } from '../types';

export const AgentActivityPage: React.FC = () => {
  const [activities, setActivities] = useState<AgentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadActivity = async () => {
    try {
      const data = await api.getAgentActivity(100);
      setActivities(data.activities);
    } catch (err) {
      console.error('Failed to load agent activities', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadActivity();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadActivity();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-slate-500 font-medium">Loading AI Agent Activity Logs...</span>
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
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">AI Agent Audit Activity Log</h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-blue-50 text-blue-700 border border-blue-200">
              Live Stream
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Transparent immutable audit trail of all LangGraph decisions, tool invocations, and financial recovery outcomes.
          </p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-xs text-slate-700 font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          <span>Refresh Feed</span>
        </button>
      </div>

      {/* Activity List */}
      <div className="space-y-3">
        {activities.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-xl border border-slate-200 text-slate-500 text-xs shadow-xs">
            No agent activities recorded yet. Trigger recovery on a failed payment to populate logs.
          </div>
        ) : (
          activities.map((act) => (
            <div
              key={act.activity_id}
              className="p-4 rounded-xl bg-white border border-slate-200 hover:border-blue-300 hover:shadow-xs transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs shadow-2xs"
            >
              <div className="flex items-start gap-3.5">
                <div className="p-2 rounded-lg bg-blue-50 text-blue-600 border border-blue-100 mt-0.5 shadow-2xs">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <Link
                      to={`/payments/${act.payment_id}`}
                      className="font-mono font-bold text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1"
                    >
                      <span>{act.payment_id}</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </Link>
                    <span className="text-slate-300">•</span>
                    <span className="text-slate-900 font-semibold">{act.customer_name}</span>
                    <span className="text-slate-300">•</span>
                    <span className="font-mono text-slate-800 font-bold">
                      ₹{act.amount.toLocaleString('en-IN')}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                      {act.action.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <p className="text-slate-600 leading-relaxed">{act.reason}</p>
                  <p className="text-[11px] text-emerald-700 font-semibold">{act.result}</p>
                </div>
              </div>

              {/* Right metadata */}
              <div className="flex md:flex-col items-center md:items-end justify-between shrink-0 gap-1 border-t md:border-t-0 border-slate-100 pt-2 md:pt-0">
                <div className="flex items-center gap-1.5 text-blue-700 font-bold text-[11px]">
                  <span>Confidence:</span>
                  <span>{Math.round(act.confidence * 100)}%</span>
                </div>
                <span className="text-[10px] text-slate-500 font-mono">
                  {new Date(act.timestamp).toLocaleTimeString('en-IN', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border ${
                    act.status === 'RECOVERED'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-blue-50 text-blue-700 border-blue-200'
                  }`}
                >
                  {act.status}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
