import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { AdminNotificationItem } from '../../types/admin.types';
import {
  Bell,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle2,
  Trash2,
  Clock,
  Filter,
  Check,
  Search,
} from 'lucide-react';

export interface AdminNotificationsListProps {
  notifications: AdminNotificationItem[];
  onRefresh: () => void;
}

export const AdminNotificationsList: React.FC<AdminNotificationsListProps> = ({
  notifications,
  onRefresh,
}) => {
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleMarkAsRead = async (id: string) => {
    try {
      await supabase.from('admin_notifications').update({ is_read: true }).eq('id', id);
      onRefresh();
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await supabase
        .from('admin_notifications')
        .update({ is_read: true })
        .eq('is_read', false);
      onRefresh();
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await supabase.from('admin_notifications').delete().eq('id', id);
      onRefresh();
    } catch (err) {
      console.error('Error deleting notification:', err);
    }
  };

  const filtered = notifications.filter((item) => {
    const matchesSeverity =
      severityFilter === 'all' || item.severity === severityFilter;
    const matchesSearch =
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.message.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSeverity && matchesSearch;
  });

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-red-500/40 bg-red-500/20 px-2.5 py-0.5 text-xs font-bold text-red-300">
            <AlertCircle className="h-3.5 w-3.5 text-red-400" /> KRITIS
          </span>
        );
      case 'warning':
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/20 px-2.5 py-0.5 text-xs font-bold text-amber-300">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-400" /> PERINGATAN
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-blue-500/40 bg-blue-500/20 px-2.5 py-0.5 text-xs font-semibold text-blue-300">
            <Info className="h-3.5 w-3.5 text-blue-400" /> INFORMASI
          </span>
        );
    }
  };

  const formatTimestamp = (ts: string) => {
    try {
      return new Date(ts).toLocaleString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return ts;
    }
  };

  return (
    <div className="space-y-4" data-testid="admin-notifications-list">
      {/* Controls Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari notifikasi peringatan..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-slate-900/60 py-2 pl-10 pr-4 text-sm text-white placeholder-slate-500 backdrop-blur-xl focus:border-purple-500/50 focus:outline-none focus:ring-1 focus:ring-purple-500/50"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400" />
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2 text-sm text-slate-200 backdrop-blur-xl focus:border-purple-500/50 focus:outline-none"
          >
            <option value="all">Semua Tingkat ({notifications.length})</option>
            <option value="critical">Kritis (Critical)</option>
            <option value="warning">Peringatan (Warning)</option>
            <option value="info">Informasi (Info)</option>
          </select>

          <button
            onClick={handleMarkAllRead}
            className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2 text-xs font-medium text-purple-300 hover:bg-purple-500/10 transition-colors"
          >
            <Check className="h-3.5 w-3.5" />
            <span>Tandai Semua Dibaca</span>
          </button>
        </div>
      </div>

      {/* Notifications List Container */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-12 text-center text-slate-500 backdrop-blur-xl">
            <Bell className="mx-auto h-8 w-8 text-slate-600 mb-2" />
            <p>Tidak ada notifikasi sistem yang sesuai.</p>
          </div>
        ) : (
          filtered.map((item) => {
            const isCritical = item.severity === 'critical';
            const isUnread = !item.is_read;
            const isExpanded = expandedId === item.id;

            return (
              <div
                key={item.id}
                data-testid={`notification-item-${item.id}`}
                className={`rounded-2xl border p-5 backdrop-blur-xl transition-all ${
                  isCritical
                    ? 'border-red-500/30 bg-red-950/20 hover:border-red-500/50'
                    : isUnread
                    ? 'border-purple-500/30 bg-slate-900/80 shadow-lg shadow-purple-500/5'
                    : 'border-white/10 bg-slate-900/40 hover:border-white/20'
                }`}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {getSeverityBadge(item.severity)}
                      {isUnread && (
                        <span className="rounded-full bg-purple-500 px-2 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
                          Baru
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-xs text-slate-400">
                        <Clock className="h-3.5 w-3.5" />
                        {formatTimestamp(item.created_at)}
                      </span>
                    </div>

                    <h4 className="font-heading text-base font-bold text-white pt-1">
                      {item.title}
                    </h4>
                    <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">
                      {item.message}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    {isUnread && (
                      <button
                        onClick={() => handleMarkAsRead(item.id)}
                        className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:bg-purple-500/20 hover:text-purple-200 transition-colors"
                        title="Tandai Sudah Dibaca"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="rounded-lg border border-white/10 bg-white/5 p-1.5 text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                      title="Hapus Notifikasi"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Metadata JSON preview if exists */}
                {item.metadata && Object.keys(item.metadata).length > 0 && (
                  <div className="mt-3 border-t border-white/5 pt-3">
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : item.id)}
                      className="text-[11px] font-medium text-purple-400 hover:underline"
                    >
                      {isExpanded ? 'Sembunyikan Detail Data' : 'Lihat Detail Data JSON'}
                    </button>
                    {isExpanded && (
                      <pre className="mt-2 overflow-x-auto rounded-xl border border-white/10 bg-slate-950 p-3 text-[11px] font-mono text-slate-300">
                        {JSON.stringify(item.metadata, null, 2)}
                      </pre>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default AdminNotificationsList;
