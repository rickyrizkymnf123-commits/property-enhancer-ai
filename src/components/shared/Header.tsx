import React from 'react';
import { Menu, Sparkles, Clock } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useQuota } from '../../hooks/useQuota';
import { cn } from '../../lib/utils';

export interface HeaderProps {
  title?: string;
  subtitle?: string;
  onOpenMobileMenu?: () => void;
  actions?: React.ReactNode;
  className?: string;
}

export const Header: React.FC<HeaderProps> = ({
  title = 'AI Enhancement Studio',
  subtitle,
  onOpenMobileMenu,
  actions,
  className = '',
}) => {
  const { user, profile } = useAuth();
  const { monthlyQuota, usedQuota, remainingQuota, isExhausted, formattedResetDate } = useQuota();

  return (
    <header
      className={cn(
        'h-16 px-4 md:px-8 border-b border-white/10 bg-slate-950/60 backdrop-blur-xl flex items-center justify-between sticky top-0 z-20',
        className
      )}
      data-testid="app-header"
    >
      {/* Left: Mobile Toggle & Page Title */}
      <div className="flex items-center gap-3">
        {onOpenMobileMenu && (
          <button
            type="button"
            onClick={onOpenMobileMenu}
            className="md:hidden p-2 rounded-xl bg-slate-900 border border-white/10 text-slate-300 hover:text-white"
            aria-label="Buka menu"
            data-testid="mobile-menu-toggle"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <div>
          <h1 className="font-heading text-lg md:text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <span>{title}</span>
          </h1>
          {subtitle && <p className="text-xs text-slate-400 hidden sm:block">{subtitle}</p>}
        </div>
      </div>

      {/* Right: Actions, Quota Badge, User Profile Pill */}
      <div className="flex items-center gap-3">
        {actions}

        {/* Quota Badge */}
        <div
          className={cn(
            'flex items-center gap-2 px-3 py-1.5 rounded-xl border backdrop-blur-md text-xs font-semibold shadow-sm transition-all',
            isExhausted
              ? 'bg-red-500/10 border-red-500/30 text-red-300'
              : 'bg-purple-950/50 border-purple-500/30 text-purple-200'
          )}
          title={`Sisa Kuota: ${remainingQuota}/${monthlyQuota}. Reset: ${formattedResetDate}`}
          data-testid="header-quota-badge"
        >
          <Sparkles className={cn('w-3.5 h-3.5', isExhausted ? 'text-red-400' : 'text-purple-400')} />
          <span>
            Kuota: <strong className="font-mono text-white">{remainingQuota}</strong>/{monthlyQuota}
          </span>
          <span className="hidden lg:inline text-slate-400 font-normal text-[11px] border-l border-white/10 pl-2">
            Reset: {formattedResetDate}
          </span>
        </div>

        {/* User Avatar */}
        <div
          className="flex items-center gap-2 pl-2 border-l border-white/10"
          data-testid="header-user-profile"
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-600 to-cyan-500 p-0.5 shadow-[0_0_10px_rgba(168,85,247,0.4)]">
            <div className="w-full h-full bg-slate-900 rounded-full flex items-center justify-center font-bold text-xs text-purple-200">
              {profile?.full_name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U'}
            </div>
          </div>
          <span className="hidden md:inline text-xs font-semibold text-slate-200 max-w-[120px] truncate">
            {profile?.full_name || user?.email?.split('@')[0]}
          </span>
        </div>
      </div>
    </header>
  );
};

export default Header;
