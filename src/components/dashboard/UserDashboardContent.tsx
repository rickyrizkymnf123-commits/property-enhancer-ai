import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Image,
  FolderKanban,
  Clock,
  Sparkles,
  Wand2,
  Plus,
  ArrowUpRight,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Layers,
  HelpCircle,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useQuota } from '../../hooks/useQuota';
import { formatCycleResetDate } from '../../lib/maskUtils';
import { RealtimeStatusBadge } from '../studio/RealtimeStatusBadge';
import type { ImageRecord } from '../../types/database.types';
import { cn } from '../../lib/utils';

export interface UserDashboardContentProps {
  customUserId?: string;
  onOpenTutorial?: () => void;
  className?: string;
}

export const UserDashboardContent: React.FC<UserDashboardContentProps> = ({
  customUserId,
  onOpenTutorial,
  className = '',
}) => {
  const { user } = useAuth();
  const effectiveUserId = customUserId || user?.id;

  const quota = useQuota();
  const [totalPhotos, setTotalPhotos] = useState<number>(0);
  const [totalProjects, setTotalProjects] = useState<number>(0);
  const [todayPhotos, setTodayPhotos] = useState<number>(0);
  const [recentImages, setRecentImages] = useState<ImageRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchDashboardStats = useCallback(async () => {
    if (!effectiveUserId) return;
    setIsLoading(true);
    try {
      // 1. Fetch total photos
      const { data: imagesData, error: imagesErr } = await supabase
        .from('images')
        .select('*')
        .eq('user_id', effectiveUserId)
        .order('created_at', { ascending: false });

      if (!imagesErr && imagesData) {
        const allImages = imagesData as ImageRecord[];
        setTotalPhotos(allImages.length);
        setRecentImages(allImages.slice(0, 5));

        // Calculate today's enhancements
        const today = new Date().toISOString().split('T')[0];
        const countToday = allImages.filter((img) => img.created_at && img.created_at.startsWith(today)).length;
        setTodayPhotos(countToday);
      }

      // 2. Fetch total projects
      const { data: projectsData, error: projErr } = await supabase
        .from('projects')
        .select('id', { count: 'exact' })
        .eq('user_id', effectiveUserId);

      if (!projErr && projectsData) {
        setTotalProjects(projectsData.length);
      }
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
    } finally {
      setIsLoading(false);
    }
  }, [effectiveUserId]);

  useEffect(() => {
    fetchDashboardStats();
  }, [fetchDashboardStats]);

  // Subscribe to images table changes for realtime dashboard counters
  useEffect(() => {
    if (!effectiveUserId) return;

    const channel = supabase
      .channel(`dashboard-stats-${effectiveUserId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'images',
          filter: `user_id=eq.${effectiveUserId}`,
        },
        () => {
          fetchDashboardStats();
          quota.refreshQuota();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [effectiveUserId, fetchDashboardStats, quota]);

  const { monthlyQuota, usedQuota, remainingQuota, isExhausted, cycleResetDate, formattedResetDate } = quota;

  return (
    <div className={cn('space-y-6', className)} data-testid="user-dashboard-content">
      {/* Exhaustion or Low Quota Warning Banner */}
      {isExhausted ? (
        <div
          className="p-4 rounded-2xl bg-red-950/40 border border-red-500/40 backdrop-blur-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-[0_0_25px_rgba(239,68,68,0.2)]"
          data-testid="quota-exhausted-banner"
        >
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-red-500/20 text-red-400 shrink-0 mt-0.5">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-red-200">Kuota Bulanan Anda Telah Habis ({usedQuota}/{monthlyQuota})</h4>
              <p className="text-xs text-red-300/80 mt-0.5">
                Tombol AI Enhancement dinonaktifkan sementara. Kuota akan direset otomatis pada{' '}
                <strong className="text-white font-mono">{formattedResetDate}</strong>.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-mono px-3 py-1 rounded-lg bg-red-500/20 border border-red-500/30 text-red-300 font-bold">
              Reset: {formattedResetDate}
            </span>
          </div>
        </div>
      ) : remainingQuota <= 10 ? (
        <div
          className="p-4 rounded-2xl bg-amber-950/40 border border-amber-500/40 backdrop-blur-md flex items-center justify-between gap-4 shadow-[0_0_20px_rgba(245,158,11,0.15)]"
          data-testid="quota-low-banner"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-200">Sisa Kuota Menipis ({remainingQuota} Foto Tersisa)</h4>
              <p className="text-xs text-amber-300/80">
                Siklus kuota berikutnya akan diperbarui pada <strong className="text-white">{formattedResetDate}</strong>.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {/* Primary KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" data-testid="dashboard-stats-grid">
        {/* Card 1: Total Foto */}
        <div
          className="p-5 rounded-2xl bg-slate-900/70 border border-white/10 backdrop-blur-md hover:border-purple-500/30 transition-all shadow-md group"
          data-testid="stat-total-foto"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Foto</span>
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 group-hover:scale-105 transition-transform">
              <Image className="w-4 h-4" />
            </div>
          </div>
          <div className="font-heading text-2xl font-bold text-white mb-1" data-testid="stat-total-foto-count">
            {isLoading ? '...' : totalPhotos}
          </div>
          <p className="text-xs text-slate-400">Total foto properti diproses</p>
        </div>

        {/* Card 2: Total Proyek */}
        <div
          className="p-5 rounded-2xl bg-slate-900/70 border border-white/10 backdrop-blur-md hover:border-blue-500/30 transition-all shadow-md group"
          data-testid="stat-total-proyek"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Proyek</span>
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 group-hover:scale-105 transition-transform">
              <FolderKanban className="w-4 h-4" />
            </div>
          </div>
          <div className="font-heading text-2xl font-bold text-white mb-1" data-testid="stat-total-proyek-count">
            {isLoading ? '...' : totalProjects}
          </div>
          <p className="text-xs text-slate-400">Folder proyek terorganisir</p>
        </div>

        {/* Card 3: Diproses Hari Ini */}
        <div
          className="p-5 rounded-2xl bg-slate-900/70 border border-white/10 backdrop-blur-md hover:border-cyan-500/30 transition-all shadow-md group"
          data-testid="stat-diproses-hari-ini"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Diproses Hari Ini</span>
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 group-hover:scale-105 transition-transform">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="font-heading text-2xl font-bold text-white mb-1" data-testid="stat-today-count">
            {isLoading ? '...' : todayPhotos}
          </div>
          <p className="text-xs text-slate-400">Aktivitas rendering hari ini</p>
        </div>

        {/* Card 4: Sisa Kuota Bulan Ini */}
        <div
          className={cn(
            'p-5 rounded-2xl border backdrop-blur-md transition-all shadow-md group',
            isExhausted
              ? 'bg-red-950/40 border-red-500/40 text-red-200'
              : 'bg-gradient-to-br from-purple-950/50 via-slate-900 to-slate-900 border-purple-500/30 text-white'
          )}
          data-testid="stat-sisa-kuota"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-purple-300 uppercase tracking-wider">Sisa Kuota Bulan Ini</span>
            <div
              className={cn(
                'w-9 h-9 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105',
                isExhausted ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
              )}
            >
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="font-heading text-2xl font-bold flex items-baseline gap-1 mb-1">
            <span className="font-mono" data-testid="stat-sisa-kuota-value">{remainingQuota}</span>
            <span className="text-sm font-normal text-slate-400 font-mono">/ {monthlyQuota}</span>
          </div>
          <p className="text-xs text-slate-400 truncate" title={`Reset: ${formattedResetDate}`}>
            Reset: {formattedResetDate}
          </p>
        </div>
      </div>

      {/* Quick Action Banner */}
      <div className="p-6 md:p-8 rounded-3xl bg-gradient-to-r from-purple-950/80 via-slate-900 to-blue-950/60 border border-purple-500/30 shadow-[0_0_40px_rgba(168,85,247,0.2)] flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Real Estate Photo Studio</span>
          </div>
          <h3 className="text-xl md:text-2xl font-bold font-heading text-white">
            Tingkatkan Foto Properti Anda Sekarang
          </h3>
          <p className="text-sm text-slate-300 max-w-xl leading-relaxed">
            Unggah foto ruangan atau bangunan, pilih preset HDR, Twilight, atau Interior Brightening, dan dapatkan hasil visual memikat dalam hitungan detik.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            to="/app/editor"
            className="px-5 py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-semibold text-sm shadow-[0_0_20px_rgba(168,85,247,0.5)] flex items-center gap-2 transition-all hover:scale-105"
            data-testid="cta-open-studio"
          >
            <Wand2 className="w-4 h-4" />
            <span>Buka AI Studio</span>
          </Link>

          <Link
            to="/app/projects"
            className="px-4 py-3 rounded-2xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 font-semibold text-sm border border-white/10 flex items-center gap-2 transition-colors"
            data-testid="cta-new-project"
          >
            <Plus className="w-4 h-4" />
            <span>Kelola Proyek</span>
          </Link>

          {onOpenTutorial && (
            <button
              type="button"
              onClick={onOpenTutorial}
              className="p-3 rounded-2xl bg-slate-800/60 hover:bg-slate-700/80 text-purple-300 border border-purple-500/20 transition-colors"
              title="Lihat Panduan Onboarding"
              data-testid="cta-open-tutorial"
            >
              <HelpCircle className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Recent Enhancements Table / List */}
      <div className="p-6 rounded-3xl bg-slate-900/60 border border-white/10 backdrop-blur-md space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-heading font-bold text-base text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-purple-400" />
              <span>Aktivitas Foto Terbaru</span>
            </h4>
            <p className="text-xs text-slate-400">Riwayat foto yang baru saja Anda tingkatkan</p>
          </div>

          <Link
            to="/app/gallery"
            className="text-xs font-semibold text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors"
            data-testid="link-view-gallery"
          >
            <span>Lihat Semua Galeri</span>
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>

        {recentImages.length === 0 ? (
          <div className="text-center py-10 border border-dashed border-white/10 rounded-2xl bg-slate-950/40">
            <Image className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-300">Belum ada foto yang diproses</p>
            <p className="text-xs text-slate-400 mt-1 mb-4">Mulai proses foto pertama Anda di AI Studio</p>
            <Link
              to="/app/editor"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-500/30 text-xs font-semibold transition-colors"
            >
              <Wand2 className="w-3.5 h-3.5" />
              <span>Mulai Studio</span>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs" data-testid="recent-images-table">
              <thead>
                <tr className="border-b border-white/10 text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="pb-3 px-3">Pratinjau</th>
                  <th className="pb-3 px-3">Preset</th>
                  <th className="pb-3 px-3">Status</th>
                  <th className="pb-3 px-3">Waktu</th>
                  <th className="pb-3 px-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {recentImages.map((img) => (
                  <tr key={img.id} className="hover:bg-white/5 transition-colors group">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-950 border border-white/10 shrink-0">
                          <img
                            src={img.enhanced_url || img.original_url}
                            alt="Foto Properti"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <span className="font-mono text-slate-300 text-[11px] truncate max-w-[120px]">
                          {img.id.slice(0, 10)}...
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-3 font-medium text-slate-200">
                      {img.preset}
                    </td>
                    <td className="py-3 px-3">
                      <RealtimeStatusBadge status={img.status} errorMessage={img.error_message} showDetails={false} />
                    </td>
                    <td className="py-3 px-3 text-slate-400 font-mono">
                      {new Date(img.created_at).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <Link
                        to="/app/editor"
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-purple-300 border border-purple-500/20 text-[11px] font-semibold transition-colors"
                      >
                        Buka
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserDashboardContent;
