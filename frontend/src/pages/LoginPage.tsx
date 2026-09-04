import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Bot,
  ShieldCheck,
  Zap,
  Lock,
  Mail,
  ArrowRight,
  Sparkles,
  AlertCircle,
  Building2,
  CheckCircle2,
  KeyRound,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, quickDemoLogin, user } = useAuth();

  const [email, setEmail] = useState('merchant@recoverai.io');
  const [password, setPassword] = useState('demo1234');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = async (demoEmail: string) => {
    setError(null);
    setLoading(true);
    try {
      await quickDemoLogin(demoEmail);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Demo authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Decorative Fintech Grid & Background Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(#CBD5E1_1px,transparent_1px)] [background-size:16px_16px] opacity-40 pointer-events-none" />
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-400/10 rounded-full blur-3xl pointer-events-none" />

      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 text-center">
        <Link to="/" className="inline-flex items-center gap-2.5 group mb-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 via-blue-700 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/25 group-hover:scale-105 transition-transform">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div className="text-left">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-2xl text-slate-900 tracking-tight">RecoverAI</span>
              <span className="text-[10px] uppercase font-extrabold tracking-widest px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                Agentic V1
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">Razorpay AI Revenue Recovery Platform</p>
          </div>
        </Link>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight mt-2">
          Merchant Operations Portal
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Autonomous AI Revenue Protection & Payment Loss Mitigation
        </p>
      </div>

      {/* Main Login Card */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4 sm:px-0">
        <div className="bg-white py-8 px-6 sm:px-10 rounded-2xl border border-slate-200 shadow-lg shadow-slate-900/5 space-y-6">
          
          {/* Quick 1-Click Demo Login Box (Ideal for Project Evaluator / Viva) */}
          <div className="p-4 rounded-xl bg-blue-50/80 border border-blue-200/90 space-y-3 shadow-2xs">
            <div className="flex items-center gap-2 text-xs font-bold text-blue-900">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span>1-Click Presentation Accounts (Instant Access)</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => handleQuickDemo('merchant@recoverai.io')}
                disabled={loading}
                className="p-2.5 rounded-lg bg-white hover:bg-blue-50/60 border border-blue-200 text-left transition-all hover:border-blue-400 group cursor-pointer shadow-2xs"
              >
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-slate-900 group-hover:text-blue-700">
                    Merchant Admin
                  </div>
                  <Building2 className="w-3.5 h-3.5 text-blue-600" />
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">NovaFlow Commerce</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemo('admin@razorpay.demo')}
                disabled={loading}
                className="p-2.5 rounded-lg bg-white hover:bg-blue-50/60 border border-blue-200 text-left transition-all hover:border-blue-400 group cursor-pointer shadow-2xs"
              >
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-slate-900 group-hover:text-blue-700">
                    Evaluator Admin
                  </div>
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">Razorpay AI Builder</div>
              </button>
            </div>
          </div>

          <div className="relative flex items-center justify-center">
            <div className="border-t border-slate-200 w-full" />
            <span className="bg-white px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider shrink-0">
              or sign in with credentials
            </span>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 shadow-2xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Merchant Work Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Password
                </label>
                <span className="text-[11px] text-blue-600 font-medium">Demo: demo1234</span>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white text-xs font-bold transition-all shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer mt-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Verifying Authorization...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Command Center</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Active Session Info if already logged in */}
          {user && (
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Active session: <strong className="text-slate-900">{user.email}</strong></span>
              </div>
              <Link to="/" className="text-blue-600 hover:text-blue-700 font-semibold hover:underline">
                Open Dashboard &rarr;
              </Link>
            </div>
          )}
        </div>

        {/* Security & Architecture Badges */}
        <div className="mt-6 grid grid-cols-3 gap-2 text-center text-[10px] text-slate-500">
          <div className="p-2 rounded-lg bg-white border border-slate-200 shadow-2xs flex flex-col items-center gap-1">
            <Zap className="w-3.5 h-3.5 text-blue-600" />
            <span className="font-semibold text-slate-700">LangGraph Agent</span>
          </div>
          <div className="p-2 rounded-lg bg-white border border-slate-200 shadow-2xs flex flex-col items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span className="font-semibold text-slate-700">Safety Guardrails</span>
          </div>
          <div className="p-2 rounded-lg bg-white border border-slate-200 shadow-2xs flex flex-col items-center gap-1">
            <KeyRound className="w-3.5 h-3.5 text-purple-600" />
            <span className="font-semibold text-slate-700">JWT Authorized</span>
          </div>
        </div>
      </div>
    </div>
  );
};
