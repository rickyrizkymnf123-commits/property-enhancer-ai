import React, { useState, useEffect, useCallback } from 'react';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { AdminNotificationsList } from '../../components/admin/AdminNotificationsList';
import { supabase } from '../../lib/supabase';
import type { AdminNotificationItem } from '../../types/admin.types';
import { RefreshCw, Bell, AlertCircle } from 'lucide-react';

export const AdminNotificationsPage: React.FC = () => {
  const [notifications, setNotifications] = useState<AdminNotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const fetchNotifications = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const { data } = await supabase
        .from('admin_notifications')
        .select('*')
        .order('created_at', { ascending: false });

      if (data) {
        setNotifications(data as AdminNotificationItem[]);
      }
    } catch (err) {
      console.error('Error fetching admin notifications:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();

    const channel = supabase
      .channel('admin-notifs-listener')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'admin_notifications' }, () => {
        fetchNotifications();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchNotifications]);

  const criticals = notifications.filter((n) => n.severity === 'critical').length;
  const unread = notifications.filter((n) => !n.is_read).length;

  return (
    <AdminLayout
      title="Pusat Peringatan & Notifikasi Sistem"
      subtitle="Pantau kegagalan gateway WAHA, error AI provider, atau anomali kuota operasional."
      actions={
        <button
          onClick={fetchNotifications}
          disabled={isRefreshing}
          className="flex items-center gap-2 rounded-xl border border-white/10 bg-slate-900/80 px-3.5 py-2 text-xs font-medium text-slate-300 backdrop-blur-xl hover:border-purple-500/30 hover:text-white transition-all disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin text-purple-400' : ''}`} />
          <span>Segarkan</span>
        </button>
      }
    >
      <div className="space-y-6">
        {/* KPI Alert Summary */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 backdrop-blur-xl">
            <span className="text-xs font-medium text-slate-400">Total Notifikasi</span>
            <div className="mt-2 text-2xl font-bold text-white">{notifications.length}</div>
          </div>
          <div className="rounded-2xl border border-purple-500/20 bg-purple-950/20 p-4 backdrop-blur-xl">
            <span className="text-xs font-medium text-purple-300">Belum Dibaca</span>
            <div className="mt-2 text-2xl font-bold text-purple-200">{unread}</div>
          </div>
          <div className="rounded-2xl border border-red-500/20 bg-red-950/20 p-4 backdrop-blur-xl">
            <span className="text-xs font-medium text-red-300">Peringatan Kritis</span>
            <div className="mt-2 text-2xl font-bold text-red-200">{criticals}</div>
          </div>
        </div>

        <AdminNotificationsList notifications={notifications} onRefresh={fetchNotifications} />
      </div>
    </AdminLayout>
  );
};

export default AdminNotificationsPage;
