import React from 'react';
import { CheckCircle2, AlertCircle, Clock, Zap } from 'lucide-react';

interface TimelineEvent {
  event: string;
  title: string;
  timestamp: string;
  description: string;
  confidence?: number;
  status: 'INFO' | 'SUCCESS' | 'WARNING' | 'FAILED';
}

interface PaymentTimelineProps {
  events: TimelineEvent[];
}

export const PaymentTimeline: React.FC<PaymentTimelineProps> = ({ events }) => {
  if (!events || events.length === 0) {
    return (
      <div className="text-xs text-slate-500 py-4 text-center">
        No lifecycle events recorded for this payment yet.
      </div>
    );
  }

  const getIcon = (status: string, event: string) => {
    if (status === 'SUCCESS') return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
    if (status === 'FAILED') return <AlertCircle className="w-4 h-4 text-rose-600" />;
    if (event.includes('RECOVERY')) return <Zap className="w-4 h-4 text-blue-600" />;
    return <Clock className="w-4 h-4 text-blue-600" />;
  };

  const getBorderColor = (status: string) => {
    if (status === 'SUCCESS') return 'border-emerald-200 bg-emerald-50';
    if (status === 'FAILED') return 'border-rose-200 bg-rose-50';
    return 'border-blue-200 bg-blue-50';
  };

  return (
    <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
      {events.map((evt, idx) => (
        <div key={idx} className="relative">
          {/* Node dot */}
          <div
            className={`absolute -left-6 top-1 w-5 h-5 rounded-full border flex items-center justify-center shadow-xs ${getBorderColor(
              evt.status
            )}`}
          >
            {getIcon(evt.status, evt.event)}
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 shadow-2xs">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="text-xs font-bold text-slate-900">{evt.title}</span>
              <span className="text-[10px] text-slate-500 font-mono">
                {new Date(evt.timestamp).toLocaleString()}
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">{evt.description}</p>
            {evt.confidence && (
              <div className="mt-2 text-[10px] font-semibold text-blue-700">
                Agent Confidence: {Math.round(evt.confidence * 100)}%
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
