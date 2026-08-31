import React, { useState, useEffect, useCallback } from 'react';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { AuditLogsTable } from '../../components/admin/AuditLogsTable';
import { supabase } from '../../lib/supabase';
import type { AdminAuditLogItem } from '../../types/admin.types';
import { RefreshCw, FileText, ShieldAlert, ShieldCheck } from 'lucide-react';

export const AdminAuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AdminAuditLogItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const fetchAuditLogs = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const { data } = await supabase
        .from('admin_audit_logs')
        .select('*')
        .order('created_at', { ascending: false });

      if (data) {
        setLogs(data as AdminAuditLogItem[]);
      }
    } catch (err) {
      console.error('Error fetching audit logs:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAuditLogs();

    const channel = supabase
      .channel('admin-audit-listener')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'admin_audit_logs' }, () => {
        fetchAuditLogs();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel as any);
    };
  }, [fetchAuditLogs]);

  return (
    <AdminLayout
      title="Audit Trail & Rekam Jejak Admin"
      subtitle="Semua tindakan administratif terhadap pengguna, provider AI, dan CMS dicatat secara tamper-evident."
      actions={
        <button
          onClick={fetchAuditLogs}
          disabled={isRefreshing}
          className="flex items-center gap-2 rounded-xl border border-white/10 bg-slate-900/80 px-3.5 py-2 text-xs font-medium text-slate-300 backdrop-blur-xl hover:border-purple-500/30 hover:text-white transition-all disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin text-purple-400' : ''}`} />
          <span>Segarkan Log</span>
        </button>
      }
    >
      <div className="space-y-6">
        <AuditLogsTable logs={logs} isLoading={isLoading} />
      </div>
    </AdminLayout>
  );
};

export default AdminAuditLogsPage;
