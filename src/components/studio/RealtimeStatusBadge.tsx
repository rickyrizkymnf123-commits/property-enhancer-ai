import React from 'react';
import { Clock, Loader2, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import type { ImageStatus } from '../../types/database.types';
import { cn } from '../../lib/utils';

export interface RealtimeStatusBadgeProps {
  status: ImageStatus | 'idle';
  errorMessage?: string | null;
  className?: string;
  showDetails?: boolean;
}

export const RealtimeStatusBadge: React.FC<RealtimeStatusBadgeProps> = ({
  status,
  errorMessage,
  className = '',
  showDetails = true,
}) => {
  switch (status) {
    case 'queued':
      return (
        <div
          className={cn(
            'inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-semibold shadow-[0_0_15px_rgba(245,158,11,0.2)] animate-pulse',
            className
          )}
          data-testid="status-badge-queued"
        >
          <Clock className="w-3.5 h-3.5 text-amber-400 animate-spin" style={{ animationDuration: '3s' }} />
          <span>Dalam Antrean AI</span>
          {showDetails && <span className="text-[10px] text-amber-400/80">• Menunggu giliran</span>}
        </div>
      );

    case 'processing':
      return (
        <div
          className={cn(
            'inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-300 text-xs font-semibold shadow-[0_0_20px_rgba(59,130,246,0.3)]',
            className
          )}
          data-testid="status-badge-processing"
        >
          <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin" />
          <span>AI Sedang Memproses</span>
          {showDetails && <span className="text-[10px] text-blue-300/80">• Menghitung pencahayaan</span>}
        </div>
      );

    case 'done':
      return (
        <div
          className={cn(
            'inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold shadow-[0_0_15px_rgba(16,185,129,0.2)]',
            className
          )}
          data-testid="status-badge-done"
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>Selesai Ditingkatkan</span>
        </div>
      );

    case 'failed':
      return (
        <div
          className={cn(
            'inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/15 border border-red-500/30 text-red-300 text-xs font-semibold shadow-[0_0_15px_rgba(239,68,68,0.2)]',
            className
          )}
          data-testid="status-badge-failed"
        >
          <AlertCircle className="w-3.5 h-3.5 text-red-400" />
          <span>Gagal: {errorMessage || 'Terjadi kesalahan'}</span>
        </div>
      );

    case 'idle':
    default:
      return (
        <div
          className={cn(
            'inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800 border border-white/10 text-slate-400 text-xs font-medium',
            className
          )}
          data-testid="status-badge-idle"
        >
          <Sparkles className="w-3.5 h-3.5 text-slate-500" />
          <span>Siap Diproses</span>
        </div>
      );
  }
};

export default RealtimeStatusBadge;
