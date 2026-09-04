import React from 'react';
import { Bot, Sparkles, LogOut, LogIn } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const Navbar: React.FC = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const getInitials = (name?: string) => {
    if (!name) return 'AM';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="h-16 border-b border-slate-200 bg-white/95 backdrop-blur sticky top-0 z-30 px-6 flex items-center justify-between shadow-xs">
      {/* Brand */}
      <div className="flex items-center gap-3">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-blue-700 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg text-slate-900 tracking-tight">RecoverAI</span>
              <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                Agentic V1
              </span>
            </div>
            <div className="text-[11px] text-slate-500 font-medium">Razorpay AI Revenue Recovery Platform</div>
          </div>
        </Link>
      </div>

      {/* Center Status: Agent Status Pill */}
      <div className="hidden md:flex items-center gap-3 bg-slate-50 border border-slate-200 px-3.5 py-1.5 rounded-full shadow-xs">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
        </span>
        <span className="text-xs text-slate-700 font-medium flex items-center gap-1.5">
          <span>LangGraph Recovery Agent:</span>
          <span className="text-emerald-700 font-semibold">Active & Orchestrated</span>
        </span>
        <span className="text-slate-300">|</span>
        <Link
          to="/demo"
          className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1 hover:underline"
        >
          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
          <span>Demo Scenarios</span>
        </Link>
      </div>

      {/* Right Controls: Merchant Profile & Session */}
      <div className="flex items-center gap-4">
        {isAuthenticated && user ? (
          <>
            <div className="text-right hidden sm:block">
              <div className="text-xs font-semibold text-slate-900">{user.merchant_name || 'NovaFlow Commerce'}</div>
              <div className="text-[11px] text-slate-500">
                <span className="font-medium text-slate-700">{user.name}</span> • <span className="font-mono text-slate-500">{user.email}</span>
              </div>
            </div>

            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center font-bold text-xs text-white border border-blue-200 shadow-sm">
              {getInitials(user.name)}
            </div>

            <button
              onClick={handleLogout}
              title="Sign Out"
              className="p-2 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 transition-colors cursor-pointer border border-slate-200"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </>
        ) : (
          <Link
            to="/login"
            className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-blue-500/20"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </Link>
        )}
      </div>
    </header>
  );
};
