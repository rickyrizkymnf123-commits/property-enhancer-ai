import React from 'react';
import { Link } from 'react-router-dom';
import { AdminSidebar } from './AdminSidebar';
import { Bell, Sparkles, Shield, Activity, RefreshCw } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export interface AdminLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  children,
  title = 'Admin Panel',
  subtitle,
  actions,
}) => {
  const { profile, user } = useAuth();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased selection:bg-purple-500/30 selection:text-purple-200">
      {/* Background Decorative Gradients */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-[20%] left-[20%] h-[600px] w-[600px] rounded-full bg-purple-900/10 blur-[140px]" />
        <div className="absolute top-[40%] right-[10%] h-[500px] w-[500px] rounded-full bg-blue-900/10 blur-[140px]" />
      </div>

      {/* Admin Sidebar Navigation */}
      <AdminSidebar />

      {/* Main Content Area */}
      <div className="relative z-10 flex min-h-screen flex-col md:pl-72">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-white/10 bg-slate-950/80 px-6 backdrop-blur-xl">
          <div className="flex items-center gap-4">
            <div className="hidden md:block">
              <h1 className="font-heading text-xl font-bold tracking-tight text-white">{title}</h1>
              {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* System Live Pill */}
            <div className="hidden sm:flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
              </span>
              <span>Sistem Operasional</span>
            </div>

            {/* Custom Header Actions */}
            {actions}

            {/* Notification Bell */}
            <Link
              to="/admin/notifications"
              className="relative rounded-xl border border-white/10 bg-slate-900/80 p-2.5 text-slate-300 backdrop-blur-xl transition-colors hover:border-purple-500/30 hover:text-white"
              title="Notifikasi Sistem"
            >
              <Bell className="h-5 w-5" />
            </Link>

            {/* Admin Avatar */}
            <div className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-slate-900/80 px-3 py-1.5 backdrop-blur-xl">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-600 text-xs font-bold text-white">
                {profile?.full_name?.charAt(0).toUpperCase() || 'A'}
              </div>
              <span className="hidden text-xs font-semibold text-slate-200 lg:inline">
                {profile?.full_name || 'Admin'}
              </span>
            </div>
          </div>
        </header>

        {/* Page Content Body */}
        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto space-y-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
