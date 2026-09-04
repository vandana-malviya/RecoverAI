import React from 'react';

interface StatusBadgeProps {
  type: 'method' | 'status' | 'reason' | 'recovery' | 'priority' | 'segment';
  value: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ type, value }) => {
  if (!value) return null;

  if (type === 'method') {
    const config: Record<string, { bg: string; label: string }> = {
      UPI: { bg: 'bg-emerald-50 border-emerald-200 text-emerald-700', label: 'UPI' },
      CARD: { bg: 'bg-blue-50 border-blue-200 text-blue-700', label: 'Card' },
      NETBANKING: { bg: 'bg-purple-50 border-purple-200 text-purple-700', label: 'NetBanking' },
      WALLET: { bg: 'bg-amber-50 border-amber-200 text-amber-700', label: 'Wallet' },
    };
    const c = config[value] || { bg: 'bg-slate-100 border-slate-200 text-slate-700', label: value };
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${c.bg}`}>
        {c.label}
      </span>
    );
  }

  if (type === 'status') {
    const config: Record<string, { bg: string; dot: string; text: string }> = {
      SUCCESS: { bg: 'bg-emerald-50 border-emerald-200 text-emerald-700', dot: 'bg-emerald-600', text: 'text-emerald-700' },
      RECOVERED: { bg: 'bg-emerald-50 border-emerald-200 text-emerald-700', dot: 'bg-emerald-600', text: 'text-emerald-700' },
      FAILED: { bg: 'bg-rose-50 border-rose-200 text-rose-700', dot: 'bg-rose-600', text: 'text-rose-700' },
      PENDING: { bg: 'bg-amber-50 border-amber-200 text-amber-700', dot: 'bg-amber-600', text: 'text-amber-700' },
    };
    const c = config[value] || { bg: 'bg-slate-100 border-slate-200 text-slate-700', dot: 'bg-slate-500', text: 'text-slate-700' };
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${c.bg}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
        <span className={c.text}>{value}</span>
      </span>
    );
  }

  if (type === 'reason') {
    const labels: Record<string, string> = {
      NETWORK_ERROR: 'Network Error',
      BANK_DECLINED: 'Bank Declined',
      INSUFFICIENT_FUNDS: 'Insufficient Funds',
      EXPIRED_CARD: 'Expired Card',
      INVALID_CARD: 'Invalid Card Details',
      UPI_FAILURE: 'UPI PSP Timeout',
      TIMEOUT: 'Session Timeout',
      UNKNOWN: 'Gateway Error',
    };
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-rose-50 border border-rose-200 text-rose-700">
        {labels[value] || value.replace(/_/g, ' ')}
      </span>
    );
  }

  if (type === 'priority') {
    const config: Record<string, { bg: string; text: string }> = {
      HIGH: { bg: 'bg-rose-50 text-rose-700 border-rose-200 font-bold', text: 'HIGH PRIORITY' },
      MEDIUM: { bg: 'bg-amber-50 text-amber-800 border-amber-200 font-bold', text: 'MEDIUM' },
      LOW: { bg: 'bg-slate-100 text-slate-700 border-slate-200 font-bold', text: 'LOW' },
    };
    const c = config[value] || { bg: 'bg-slate-100 text-slate-700 border-slate-200', text: value };
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] tracking-wider uppercase border ${c.bg}`}>
        {c.text}
      </span>
    );
  }

  if (type === 'segment') {
    const config: Record<string, { bg: string; label: string }> = {
      HIGH_VALUE: { bg: 'bg-amber-50 text-amber-800 border-amber-200 font-semibold', label: '⭐ High Value VIP' },
      REGULAR: { bg: 'bg-blue-50 text-blue-700 border-blue-200 font-semibold', label: 'Regular' },
      NEW: { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold', label: 'New Customer' },
    };
    const c = config[value] || { bg: 'bg-slate-100 text-slate-700 border-slate-200', label: value };
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs border ${c.bg}`}>
        {c.label}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
      {value}
    </span>
  );
};
