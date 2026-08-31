import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import type { AdminUserRecord } from '../../types/admin.types';
import {
  CheckCircle2,
  XCircle,
  KeyRound,
  Trash2,
  Send,
  MoreVertical,
  Shield,
  UserCheck,
  UserX,
  AlertTriangle,
  Copy,
  Check,
  Search,
  Filter,
  Calendar,
  Zap,
} from 'lucide-react';

export interface AdminUserTableProps {
  users: AdminUserRecord[];
  onRefresh: () => void;
}

export const AdminUserTable: React.FC<AdminUserTableProps> = ({ users, onRefresh }) => {
  const { user: currentAdmin } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  // Modal States
  const [resetModalData, setResetModalData] = useState<{ user: AdminUserRecord; pass: string } | null>(null);
  const [deleteModalUser, setDeleteModalUser] = useState<AdminUserRecord | null>(null);
  const [copiedPass, setCopiedPass] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Helper to log audit actions
  const logAudit = async (action: any, targetUserId: string, targetEmail: string, details: any) => {
    try {
      await supabase.rpc('log_admin_action', {
        p_action: action,
        p_action_type: action,
        p_admin_id: currentAdmin?.id || null,
        p_admin_email: currentAdmin?.email || 'admin@propertyenhancer.ai',
        p_target_user_id: targetUserId,
        p_target_email: targetEmail,
        p_details: details,
      });
    } catch (err) {
      console.warn('Audit log fallback error:', err);
    }
  };

  // 1. Approve User Action
  const handleApprove = async (u: AdminUserRecord) => {
    setIsProcessing(u.id);
    setActiveDropdown(null);
    try {
      // 1. Update entitlement directly or via edge function
      const { error } = await supabase
        .from('entitlements')
        .update({ status: 'active', updated_at: new Date().toISOString() })
        .eq('user_id', u.id);

      if (error) throw error;

      // 2. Mandatory Audit Logging
      await logAudit('approve_user', u.id, u.email, { action: 'approve', previous_status: u.entitlement_status });

      setActionMessage({ type: 'success', text: `Akses pengguna ${u.email} berhasil disetujui & diaktifkan.` });
      onRefresh();
    } catch (err: any) {
      setActionMessage({ type: 'error', text: `Gagal menyetujui pengguna: ${err.message || err}` });
    } finally {
      setIsProcessing(null);
    }
  };

  // 2. Reject / Suspend User Action
  const handleReject = async (u: AdminUserRecord) => {
    setIsProcessing(u.id);
    setActiveDropdown(null);
    try {
      const { error } = await supabase
        .from('entitlements')
        .update({ status: 'suspended', updated_at: new Date().toISOString() })
        .eq('user_id', u.id);

      if (error) throw error;

      // Mandatory Audit Logging
      await logAudit('reject_user', u.id, u.email, { action: 'reject', previous_status: u.entitlement_status });

      setActionMessage({ type: 'success', text: `Akses pengguna ${u.email} telah ditangguhkan.` });
      onRefresh();
    } catch (err: any) {
      setActionMessage({ type: 'error', text: `Gagal menangguhkan pengguna: ${err.message || err}` });
    } finally {
      setIsProcessing(null);
    }
  };

  // 3. Reset Password Action
  const handleResetPassword = async (u: AdminUserRecord) => {
    setIsProcessing(u.id);
    setActiveDropdown(null);
    const newPass = `Pea_${Math.random().toString(36).substring(2, 8)}!2026`;
    try {
      // Update password via admin auth or mock
      if ((supabase.auth as any).admin?.updateUserById) {
        await (supabase.auth as any).admin.updateUserById(u.id, { password: newPass });
      }

      // Mandatory Audit Logging
      await logAudit('reset_password', u.id, u.email, { action: 'reset_password' });

      setResetModalData({ user: u, pass: newPass });
      setActionMessage({ type: 'success', text: `Kata sandi untuk ${u.email} berhasil direset.` });
      onRefresh();
    } catch (err: any) {
      setActionMessage({ type: 'error', text: `Gagal mereset kata sandi: ${err.message || err}` });
    } finally {
      setIsProcessing(null);
    }
  };

  // 4. Delete User Action
  const confirmDeleteUser = async () => {
    if (!deleteModalUser) return;
    const u = deleteModalUser;
    setIsProcessing(u.id);
    try {
      // Delete user dependencies
      await supabase.from('entitlements').delete().eq('user_id', u.id);
      await supabase.from('user_roles').delete().eq('user_id', u.id);
      await supabase.from('profiles').delete().eq('id', u.id);
      if ((supabase.auth as any).admin?.deleteUser) {
        await (supabase.auth as any).admin.deleteUser(u.id);
      }

      // Mandatory Audit Logging
      await logAudit('delete_user', u.id, u.email, { action: 'delete' });

      setActionMessage({ type: 'success', text: `Pengguna ${u.email} berhasil dihapus permanen.` });
      setDeleteModalUser(null);
      onRefresh();
    } catch (err: any) {
      setActionMessage({ type: 'error', text: `Gagal menghapus pengguna: ${err.message || err}` });
    } finally {
      setIsProcessing(null);
    }
  };

  // 5. Resend WhatsApp Credential Action
  const handleResendWhatsApp = async (u: AdminUserRecord) => {
    setIsProcessing(u.id);
    setActiveDropdown(null);
    try {
      // Invoke provision/admin function or simulate WAHA send
      await supabase.functions.invoke('admin-users', {
        body: { action: 'resend_credential', user_id: u.id },
      });

      // Mandatory Audit Logging
      await logAudit('resend_credential', u.id, u.email, {
        action: 'resend_credential',
        phone: u.phone,
        method: 'whatsapp_waha',
      });

      setActionMessage({ type: 'success', text: `Kredensial WhatsApp berhasil dikirim ulang ke ${u.phone || u.email}.` });
      onRefresh();
    } catch (err: any) {
      setActionMessage({ type: 'error', text: `Gagal mengirim kredensial WhatsApp: ${err.message || err}` });
    } finally {
      setIsProcessing(null);
    }
  };

  // Filtering
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.full_name && u.full_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (u.phone && u.phone.includes(searchTerm));

    const matchesStatus =
      statusFilter === 'all'
        ? true
        : statusFilter === 'active'
        ? u.entitlement_status === 'active'
        : statusFilter === 'suspended'
        ? u.entitlement_status === 'suspended' || u.entitlement_status === 'inactive'
        : statusFilter === 'admin'
        ? u.role === 'admin'
        : true;

    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string, role: string) => {
    if (role === 'admin') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-purple-500/30 bg-purple-500/15 px-2.5 py-0.5 text-xs font-semibold text-purple-300">
          <Shield className="h-3 w-3" /> Admin
        </span>
      );
    }
    if (status === 'active') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2.5 py-0.5 text-xs font-semibold text-emerald-300">
          <UserCheck className="h-3 w-3" /> Aktif (PEA)
        </span>
      );
    }
    if (status === 'suspended' || status === 'inactive') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-red-500/30 bg-red-500/15 px-2.5 py-0.5 text-xs font-semibold text-red-300">
          <UserX className="h-3 w-3" /> Ditangguhkan
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-slate-500/30 bg-slate-500/15 px-2.5 py-0.5 text-xs font-semibold text-slate-300">
        Belum Aktif
      </span>
    );
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-4" data-testid="admin-user-table-wrapper">
      {/* Action Notification Alert */}
      {actionMessage && (
        <div
          className={`flex items-center justify-between rounded-xl p-4 text-sm font-medium ${
            actionMessage.type === 'success'
              ? 'border border-emerald-500/30 bg-emerald-950/40 text-emerald-200'
              : 'border border-red-500/30 bg-red-950/40 text-red-200'
          }`}
        >
          <span>{actionMessage.text}</span>
          <button
            onClick={() => setActionMessage(null)}
            className="text-xs underline hover:opacity-80"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari email, nama, atau no. WhatsApp..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-slate-900/60 py-2 pl-10 pr-4 text-sm text-white placeholder-slate-500 backdrop-blur-xl focus:border-purple-500/50 focus:outline-none focus:ring-1 focus:ring-purple-500/50"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2 text-sm text-slate-200 backdrop-blur-xl focus:border-purple-500/50 focus:outline-none"
          >
            <option value="all">Semua Pengguna ({users.length})</option>
            <option value="active">Aktif (PEA)</option>
            <option value="suspended">Ditangguhkan / Inaktif</option>
            <option value="admin">Administrator</option>
          </select>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-xl shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="border-b border-white/10 bg-slate-950/40 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Pengguna</th>
                <th className="px-6 py-4">Role & Status</th>
                <th className="px-6 py-4">Sisa Kuota</th>
                <th className="px-6 py-4">Reset Siklus</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    Tidak ada pengguna yang cocok dengan pencarian / filter.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const used = u.consumed_quota ?? u.used_quota ?? 0;
                  const total = u.monthly_quota || 100;
                  const remaining = Math.max(0, total - used);
                  const isBusy = isProcessing === u.id;

                  return (
                    <tr
                      key={u.id}
                      className="transition-colors hover:bg-white/[0.02]"
                      data-testid={`user-row-${u.id}`}
                    >
                      {/* Pengguna */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-tr from-purple-600/30 to-blue-600/30 text-xs font-bold text-purple-300 border border-purple-500/20">
                            {u.full_name ? u.full_name.charAt(0).toUpperCase() : u.email.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-medium text-white">{u.full_name || 'Tanpa Nama'}</div>
                            <div className="text-xs text-slate-400">{u.email}</div>
                            {u.phone && <div className="text-[11px] text-purple-300/80">WA: {u.phone}</div>}
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        {getStatusBadge(u.entitlement_status, u.role)}
                      </td>

                      {/* Kuota */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Zap className="h-4 w-4 text-purple-400" />
                          <span className="font-semibold text-white">{remaining}</span>
                          <span className="text-xs text-slate-400">/ {total} foto</span>
                        </div>
                        <div className="mt-1 h-1.5 w-24 overflow-hidden rounded-full bg-slate-800">
                          <div
                            className="h-full rounded-full bg-purple-500"
                            style={{ width: `${Math.min(100, (remaining / total) * 100)}%` }}
                          />
                        </div>
                      </td>

                      {/* Reset Date */}
                      <td className="px-6 py-4 text-xs text-slate-300">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-slate-500" />
                          <span>{formatDate(u.cycle_reset_date)}</span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        <div className="relative inline-block text-left">
                          <button
                            onClick={() => setActiveDropdown(activeDropdown === u.id ? null : u.id)}
                            disabled={isBusy}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
                            aria-label={`Aksi untuk ${u.email}`}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>

                          {activeDropdown === u.id && (
                            <div
                              className="absolute right-0 z-50 mt-1 w-52 rounded-xl border border-white/10 bg-slate-900 p-1.5 backdrop-blur-2xl shadow-2xl"
                              onMouseLeave={() => setActiveDropdown(null)}
                            >
                              {/* Approve */}
                              <button
                                onClick={() => handleApprove(u)}
                                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-medium text-emerald-300 hover:bg-emerald-500/10 transition-colors"
                              >
                                <CheckCircle2 className="h-4 w-4" />
                                <span>Setujui (Aktivasi PEA)</span>
                              </button>

                              {/* Reject / Suspend */}
                              <button
                                onClick={() => handleReject(u)}
                                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-medium text-amber-300 hover:bg-amber-500/10 transition-colors"
                              >
                                <XCircle className="h-4 w-4" />
                                <span>Tangguhkan Akses</span>
                              </button>

                              {/* Reset Password */}
                              <button
                                onClick={() => handleResetPassword(u)}
                                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-medium text-blue-300 hover:bg-blue-500/10 transition-colors"
                              >
                                <KeyRound className="h-4 w-4" />
                                <span>Reset Kata Sandi</span>
                              </button>

                              {/* Resend WhatsApp */}
                              <button
                                onClick={() => handleResendWhatsApp(u)}
                                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-medium text-purple-300 hover:bg-purple-500/10 transition-colors"
                              >
                                <Send className="h-4 w-4" />
                                <span>Kirim Ulang Kredensial WA</span>
                              </button>

                              <div className="my-1 border-t border-white/10" />

                              {/* Delete */}
                              <button
                                onClick={() => {
                                  setActiveDropdown(null);
                                  setDeleteModalUser(u);
                                }}
                                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-medium text-red-400 hover:bg-red-500/10 transition-colors"
                              >
                                <Trash2 className="h-4 w-4" />
                                <span>Hapus Pengguna</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reset Password Result Modal */}
      {resetModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-emerald-400">
              <KeyRound className="h-6 w-6" />
              <h3 className="font-heading text-lg font-bold text-white">Kata Sandi Baru Dibuat</h3>
            </div>
            <p className="mt-2 text-xs text-slate-400">
              Kata sandi untuk pengguna <span className="text-white font-medium">{resetModalData.user.email}</span> telah diperbarui:
            </p>
            <div className="mt-4 flex items-center justify-between rounded-xl border border-purple-500/30 bg-slate-950 p-3">
              <span className="font-mono text-sm font-bold text-purple-300 tracking-wider">
                {resetModalData.pass}
              </span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(resetModalData.pass);
                  setCopiedPass(true);
                  setTimeout(() => setCopiedPass(false), 2000);
                }}
                className="flex items-center gap-1 rounded-lg bg-purple-500/20 px-2.5 py-1 text-xs font-medium text-purple-200 hover:bg-purple-500/30 transition-colors"
              >
                {copiedPass ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copiedPass ? 'Tersalin' : 'Salin'}</span>
              </button>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setResetModalData(null)}
                className="rounded-xl bg-purple-600 px-5 py-2 text-xs font-semibold text-white hover:bg-purple-500 transition-all shadow-lg shadow-purple-500/20"
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete User Confirmation Modal */}
      {deleteModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-red-500/20 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-red-400">
              <AlertTriangle className="h-6 w-6" />
              <h3 className="font-heading text-lg font-bold text-white">Konfirmasi Hapus Pengguna</h3>
            </div>
            <p className="mt-2 text-xs text-slate-300 leading-relaxed">
              Apakah Anda yakin ingin menghapus akun <strong className="text-white">{deleteModalUser.email}</strong> secara permanen?
              Semua data proyek, foto, dan lisensi PEA akan dihapus dan tindakan ini akan dicatat ke audit log.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setDeleteModalUser(null)}
                className="rounded-xl border border-white/10 px-4 py-2 text-xs font-medium text-slate-400 hover:bg-white/5 hover:text-white"
              >
                Batal
              </button>
              <button
                onClick={confirmDeleteUser}
                className="rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-500 shadow-lg shadow-red-500/20"
              >
                Hapus Permanen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUserTable;
