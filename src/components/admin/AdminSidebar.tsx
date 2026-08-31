import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import {
  LayoutDashboard,
  Users,
  Cpu,
  KeyRound,
  Activity,
  Bell,
  FileText,
  Sliders,
  LogOut,
  Sparkles,
  ExternalLink,
  ShieldAlert,
  ChevronRight,
  Menu,
  X,
} from 'lucide-react';

export const AdminSidebar: React.FC = () => {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [criticalCount, setCriticalCount] = useState<number>(0);
  const [isMobileOpen, setIsMobileOpen] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;

    const fetchNotifications = async () => {
      try {
        const { data } = await supabase
          .from('admin_notifications')
          .select('*')
          .eq('is_read', false);

        if (isMounted && data) {
          const criticals = data.filter((n: any) => n.severity === 'critical').length;
          setCriticalCount(criticals);
        }
      } catch (err) {
        console.error('Error fetching unread notifications:', err);
      }
    };

    fetchNotifications();

    // Subscribe to realtime notifications
    const channel = supabase
      .channel('admin-sidebar-notifs')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'admin_notifications' },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  const navItems = [
    {
      to: '/admin',
      label: 'Dashboard',
      icon: LayoutDashboard,
      end: true,
    },
    {
      to: '/admin/users',
      label: 'Pengguna',
      icon: Users,
    },
    {
      to: '/admin/keys',
      label: 'Pengaturan API (Kobil LLM)',
      icon: KeyRound,
    },
    {
      to: '/admin/usage',
      label: 'Log Penggunaan API',
      icon: Activity,
    },
    {
      to: '/admin/notifications',
      label: 'Notifikasi Sistem',
      icon: Bell,
      badge: criticalCount > 0 ? criticalCount : undefined,
      badgeColor: 'bg-red-500',
    },
    {
      to: '/admin/audit-logs',
      label: 'Audit Logs',
      icon: FileText,
    },
    {
      to: '/admin/settings',
      label: 'Pengaturan CMS',
      icon: Sliders,
    },
  ];

  return (
    <>
      {/* Mobile Toggle Button */}
      <div className="fixed top-4 left-4 z-50 md:hidden">
        <button
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="rounded-xl border border-white/10 bg-slate-900/90 p-2.5 text-slate-300 backdrop-blur-xl shadow-lg hover:text-white"
          aria-label="Toggle Navigation"
        >
          {isMobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Backdrop for Mobile */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-sm md:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar Content Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 flex w-72 flex-col border-r border-white/10 bg-slate-950/95 backdrop-blur-2xl transition-transform duration-300 md:translate-x-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="flex h-20 items-center justify-between border-b border-white/10 px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-purple-600 to-cyan-400 p-0.5 shadow-lg shadow-purple-500/20">
              <div className="flex h-full w-full items-center justify-center rounded-[10px] bg-slate-950">
                <Sparkles className="h-5 w-5 text-purple-400" />
              </div>
            </div>
            <div>
              <span className="font-heading text-lg font-bold tracking-tight text-white">
                Property<span className="text-purple-400">AI</span>
              </span>
              <span className="ml-2 inline-block rounded border border-purple-500/40 bg-purple-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-purple-300">
                ADMIN
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 space-y-1.5 overflow-y-auto px-4 py-6">
          <div className="px-3 pb-2 text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
            Governance & Management
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setIsMobileOpen(false)}
                className={({ isActive }) =>
                  `group flex items-center justify-between rounded-xl px-3.5 py-3 text-sm font-medium transition-all ${
                    isActive
                      ? 'border border-purple-500/30 bg-purple-500/15 text-white shadow-sm shadow-purple-500/10'
                      : 'text-slate-400 hover:border-white/5 hover:bg-white/5 hover:text-slate-200'
                  }`
                }
              >
                <div className="flex items-center gap-3">
                  <Icon className="h-5 w-5 transition-transform group-hover:scale-110" />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-bold text-white shadow-sm ${
                      item.badgeColor || 'bg-purple-600'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}

          <div className="pt-6">
            <div className="px-3 pb-2 text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
              Quick Shortcuts
            </div>
            <a
              href="/app"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-400 transition-all hover:bg-white/5 hover:text-slate-200"
            >
              <div className="flex items-center gap-3">
                <ExternalLink className="h-4 w-4 text-purple-400" />
                <span>Buka User Studio</span>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-600" />
            </a>
          </div>
        </nav>

        {/* User Profile & Sign Out Footer */}
        <div className="border-t border-white/10 p-4">
          <div className="flex items-center justify-between rounded-xl border border-white/5 bg-slate-900/60 p-3">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-600 to-blue-600 text-xs font-bold text-white">
                {profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : 'A'}
              </div>
              <div className="overflow-hidden">
                <p className="truncate text-xs font-semibold text-white">
                  {profile?.full_name || 'Super Admin'}
                </p>
                <p className="truncate text-[11px] text-slate-400">
                  {user?.email || 'admin@propertyenhancer.ai'}
                </p>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              title="Keluar"
              className="rounded-lg p-2 text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-colors"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default AdminSidebar;
