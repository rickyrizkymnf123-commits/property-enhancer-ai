import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Wand2,
  Images,
  FolderKanban,
  Settings,
  LogOut,
  Building2,
  Sparkles,
  Zap,
  Clock,
  X,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useQuota } from '../../hooks/useQuota';
import { cn } from '../../lib/utils';

export interface AppSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  className?: string;
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
  isOpen = false,
  onClose,
  className = '',
}) => {
  const { user, profile, signOut, isAdmin } = useAuth();
  const { monthlyQuota, usedQuota, remainingQuota, isExhausted, formattedResetDate } = useQuota();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  const navItems = [
    { to: '/app', icon: LayoutDashboard, label: 'Dashboard', end: true },
    { to: '/app/editor', icon: Wand2, label: 'AI Studio', end: false },
    { to: '/app/gallery', icon: Images, label: 'Galeri Foto', end: false },
    { to: '/app/projects', icon: FolderKanban, label: 'Proyek', end: false },
    { to: '/app/settings', icon: Settings, label: 'Pengaturan', end: false },
  ];

  const quotaPercentage = Math.min(100, Math.round((usedQuota / monthlyQuota) * 100));

  const content = (
    <div className="flex h-full flex-col justify-between p-4">
      {/* Brand & Navigation */}
      <div className="space-y-6">
        {/* Brand Header */}
        <div className="flex items-center justify-between px-2 pt-1">
          <NavLink to="/app" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 via-purple-500 to-cyan-400 p-0.5 shadow-[0_0_20px_rgba(168,85,247,0.4)] transition-transform duration-200 group-hover:scale-105">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Building2 className="w-5 h-5 text-purple-300" />
              </div>
            </div>
            <div>
              <div className="font-heading font-bold text-base bg-gradient-to-r from-white via-purple-100 to-cyan-200 bg-clip-text text-transparent">
                Property Enhancer
              </div>
              <div className="text-[11px] font-semibold tracking-wider text-purple-400 uppercase flex items-center gap-1">
                <span>AI Studio</span>
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              </div>
            </div>
          </NavLink>

          {onClose && (
            <button
              onClick={onClose}
              className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              aria-label="Tutup menu"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Navigation Links */}
        <nav className="space-y-1" data-testid="sidebar-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-150',
                  isActive
                    ? 'bg-gradient-to-r from-purple-600/30 to-blue-600/20 text-white border border-purple-500/40 shadow-[0_0_15px_rgba(168,85,247,0.25)] font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
                )
              }
              data-testid={`sidebar-link-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
            >
              <item.icon className="w-4 h-4 shrink-0 text-purple-400" />
              <span>{item.label}</span>
            </NavLink>
          ))}

          {isAdmin && (
            <NavLink
              to="/admin"
              onClick={onClose}
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm text-amber-400 hover:bg-amber-500/10 border border-amber-500/20 transition-all duration-150 mt-4"
              data-testid="sidebar-link-admin-panel"
            >
              <Zap className="w-4 h-4 shrink-0 text-amber-400" />
              <span>Admin Panel</span>
            </NavLink>
          )}
        </nav>
      </div>

      {/* Bottom Area: Quota Widget & User Card */}
      <div className="space-y-4 pt-4 border-t border-white/10">
        {/* Monthly Quota Tracker Widget */}
        <div
          className={cn(
            'p-3.5 rounded-2xl border backdrop-blur-md transition-all',
            isExhausted
              ? 'bg-red-950/30 border-red-500/30 text-red-200 shadow-[0_0_15px_rgba(239,68,68,0.2)]'
              : 'bg-slate-900/90 border-purple-500/20 text-slate-300 shadow-[0_0_20px_rgba(168,85,247,0.1)]'
          )}
          data-testid="sidebar-quota-widget"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold">
              <Sparkles className={cn('w-3.5 h-3.5', isExhausted ? 'text-red-400' : 'text-purple-400')} />
              <span>Sisa Kuota Bulan Ini</span>
            </div>
            <span
              className={cn(
                'text-xs font-bold font-mono px-2 py-0.5 rounded-full border',
                isExhausted
                  ? 'bg-red-500/20 border-red-500/40 text-red-300'
                  : 'bg-purple-500/20 border-purple-500/40 text-purple-200'
              )}
              data-testid="sidebar-quota-value"
            >
              {remainingQuota}/{monthlyQuota}
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden mb-2">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-500',
                isExhausted
                  ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]'
                  : 'bg-gradient-to-r from-purple-500 to-cyan-400 shadow-[0_0_10px_rgba(168,85,247,0.6)]'
              )}
              style={{ width: `${Math.max(5, 100 - quotaPercentage)}%` }}
            />
          </div>

          <div className="flex items-center gap-1 text-[11px] text-slate-400" data-testid="sidebar-reset-date">
            <Clock className="w-3 h-3 text-slate-400 shrink-0" />
            <span className="truncate">Reset: {formattedResetDate}</span>
          </div>
        </div>

        {/* User Profile Card */}
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-white/5">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-purple-600/30 border border-purple-500/30 flex items-center justify-center font-bold text-xs text-purple-300 shrink-0">
              {profile?.full_name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="overflow-hidden">
              <div className="text-xs font-semibold text-white truncate">
                {profile?.full_name || 'Agen Properti'}
              </div>
              <div className="text-[11px] text-slate-400 truncate">{user?.email}</div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSignOut}
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
            title="Keluar (Sign Out)"
            data-testid="sidebar-signout-btn"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          'hidden md:flex flex-col w-64 shrink-0 bg-slate-950/80 border-r border-white/10 backdrop-blur-xl h-screen sticky top-0 z-30',
          className
        )}
        data-testid="app-sidebar"
      >
        {content}
      </aside>

      {/* Mobile Drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
          <div className="relative flex flex-col w-72 max-w-full bg-slate-950 border-r border-white/10 h-full z-10 shadow-2xl">
            {content}
          </div>
        </div>
      )}
    </>
  );
};

export default AppSidebar;
