import React, { useEffect, useState } from 'react';
import {
  Search,
  ArrowRight,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Bot,
  Zap,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import type { PaymentItem } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { WebhookSimulationModal } from '../components/WebhookSimulationModal';

export const FailedPaymentsPage: React.FC = () => {
  const navigate = useNavigate();
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const limit = 20;

  // Webhook Modal state
  const [isWebhookModalOpen, setIsWebhookModalOpen] = useState(false);

  // Filters state
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [reasonFilter, setReasonFilter] = useState('');
  const [methodFilter, setMethodFilter] = useState('');

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const data = await api.getPayments({
        status: statusFilter || undefined,
        failure_reason: reasonFilter || undefined,
        payment_method: methodFilter || undefined,
        search: search || undefined,
        skip: page * limit,
        limit,
      });
      setPayments(data.items);
      setTotal(data.total);
    } catch (err) {
      console.error('Failed to fetch payments', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [page, statusFilter, reasonFilter, methodFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(0);
    fetchPayments();
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Failed Payments Queue</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitor, filter, and inspect failed customer transactions ready for AI agent recovery.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsWebhookModalOpen(true)}
            className="px-3.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5 text-emerald-600" />
            <span>Simulate Gateway Webhook</span>
          </button>

          <Link
            to="/demo"
            className="px-3.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>Load Demo Cases</span>
          </Link>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-wrap items-center gap-3">
          {/* Search Bar */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by Payment ID (e.g. PAY_101), Customer Name, or Email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Payment Method Filter */}
          <select
            value={methodFilter}
            onChange={(e) => {
              setMethodFilter(e.target.value);
              setPage(0);
            }}
            className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 focus:outline-none focus:bg-white focus:border-blue-500"
          >
            <option value="">All Payment Methods</option>
            <option value="UPI">UPI</option>
            <option value="CARD">Card</option>
            <option value="NETBANKING">NetBanking</option>
            <option value="WALLET">Wallet</option>
          </select>

          {/* Failure Reason Filter */}
          <select
            value={reasonFilter}
            onChange={(e) => {
              setReasonFilter(e.target.value);
              setPage(0);
            }}
            className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 focus:outline-none focus:bg-white focus:border-blue-500"
          >
            <option value="">All Failure Reasons</option>
            <option value="NETWORK_ERROR">Network Error / Timeout</option>
            <option value="BANK_DECLINED">Bank Issuer Declined</option>
            <option value="INSUFFICIENT_FUNDS">Insufficient Funds</option>
            <option value="EXPIRED_CARD">Expired Card</option>
            <option value="INVALID_CARD">Invalid Card Details</option>
            <option value="UPI_FAILURE">UPI PSP Timeout</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(0);
            }}
            className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 focus:outline-none focus:bg-white focus:border-blue-500"
          >
            <option value="">All Statuses</option>
            <option value="FAILED">Failed</option>
            <option value="RECOVERED">Recovered</option>
            <option value="SUCCESS">Success</option>
          </select>

          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white text-xs font-bold transition-all shadow-sm shadow-blue-500/20 cursor-pointer"
          >
            Filter
          </button>
        </form>
      </div>

      {/* Payments Data Table */}
      <div className="rounded-xl bg-white border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                <th className="py-3 px-4">Payment ID</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Method</th>
                <th className="py-3 px-4">Failure Reason</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">AI Recommendation</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                      <span>Fetching payments queue...</span>
                    </div>
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    <AlertCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <p className="font-semibold text-slate-700">No payments matched your search or filters.</p>
                    <p className="text-xs text-slate-500 mt-1">Try clearing filters or search term.</p>
                  </td>
                </tr>
              ) : (
                payments.map((p) => (
                  <tr
                    key={p.payment_id}
                    onClick={() => navigate(`/payments/${p.payment_id}`)}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                  >
                    {/* Payment ID */}
                    <td className="py-3.5 px-4 font-mono font-bold text-blue-600 group-hover:text-blue-700">
                      {p.payment_id}
                    </td>

                    {/* Customer */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900">{p.customer_name}</div>
                      <div className="text-[11px] text-slate-500">{p.customer_email}</div>
                    </td>

                    {/* Amount */}
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      ₹{p.amount.toLocaleString('en-IN')}
                    </td>

                    {/* Payment Method */}
                    <td className="py-3.5 px-4">
                      <StatusBadge type="method" value={p.payment_method} />
                    </td>

                    {/* Failure Reason */}
                    <td className="py-3.5 px-4">
                      {p.failure_reason ? (
                        <StatusBadge type="reason" value={p.failure_reason} />
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    {/* Date */}
                    <td className="py-3.5 px-4 text-slate-500 text-[11px] font-mono">
                      {new Date(p.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      <StatusBadge type="status" value={p.status} />
                    </td>

                    {/* AI Recommendation */}
                    <td className="py-3.5 px-4">
                      {p.ai_recommendation ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                          <Bot className="w-3 h-3 text-blue-600" />
                          {p.ai_recommendation.replace(/_/g, ' ')}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">Ready for AI analysis</span>
                      )}
                    </td>

                    {/* Action Button */}
                    <td className="py-3.5 px-4 text-right">
                      <Link
                        to={`/payments/${p.payment_id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-blue-600 text-slate-700 hover:text-white font-semibold text-xs transition-colors shadow-2xs"
                      >
                        <span>Analyze</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50/50 flex items-center justify-between text-xs text-slate-500">
          <div>
            Showing <strong className="text-slate-800">{payments.length}</strong> of{' '}
            <strong className="text-slate-800">{total}</strong> transactions
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((prev) => Math.max(0, prev - 1))}
              disabled={page === 0 || loading}
              className="p-1.5 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 disabled:opacity-30 transition-colors cursor-pointer shadow-2xs"
            >
              <ChevronLeft className="w-4 h-4 text-slate-700" />
            </button>
            <span className="px-2 font-mono text-slate-700">
              Page {page + 1} of {Math.max(1, totalPages)}
            </span>
            <button
              onClick={() => setPage((prev) => Math.min(totalPages - 1, prev + 1))}
              disabled={page >= totalPages - 1 || loading}
              className="p-1.5 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 disabled:opacity-30 transition-colors cursor-pointer shadow-2xs"
            >
              <ChevronRight className="w-4 h-4 text-slate-700" />
            </button>
          </div>
        </div>
      </div>

      {/* Webhook Simulation Modal */}
      <WebhookSimulationModal
        isOpen={isWebhookModalOpen}
        onClose={() => setIsWebhookModalOpen(false)}
        onSuccess={() => {
          fetchPayments();
        }}
      />
    </div>
  );
};
