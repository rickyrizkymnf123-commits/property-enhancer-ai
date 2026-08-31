import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { UserDashboardContent } from '../../components/dashboard/UserDashboardContent';
import { supabase } from '../../lib/supabase';
import {
  Users,
  ShieldCheck,
  Zap,
  Activity,
  Bell,
  Cpu,
  FileText,
  Sliders,
  ChevronRight,
  TrendingUp,
  ArrowRight,
} from 'lucide-react';

export const AdminDashboardPage: React.FC = () => {
  const [totalUsers, setTotalUsers] = useState<number>(0);
  const [activeEntitlements, setActiveEntitlements] = useState<number>(0);
  const [photosToday, setPhotosToday] = useState<number>(0);
  const [activeProviderName, setActiveProviderName] = useState<string>('Lovable AI Gateway');
  const [criticalNotifsCount, setCriticalNotifsCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;

    const fetchAdminStats = async () => {
      try {
        // 1. Total users
        const { count: usersCount } = await supabase
          .from('profiles')
          .select('*', { count: 'exact' });

        // 2. Active entitlements
        const { count: entCount } = await supabase
          .from('entitlements')
          .select('*', { count: 'exact' })
          .eq('status', 'active');

        // 3. Photos today
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const { count: pTodayCount } = await supabase
          .from('images')
          .select('*', { count: 'exact' })
          .gte('created_at', todayStart.toISOString());

        // 4. Active provider
        const { data: provData } = await supabase
          .from('api_provider_settings')
          .select('*')
          .eq('is_default', true)
          .maybeSingle();

        // 5. Critical notifications
        const { data: notifData } = await supabase
          .from('admin_notifications')
          .select('*')
          .eq('severity', 'critical')
          .eq('is_read', false);

        if (isMounted) {
          setTotalUsers(usersCount || 0);
          setActiveEntitlements(entCount || 0);
          setPhotosToday(pTodayCount || 0);
          if (provData) {
            setActiveProviderName(
              provData.provider_name === 'lovable'
                ? 'Lovable AI Gateway'
                : provData.provider_name.toUpperCase()
            );
          }
          setCriticalNotifsCount(notifData ? notifData.length : 0);
        }
      } catch (err) {
        console.error('Error fetching admin dashboard KPIs:', err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchAdminStats();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <AdminLayout
      title="Admin Dashboard & Quality Assurance"
      subtitle="Pusat tata kelola platform, pemantauan realtime, dan pratinjau live User Studio."
    >
      <div className="space-y-8" data-testid="admin-dashboard-page">
        {/* Admin KPI Summary Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Total Pengguna */}
          <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 backdrop-blur-xl shadow-lg transition-all hover:border-purple-500/30">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">Total Pengguna</span>
              <div className="rounded-xl bg-purple-500/10 p-2 text-purple-400">
                <Users className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold tracking-tight text-white">{isLoading ? '...' : totalUsers}</span>
              <span className="text-xs text-purple-400 font-medium">{activeEntitlements} aktif PEA</span>
            </div>
            <p className="mt-2 text-xs text-slate-400">Total akun teregistrasi</p>
          </div>

          {/* Foto Diproses Hari Ini */}
          <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 backdrop-blur-xl shadow-lg transition-all hover:border-purple-500/30">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">Foto Diproses Hari Ini</span>
              <div className="rounded-xl bg-emerald-500/10 p-2 text-emerald-400">
                <TrendingUp className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold tracking-tight text-white">{isLoading ? '...' : photosToday}</span>
              <span className="text-xs text-emerald-400 font-medium">foto diproses</span>
            </div>
            <p className="mt-2 text-xs text-slate-400">Volume peningkatan hari ini</p>
          </div>

          {/* Active AI Provider */}
          <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 backdrop-blur-xl shadow-lg transition-all hover:border-purple-500/30">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">AI Provider Aktif</span>
              <div className="rounded-xl bg-cyan-500/10 p-2 text-cyan-400">
                <Cpu className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3">
              <span className="font-heading text-lg font-bold tracking-tight text-cyan-300 block truncate">
                {activeProviderName}
              </span>
            </div>
            <p className="mt-2 text-xs text-slate-400">Gateway rendering utama</p>
          </div>

          {/* Notifikasi Kritis */}
          <div className="rounded-2xl border border-red-500/20 bg-red-950/20 p-5 backdrop-blur-xl shadow-lg transition-all hover:border-red-500/40">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-red-300">Peringatan Kritis</span>
              <div className="rounded-xl bg-red-500/20 p-2 text-red-400">
                <Bell className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold tracking-tight text-red-200">
                {isLoading ? '...' : criticalNotifsCount}
              </span>
              <span className="text-xs text-red-300 font-medium">perlu perhatian</span>
            </div>
            <p className="mt-2 text-xs text-red-400/80">Isu gateway / delivery WA</p>
          </div>
        </div>

        {/* Embedded User Dashboard Preview */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-heading text-lg font-bold text-white">
                Live User Dashboard QA Embed
              </h2>
              <p className="text-xs text-slate-400">
                Simulasi tampilan metrik pengguna untuk pengujian antarmuka dan verifikasi kuota.
              </p>
            </div>
          </div>

          {/* Embedded UserDashboardContent */}
          <UserDashboardContent isAdminPreview={true} />
        </div>

        {/* Admin Quick Action Shortcuts */}
        <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur-xl shadow-xl space-y-4">
          <h3 className="font-heading text-base font-bold text-white">Menu Tata Kelola Cepat</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Link
              to="/admin/users"
              className="group flex items-center justify-between rounded-xl border border-white/10 bg-slate-950/60 p-4 transition-all hover:border-purple-500/40 hover:bg-purple-600/10"
            >
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-purple-500/20 p-2 text-purple-400">
                  <Users className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-sm font-bold text-white group-hover:text-purple-300">Pengguna</div>
                  <div className="text-[11px] text-slate-400">Aktivasi & Kuota</div>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-500 group-hover:text-purple-300" />
            </Link>

            <Link
              to="/admin/keys"
              className="group flex items-center justify-between rounded-xl border border-white/10 bg-slate-950/60 p-4 transition-all hover:border-purple-500/40 hover:bg-purple-600/10"
            >
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-cyan-500/20 p-2 text-cyan-400">
                  <Cpu className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-sm font-bold text-white group-hover:text-cyan-300">Pengaturan API</div>
                  <div className="text-[11px] text-slate-400">Kobil LLM Central</div>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-500 group-hover:text-cyan-300" />
            </Link>

            <Link
              to="/admin/audit-logs"
              className="group flex items-center justify-between rounded-xl border border-white/10 bg-slate-950/60 p-4 transition-all hover:border-purple-500/40 hover:bg-purple-600/10"
            >
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-blue-500/20 p-2 text-blue-400">
                  <FileText className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-sm font-bold text-white group-hover:text-blue-300">Audit Logs</div>
                  <div className="text-[11px] text-slate-400">Jejak Aktivitas</div>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-500 group-hover:text-blue-300" />
            </Link>

            <Link
              to="/admin/settings"
              className="group flex items-center justify-between rounded-xl border border-white/10 bg-slate-950/60 p-4 transition-all hover:border-purple-500/40 hover:bg-purple-600/10"
            >
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-amber-500/20 p-2 text-amber-400">
                  <Sliders className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-sm font-bold text-white group-hover:text-amber-300">Pengaturan CMS</div>
                  <div className="text-[11px] text-slate-400">Harga & Testimoni</div>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-500 group-hover:text-amber-300" />
            </Link>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboardPage;
