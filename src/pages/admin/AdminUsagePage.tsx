import React, { useState, useEffect, useCallback } from 'react';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { ApiUsageLogsTable } from '../../components/admin/ApiUsageLogsTable';
import { supabase } from '../../lib/supabase';
import type { AdminUsageLogItem } from '../../types/admin.types';
import { RefreshCw, Activity, Zap, TrendingUp, DollarSign } from 'lucide-react';

export const AdminUsagePage: React.FC = () => {
  const [logs, setLogs] = useState<AdminUsageLogItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const fetchLogs = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const { data } = await supabase
        .from('api_usage_logs')
        .select('*')
        .order('created_at', { ascending: false });

      if (data) {
        setLogs(data as AdminUsageLogItem[]);
      }
    } catch (err) {
      console.error('Error fetching usage logs:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();

    const channel = supabase
      .channel('admin-usage-listener')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'api_usage_logs' }, () => {
        fetchLogs();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchLogs]);

  // Aggregate metrics
  const totalCalls = logs.length;
  const successfulCalls = logs.filter((l) => l.status === 'success' || l.status === '200').length;
  const successRate = totalCalls > 0 ? Math.round((successfulCalls / totalCalls) * 100) : 100;
  const totalCost = logs.reduce((acc, l) => acc + (l.cost_estimate_usd || 0.005), 0);

  return (
    <AdminLayout
      title="Log Penggunaan API & Metrik Gateway"
      subtitle="Analisis konsumsi token AI, latensi pemrosesan gambar, dan estimasi biaya operasional."
      actions={
        <button
          onClick={fetchLogs}
          disabled={isRefreshing}
          className="flex items-center gap-2 rounded-xl border border-white/10 bg-slate-900/80 px-3.5 py-2 text-xs font-medium text-slate-300 backdrop-blur-xl hover:border-purple-500/30 hover:text-white transition-all disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin text-purple-400' : ''}`} />
          <span>Segarkan Log</span>
        </button>
      }
    >
      <div className="space-y-6">
        {/* KPI Metrics */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 backdrop-blur-xl">
            <span className="text-xs font-medium text-slate-400">Total Panggilan API</span>
            <div className="mt-2 text-2xl font-bold text-white">{totalCalls}</div>
          </div>
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-950/20 p-4 backdrop-blur-xl">
            <span className="text-xs font-medium text-emerald-300">Tingkat Keberhasilan</span>
            <div className="mt-2 text-2xl font-bold text-emerald-200">{successRate}%</div>
          </div>
          <div className="rounded-2xl border border-purple-500/20 bg-purple-950/20 p-4 backdrop-blur-xl">
            <span className="text-xs font-medium text-purple-300">Estimasi Biaya API (USD)</span>
            <div className="mt-2 text-2xl font-bold text-purple-200">${totalCost.toFixed(3)}</div>
          </div>
        </div>

        {/* Logs Table */}
        <ApiUsageLogsTable logs={logs} isLoading={isLoading} />
      </div>
    </AdminLayout>
  );
};

export default AdminUsagePage;
