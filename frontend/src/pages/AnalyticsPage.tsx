import React, { useEffect, useState } from 'react';
import {
  RefreshCw,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { api } from '../services/api';
import type { DashboardCharts, DashboardMetrics } from '../types';

export const AnalyticsPage: React.FC = () => {
  const [charts, setCharts] = useState<DashboardCharts | null>(null);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const [c, m] = await Promise.all([
        api.getDashboardCharts(),
        api.getDashboardMetrics(),
      ]);
      setCharts(c);
      setMetrics(m);
    } catch (err) {
      console.error('Failed to load analytics', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-slate-500 font-medium">Computing Dynamic Portfolio Analytics...</span>
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
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Performance & Recovery Analytics</h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-teal-50 text-teal-700 border border-teal-200">
              Live Database Computations
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time cohort conversion, channel recovery efficiency, and financial loss mitigation metrics.
          </p>
        </div>

        <button
          onClick={loadAnalytics}
          className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-xs text-slate-700 font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Analytics</span>
        </button>
      </div>

      {/* Top 3 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs">
          <span className="text-[11px] uppercase font-bold text-slate-500 tracking-wider">
            Overall Revenue Recovery Rate
          </span>
          <div className="text-2xl font-black text-emerald-700 mt-1">
            {metrics?.recovery_rate_pct || 0}%
          </div>
          <p className="text-xs text-slate-500 mt-1">
            ₹{(metrics?.recovered_revenue || 0).toLocaleString('en-IN')} reclaimed from ₹
            {(metrics?.failed_payments_volume || 0).toLocaleString('en-IN')} drops
          </p>
        </div>

        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs">
          <span className="text-[11px] uppercase font-bold text-slate-500 tracking-wider">
            Transaction Count Recovery Rate
          </span>
          <div className="text-2xl font-black text-blue-700 mt-1">
            {metrics?.recovery_count_rate_pct || 0}%
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {metrics?.recovered_count || 0} of {metrics?.failed_payments_count || 0} failed payments converted
          </p>
        </div>

        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs">
          <span className="text-[11px] uppercase font-bold text-slate-500 tracking-wider">
            Unrecovered Loss Pipeline
          </span>
          <div className="text-2xl font-black text-rose-700 mt-1">
            ₹
            {Math.max(
              0,
              (metrics?.failed_payments_volume || 0) - (metrics?.recovered_revenue || 0)
            ).toLocaleString('en-IN')}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {metrics?.active_recovery_queue_count || 0} payments awaiting recovery execution
          </p>
        </div>
      </div>

      {/* Analytics Breakdown Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Method Performance Table & Chart */}
        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900">Payment Method Recovery Efficiency</h2>
          <p className="text-xs text-slate-500">Comparing failed volume vs recovered revenue per method</p>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts?.recovery_by_method || []} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="method" stroke="#64748B" tick={{ fontSize: 11 }} />
                <YAxis stroke="#64748B" tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#CBD5E1', color: '#0F172A', borderRadius: '8px', fontSize: '11px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(v: any) => [`₹${Number(v).toLocaleString('en-IN')}`, '']}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="failed_volume" name="Failed Volume" fill="#EF4444" radius={[4, 4, 0, 0]} />
                <Bar dataKey="recovered_volume" name="Recovered Volume" fill="#10B981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Failure Reasons Breakdown Table */}
        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900">Gateway Failure Diagnostics Distribution</h2>
          <p className="text-xs text-slate-500">Frequency and financial impact of each failure mode</p>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-[10px] uppercase font-bold text-slate-600">
                  <th className="py-2.5 px-3">Failure Reason</th>
                  <th className="py-2.5 px-3">Count</th>
                  <th className="py-2.5 px-3">Failed Volume</th>
                  <th className="py-2.5 px-3">Share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(charts?.failed_by_reason || []).map((r, idx) => {
                  const totalVol = (charts?.failed_by_reason || []).reduce((acc, curr) => acc + curr.volume, 0) || 1;
                  const pct = Math.round((r.volume / totalVol) * 100);
                  return (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-semibold text-slate-900">{r.reason}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-600">{r.count}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-rose-700">
                        ₹{r.volume.toLocaleString('en-IN')}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/60">
                            <div className="h-full bg-blue-600 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-[10px] font-mono text-slate-500">{pct}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
