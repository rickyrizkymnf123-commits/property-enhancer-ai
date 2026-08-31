import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Copy, Check, KeyRound } from 'lucide-react';
import { maskApiKey } from '../../lib/maskUtils';
import { cn } from '../../lib/utils';

export interface MaskedKeyDisplayProps {
  apiKey: string;
  providerName?: string;
  keyName?: string;
  autoHideDurationMs?: number;
  className?: string;
  onCopy?: () => void;
}

export const MaskedKeyDisplay: React.FC<MaskedKeyDisplayProps> = ({
  apiKey,
  providerName,
  keyName,
  autoHideDurationMs = 5000,
  className = '',
  onCopy,
}) => {
  const [isRevealed, setIsRevealed] = useState<boolean>(false);
  const [isCopied, setIsCopied] = useState<boolean>(false);

  useEffect(() => {
    let timeout: NodeJS.Timeout | null = null;
    if (isRevealed && autoHideDurationMs > 0) {
      timeout = setTimeout(() => {
        setIsRevealed(false);
      }, autoHideDurationMs);
    }
    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [isRevealed, autoHideDurationMs]);

  const handleCopy = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(apiKey);
      }
    } catch (err) {
      console.error('Failed to copy key:', err);
    }
    setIsCopied(true);
    onCopy?.();
    setTimeout(() => setIsCopied(false), 2000);
  };

  const toggleReveal = () => {
    setIsRevealed((prev) => !prev);
  };

  const displayText = isRevealed ? apiKey : maskApiKey(apiKey);

  return (
    <div
      className={cn(
        'flex items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-900/80 border border-white/10 shadow-inner backdrop-blur-md',
        className
      )}
      data-testid="masked-key-display"
    >
      <div className="flex items-center gap-3 overflow-hidden flex-1">
        <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0 text-purple-400">
          <KeyRound className="w-4 h-4" />
        </div>

        <div className="overflow-hidden flex-1">
          {(providerName || keyName) && (
            <div className="text-xs font-medium text-slate-400 mb-0.5 truncate flex items-center gap-2">
              <span>{keyName || providerName}</span>
              {providerName && keyName && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-white/5 uppercase">
                  {providerName}
                </span>
              )}
            </div>
          )}
          <div
            className="font-mono text-sm font-semibold tracking-wider text-slate-200 truncate select-all"
            data-testid="masked-key-value"
            title={isRevealed ? apiKey : 'Klik lihat untuk menampilkan'}
          >
            {displayText}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {/* Reveal/Hide Toggle Button */}
        <button
          type="button"
          onClick={toggleReveal}
          className={cn(
            'p-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 border',
            isRevealed
              ? 'bg-amber-500/15 text-amber-300 border-amber-500/30 hover:bg-amber-500/25'
              : 'bg-slate-800/80 text-slate-300 border-white/5 hover:bg-slate-700/80 hover:text-white'
          )}
          title={isRevealed ? 'Sembunyikan API Key' : 'Lihat API Key (5 detik)'}
          data-testid="toggle-reveal-key-btn"
        >
          {isRevealed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          <span className="hidden sm:inline">{isRevealed ? 'Sembunyi' : 'Lihat'}</span>
        </button>

        {/* Copy Button */}
        <button
          type="button"
          onClick={handleCopy}
          className={cn(
            'p-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 border',
            isCopied
              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
              : 'bg-slate-800/80 text-slate-300 border-white/5 hover:bg-slate-700/80 hover:text-white'
          )}
          title="Salin ke clipboard"
          data-testid="copy-key-btn"
        >
          {isCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          <span className="hidden sm:inline">{isCopied ? 'Tersalin' : 'Salin'}</span>
        </button>
      </div>
    </div>
  );
};

export default MaskedKeyDisplay;
