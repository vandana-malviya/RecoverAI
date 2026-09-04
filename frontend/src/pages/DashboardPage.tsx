import React, { useEffect, useState } from 'react';
import {
  IndianRupee,
  AlertOctagon,
  CheckCircle2,
  TrendingUp,
  Bot,
  Clock,
  ArrowUpRight,
  Sparkles,
  Zap,
  RefreshCw,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import type { DashboardMetrics, DashboardCharts } from '../types';
import { MetricCard } from '../components/MetricCard';

export const DashboardPage: React.FC = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [charts, setCharts] = useState<DashboardCharts | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const [m, c] = await Promise.all([
        api.getDashboardMetrics(),
        api.getDashboardCharts(),
      ]);
      setMetrics(m);
      setCharts(c);
    } catch (err) {
      console.error('Failed to load dashboard data', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-slate-500 font-medium">Aggregating Revenue Recovery Analytics...</span>
        </div>
      </div>
    );
  }

  const COLORS = ['#2563EB', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4'];

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner: Overview Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Revenue Recovery Command Center</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time agentic revenue protection and recovery across payment channels.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-xs text-slate-700 font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh Metrics</span>
          </button>

          <Link
            to="/demo"
            className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-500/20 transition-all"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Demo Scenarios</span>
          </Link>
        </div>
      </div>

      {/* KPI Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Gross Revenue"
          value={`₹${(metrics?.total_revenue || 0).toLocaleString('en-IN')}`}
          subtitle="Processed volume (30d)"
          icon={IndianRupee}
          iconColor="text-blue-600"
        />
        <MetricCard
          title="Recovered Revenue"
          value={`₹${(metrics?.recovered_revenue || 0).toLocaleString('en-IN')}`}
          subtitle={`${metrics?.recovered_count || 0} payments reclaimed`}
          trend={{ value: `+${metrics?.recovery_rate_pct || 0}%`, isPositive: true }}
          icon={CheckCircle2}
          iconColor="text-emerald-600"
          highlight={true}
        />
        <MetricCard
          title="Failed Payments Loss"
          value={`₹${(metrics?.failed_payments_volume || 0).toLocaleString('en-IN')}`}
          subtitle={`${metrics?.failed_payments_count || 0} failed attempts`}
          trend={{ value: `${metrics?.active_recovery_queue_count || 0} in active queue`, isPositive: false }}
          icon={AlertOctagon}
          iconColor="text-rose-600"
        />
        <MetricCard
          title="AI Recovery Rate"
          value={`${metrics?.recovery_rate_pct || 0}%`}
          subtitle="Net revenue recovered / loss"
          trend={{ value: 'Target: 60%', isPositive: (metrics?.recovery_rate_pct || 0) >= 60 }}
          icon={TrendingUp}
          iconColor="text-teal-600"
        />
      </div>

      {/* Secondary Metrics Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-white border border-slate-200 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-slate-500">Agent Actions Executed</div>
              <div className="text-lg font-bold text-slate-900">{metrics?.ai_actions_count || 0}</div>
            </div>
          </div>
          <Link to="/activity" className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1">
            <span>Audit Logs</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-teal-50 text-teal-600 border border-teal-100">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-slate-500">Avg Recovery Velocity</div>
              <div className="text-lg font-bold text-slate-900">{metrics?.average_recovery_time_minutes || 28.5} mins</div>
            </div>
          </div>
          <span className="text-xs text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
            SLA Met
          </span>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-50 text-purple-600 border border-purple-100">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-slate-500">Recoverable Opportunity</div>
              <div className="text-lg font-bold text-slate-900">₹{(metrics?.recoverable_revenue || 0).toLocaleString('en-IN')}</div>
            </div>
          </div>
          <Link to="/simulator" className="text-xs text-purple-700 hover:text-purple-800 font-semibold flex items-center gap-1">
            <span>Simulate ROI</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Main Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart 1: Revenue Recovered vs Failed Over Time (2 Cols) */}
        <div className="lg:col-span-2 p-5 rounded-xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Revenue Recovered vs Failed (14 Days)</h2>
              <p className="text-xs text-slate-500">Daily velocity of recovered funds vs initial authorization drops</p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                Recovered
              </span>
              <span className="flex items-center gap-1.5 text-rose-700 font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                Failed
              </span>
            </div>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={charts?.revenue_over_time || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="recoveredGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="failedGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EF4444" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#EF4444" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="date" stroke="#64748B" tick={{ fontSize: 11 }} />
                <YAxis stroke="#64748B" tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#CBD5E1', color: '#0F172A', borderRadius: '8px', fontSize: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: any) => [`₹${Number(value).toLocaleString('en-IN')}`, '']}
                />
                <Area type="monotone" dataKey="recovered" name="Recovered" stroke="#10B981" strokeWidth={2} fillOpacity={1} fill="url(#recoveredGrad)" />
                <Area type="monotone" dataKey="failed" name="Failed" stroke="#EF4444" strokeWidth={2} fillOpacity={1} fill="url(#failedGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 5: Recovered vs Unrecovered Donut (1 Col) */}
        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Loss Mitigation Ratio</h2>
            <p className="text-xs text-slate-500">Total recovered revenue vs unrecovered at risk</p>
          </div>

          <div className="h-52 my-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={charts?.recovered_vs_unrecovered || []}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {(charts?.recovered_vs_unrecovered || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.name.includes('Recovered') ? '#10B981' : '#EF4444'} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#CBD5E1', color: '#0F172A', borderRadius: '8px', fontSize: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(v: any) => `₹${Number(v).toLocaleString('en-IN')}`}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-2 border-t border-slate-100 pt-3">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-slate-600 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                Recovered Revenue
              </span>
              <span className="font-bold text-emerald-700">
                ₹{(charts?.recovered_vs_unrecovered?.[0]?.value || 0).toLocaleString('en-IN')}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-slate-600 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                Unrecovered / At-Risk
              </span>
              <span className="font-bold text-rose-700">
                ₹{(charts?.recovered_vs_unrecovered?.[1]?.value || 0).toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Secondary Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart 2: Failed Payments by Reason */}
        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs">
          <h2 className="text-sm font-bold text-slate-900 mb-1">Failures by Gateway Error Code</h2>
          <p className="text-xs text-slate-500 mb-4">Volume and frequency breakdown</p>

          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts?.failed_by_reason || []} layout="vertical" margin={{ top: 5, right: 20, left: 30, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false} />
                <XAxis type="number" stroke="#64748B" tick={{ fontSize: 10 }} />
                <YAxis dataKey="reason" type="category" stroke="#475569" tick={{ fontSize: 10 }} width={90} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#CBD5E1', color: '#0F172A', borderRadius: '8px', fontSize: '11px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(v: any, name: any) => [name === 'count' ? `${v} failures` : `₹${Number(v).toLocaleString('en-IN')}`, '']}
                />
                <Bar dataKey="count" name="Failed Count" fill="#3B82F6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3: Recovery Rate by Payment Method */}
        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs">
          <h2 className="text-sm font-bold text-slate-900 mb-1">Recovery Success by Payment Channel</h2>
          <p className="text-xs text-slate-500 mb-4">Success percentage across UPI, Cards, NetBanking</p>

          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts?.recovery_by_method || []} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="method" stroke="#64748B" tick={{ fontSize: 11 }} />
                <YAxis stroke="#64748B" tick={{ fontSize: 11 }} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#CBD5E1', color: '#0F172A', borderRadius: '8px', fontSize: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(v: any) => [`${v}% Recovery Rate`, '']}
                />
                <Bar dataKey="recovery_rate_pct" name="Recovery Rate %" fill="#10B981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 4: AI Recovery Actions Distribution */}
        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs">
          <h2 className="text-sm font-bold text-slate-900 mb-1">AI Agent Action Breakdown</h2>
          <p className="text-xs text-slate-500 mb-4">Distribution of selected recovery strategies</p>

          <div className="space-y-3 pt-2">
            {(charts?.action_distribution || []).map((item, idx) => {
              const total = (charts?.action_distribution || []).reduce((acc, curr) => acc + curr.count, 0) || 1;
              const pct = Math.round((item.count / total) * 100);
              return (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-700 font-semibold">{item.action}</span>
                    <span className="text-slate-500 font-mono">
                      {item.count} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200/60">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: COLORS[idx % COLORS.length],
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
