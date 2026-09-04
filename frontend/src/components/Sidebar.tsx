import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  AlertTriangle,
  SlidersHorizontal,
  Sparkles,
  Activity,
  BarChart3,
  Bot
} from 'lucide-react';

const NAV_ITEMS = [
  {
    to: '/',
    label: 'Overview Dashboard',
    icon: LayoutDashboard,
  },
  {
    to: '/payments',
    label: 'Failed Payments',
    icon: AlertTriangle,
    badge: 'Live Queue',
  },
  {
    to: '/simulator',
    label: 'Strategy Simulator',
    icon: SlidersHorizontal,
    badge: 'Standout',
    highlight: true,
  },
  {
    to: '/demo',
    label: 'Demo Center',
    icon: Sparkles,
  },
  {
    to: '/activity',
    label: 'AI Agent Logs',
    icon: Activity,
  },
  {
    to: '/analytics',
    label: 'Performance Analytics',
    icon: BarChart3,
  },
];

export const Sidebar: React.FC = () => {
  return (
    <aside className="w-64 border-r border-slate-200 bg-white p-4 flex flex-col justify-between shrink-0 min-h-[calc(100vh-4rem)] shadow-xs">
      <div className="space-y-6">
        <div>
          <div className="px-3 mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Revenue Recovery
          </div>
          <nav className="space-y-1">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 border border-blue-200/80 shadow-xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-transparent'
                  }`
                }
              >
                <div className="flex items-center gap-2.5">
                  <item.icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      item.highlight
                        ? 'bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 border border-blue-200'
                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* AI Engine Status Card */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2 text-blue-700 font-bold text-xs mb-1.5">
            <Bot className="w-4 h-4 text-blue-600" />
            <span>Agent Guardrails Active</span>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Deterministic business guardrails prevent gateway over-retry and protect customer trust.
          </p>
          <div className="mt-3 flex items-center justify-between text-[10px] text-slate-500 border-t border-slate-200 pt-2">
            <span>Max Retries: <strong className="text-slate-800 font-semibold">3</strong></span>
            <span>Gateway: <strong className="text-emerald-700 font-semibold">Mock SLA 99.9%</strong></span>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="pt-4 border-t border-slate-200">
        <div className="text-[11px] text-slate-400 flex items-center justify-between">
          <span>Razorpay AI Builder Track</span>
          <span className="text-slate-500 font-medium">2026</span>
        </div>
      </div>
    </aside>
  );
};
