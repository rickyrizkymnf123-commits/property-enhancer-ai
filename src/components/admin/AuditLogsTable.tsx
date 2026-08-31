import React, { useState } from 'react';
import type { AdminAuditLogItem } from '../../types/admin.types';
import {
  FileText,
  ShieldAlert,
  Search,
  Filter,
  Clock,
  UserCheck,
  UserX,
  KeyRound,
  Trash2,
  Send,
  Cpu,
  Sliders,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export interface AuditLogsTableProps {
  logs: AdminAuditLogItem[];
  isLoading?: boolean;
}

export const AuditLogsTable: React.FC<AuditLogsTableProps> = ({ logs, isLoading = false }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'approve_user':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2.5 py-0.5 text-xs font-semibold text-emerald-300">
            <UserCheck className="h-3.5 w-3.5" /> Approve User
          </span>
        );
      case 'reject_user':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-red-500/30 bg-red-500/15 px-2.5 py-0.5 text-xs font-semibold text-red-300">
            <UserX className="h-3.5 w-3.5" /> Reject / Suspend
          </span>
        );
      case 'reset_password':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-500/30 bg-blue-500/15 px-2.5 py-0.5 text-xs font-semibold text-blue-300">
            <KeyRound className="h-3.5 w-3.5" /> Reset Password
          </span>
        );
      case 'delete_user':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-red-600/40 bg-red-600/20 px-2.5 py-0.5 text-xs font-semibold text-red-300">
            <Trash2 className="h-3.5 w-3.5" /> Delete User
          </span>
        );
      case 'resend_credential':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-purple-500/30 bg-purple-500/15 px-2.5 py-0.5 text-xs font-semibold text-purple-300">
            <Send className="h-3.5 w-3.5" /> Resend WhatsApp
          </span>
        );
      case 'switch_provider':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/15 px-2.5 py-0.5 text-xs font-semibold text-cyan-300">
            <Cpu className="h-3.5 w-3.5" /> Switch Provider
          </span>
        );
      case 'update_settings':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/15 px-2.5 py-0.5 text-xs font-semibold text-amber-300">
            <Sliders className="h-3.5 w-3.5" /> Update CMS
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-500/30 bg-slate-500/15 px-2.5 py-0.5 text-xs font-semibold text-slate-300">
            {action}
          </span>
        );
    }
  };

  const filteredLogs = logs.filter((log) => {
    const act = log.action_type || log.action || '';
    const matchesAction = actionFilter === 'all' || act === actionFilter;

    const matchesSearch =
      (log.admin_email && log.admin_email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (log.target_email && log.target_email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (log.target_user_id && log.target_user_id.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (log.target_resource && log.target_resource.toLowerCase().includes(searchTerm.toLowerCase())) ||
      act.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesAction && matchesSearch;
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
    <div className="space-y-4" data-testid="audit-logs-table-container">
      {/* Search and Action Filter */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari admin, target email, atau tipe aksi..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-slate-900/60 py-2 pl-10 pr-4 text-sm text-white placeholder-slate-500 backdrop-blur-xl focus:border-purple-500/50 focus:outline-none focus:ring-1 focus:ring-purple-500/50"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400" />
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            data-testid="audit-action-filter"
            className="rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2 text-sm text-slate-200 backdrop-blur-xl focus:border-purple-500/50 focus:outline-none"
          >
            <option value="all">Semua Tipe Aksi ({logs.length})</option>
            <option value="approve_user">Approve User</option>
            <option value="reject_user">Reject User</option>
            <option value="reset_password">Reset Password</option>
            <option value="delete_user">Delete User</option>
            <option value="resend_credential">Resend WhatsApp</option>
            <option value="switch_provider">Switch AI Provider</option>
            <option value="update_settings">Update Settings CMS</option>
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
                <th className="px-6 py-4">Administrator</th>
                <th className="px-6 py-4">Tipe Tindakan</th>
                <th className="px-6 py-4">Target Pengguna / Resource</th>
                <th className="px-6 py-4">IP Address</th>
                <th className="px-6 py-4 text-right">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    {isLoading ? 'Memuat audit logs...' : 'Belum ada catatan audit log yang sesuai.'}
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const act = log.action_type || log.action || 'other';
                  const isExpanded = expandedId === log.id;

                  return (
                    <React.Fragment key={log.id}>
                      <tr
                        className="transition-colors hover:bg-white/[0.02]"
                        data-testid={`audit-log-row-${log.id}`}
                      >
                        {/* Timestamp */}
                        <td className="px-6 py-4 font-mono text-xs text-slate-400">
                          <div className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 text-slate-500" />
                            <span>{formatTimestamp(log.created_at)}</span>
                          </div>
                        </td>

                        {/* Administrator */}
                        <td className="px-6 py-4">
                          <div className="font-medium text-white">
                            {log.admin_email || 'Super Admin'}
                          </div>
                          {log.admin_id && (
                            <div className="font-mono text-[10px] text-slate-500 truncate max-w-[120px]">
                              {log.admin_id}
                            </div>
                          )}
                        </td>

                        {/* Action Badge */}
                        <td className="px-6 py-4">{getActionBadge(act)}</td>

                        {/* Target User / Resource */}
                        <td className="px-6 py-4">
                          <div className="font-medium text-slate-200">
                            {log.target_email || log.target_resource || log.target_user_id || 'System'}
                          </div>
                          {log.target_user_id && log.target_email && (
                            <div className="font-mono text-[10px] text-slate-500 truncate max-w-[120px]">
                              id: {log.target_user_id}
                            </div>
                          )}
                        </td>

                        {/* IP Address */}
                        <td className="px-6 py-4 font-mono text-xs text-slate-400">
                          {log.ip_address || '127.0.0.1'}
                        </td>

                        {/* Expand Details */}
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => setExpandedId(isExpanded ? null : log.id)}
                            className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-slate-300 hover:bg-purple-500/20 hover:text-purple-200 transition-colors"
                          >
                            <span>Payload</span>
                            {isExpanded ? (
                              <ChevronUp className="h-3.5 w-3.5" />
                            ) : (
                              <ChevronDown className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </td>
                      </tr>

                      {/* Expandable JSON Row */}
                      {isExpanded && (
                        <tr className="bg-slate-950/60">
                          <td colSpan={6} className="px-6 py-3">
                            <div className="rounded-xl border border-white/10 bg-slate-950 p-3">
                              <span className="text-[11px] font-semibold text-purple-300">
                                Raw Payload & Context:
                              </span>
                              <pre className="mt-1 overflow-x-auto text-[11px] font-mono text-slate-300">
                                {JSON.stringify(
                                  {
                                    id: log.id,
                                    action: act,
                                    admin: log.admin_email,
                                    target: log.target_email || log.target_resource,
                                    details: log.details,
                                    user_agent: log.user_agent,
                                    created_at: log.created_at,
                                  },
                                  null,
                                  2
                                )}
                              </pre>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
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

export default AuditLogsTable;
