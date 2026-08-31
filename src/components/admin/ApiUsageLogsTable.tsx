import React, { useState } from 'react';
import type { AdminUsageLogItem } from '../../types/admin.types';
import {
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  Zap,
  Search,
  Filter,
  DollarSign,
  Cpu,
} from 'lucide-react';

export interface ApiUsageLogsTableProps {
  logs: AdminUsageLogItem[];
  isLoading?: boolean;
}

export const ApiUsageLogsTable: React.FC<ApiUsageLogsTableProps> = ({ logs, isLoading = false }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [providerFilter, setProviderFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      (log.user_email && log.user_email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (log.user_id && log.user_id.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (log.image_id && log.image_id.toLowerCase().includes(searchTerm.toLowerCase())) ||
      log.model.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesProvider =
      providerFilter === 'all' || log.provider.toLowerCase() === providerFilter.toLowerCase();

    const matchesStatus =
      statusFilter === 'all' || log.status.toLowerCase() === statusFilter.toLowerCase();

    return matchesSearch && matchesProvider && matchesStatus;
  });

  const formatTimestamp = (ts: string) => {
    try {
      return new Date(ts).toLocaleString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return ts;
    }
  };

  return (
    <div className="space-y-4" data-testid="api-usage-logs-table">
      {/* Search and Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari user email, image ID, atau model..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-slate-900/60 py-2 pl-10 pr-4 text-sm text-white placeholder-slate-500 backdrop-blur-xl focus:border-purple-500/50 focus:outline-none focus:ring-1 focus:ring-purple-500/50"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Provider Filter */}
          <select
            value={providerFilter}
            onChange={(e) => setProviderFilter(e.target.value)}
            className="rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2 text-sm text-slate-200 backdrop-blur-xl focus:border-purple-500/50 focus:outline-none"
          >
            <option value="all">Semua Provider</option>
            <option value="lovable">Lovable AI Gateway</option>
            <option value="openai">OpenAI</option>
            <option value="gemini">Google Gemini</option>
            <option value="replicate">Replicate</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2 text-sm text-slate-200 backdrop-blur-xl focus:border-purple-500/50 focus:outline-none"
          >
            <option value="all">Semua Status</option>
            <option value="success">Berhasil (Success)</option>
            <option value="failed">Gagal (Failed)</option>
          </select>
        </div>
      </div>

      {/* Main Table */}
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-xl shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="border-b border-white/10 bg-slate-950/40 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Waktu (WIB)</th>
                <th className="px-6 py-4">Pengguna</th>
                <th className="px-6 py-4">Provider & Model</th>
                <th className="px-6 py-4">Latensi</th>
                <th className="px-6 py-4">Estimasi Biaya</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    {isLoading ? 'Memuat log penggunaan API...' : 'Belum ada log penggunaan API.'}
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const latency = log.latency_ms ?? log.duration_ms ?? 0;
                  const isSuccess = log.status === 'success' || log.status === '200';

                  return (
                    <tr
                      key={log.id}
                      className="transition-colors hover:bg-white/[0.02]"
                      data-testid={`usage-log-row-${log.id}`}
                    >
                      {/* Timestamp */}
                      <td className="px-6 py-4 font-mono text-xs text-slate-400">
                        {formatTimestamp(log.created_at)}
                      </td>

                      {/* User */}
                      <td className="px-6 py-4">
                        <span className="font-medium text-white">
                          {log.user_email || log.user_id || 'System / Anonymous'}
                        </span>
                        {log.image_id && (
                          <div className="text-[11px] font-mono text-purple-400">
                            img: {log.image_id}
                          </div>
                        )}
                      </td>

                      {/* Provider & Model */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 font-medium text-slate-200">
                          <Cpu className="h-3.5 w-3.5 text-purple-400" />
                          <span className="capitalize">{log.provider}</span>
                        </div>
                        <div className="font-mono text-[11px] text-slate-400">{log.model}</div>
                      </td>

                      {/* Latency */}
                      <td className="px-6 py-4 font-mono text-xs text-slate-300">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5 text-slate-500" />
                          <span>{latency} ms</span>
                        </div>
                      </td>

                      {/* Cost Estimate */}
                      <td className="px-6 py-4 font-mono text-xs text-slate-300">
                        <span className="text-emerald-400 font-semibold">
                          ${(log.cost_estimate_usd || 0.005).toFixed(4)}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        {isSuccess ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2.5 py-0.5 text-xs font-semibold text-emerald-300">
                            <CheckCircle2 className="h-3 w-3" /> 200 OK
                          </span>
                        ) : (
                          <div>
                            <span className="inline-flex items-center gap-1 rounded-full border border-red-500/30 bg-red-500/15 px-2.5 py-0.5 text-xs font-semibold text-red-300">
                              <XCircle className="h-3 w-3" /> Gagal
                            </span>
                            {(log.error_details || log.error_code) && (
                              <div className="mt-1 text-[11px] text-red-400/80 truncate max-w-[180px]">
                                {log.error_details || log.error_code}
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ApiUsageLogsTable;
