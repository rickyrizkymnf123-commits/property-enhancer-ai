import React, { useState, useEffect, useCallback } from 'react';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { AdminUserTable } from '../../components/admin/AdminUserTable';
import { supabase } from '../../lib/supabase';
import type { AdminUserRecord } from '../../types/admin.types';
import { RefreshCw, Users, Plus, ShieldCheck } from 'lucide-react';

export const AdminUsersPage: React.FC = () => {
  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const fetchUsers = useCallback(async () => {
    setIsRefreshing(true);
    try {
      // 1. Query profiles
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      // 2. Query user roles
      const { data: rolesData } = await supabase.from('user_roles').select('*');

      // 3. Query entitlements
      const { data: entitlementsData } = await supabase.from('entitlements').select('*');

      const profilesList = profilesData || [];
      const rolesList = rolesData || [];
      const entitlementsList = entitlementsData || [];

      // Combine user records
      const combined: AdminUserRecord[] = profilesList.map((p: any) => {
        const userRole = rolesList.find((r: any) => r.user_id === p.id);
        const userEnt = entitlementsList.find((e: any) => e.user_id === p.id && (e.product_code === 'PEA' || !e.product_code));

        return {
          id: p.id,
          email: p.email,
          full_name: p.full_name,
          phone: p.phone,
          avatar_url: p.avatar_url,
          role: userRole?.role || 'user',
          entitlement_status: userEnt?.status || 'none',
          monthly_quota: userEnt?.monthly_quota ?? 100,
          consumed_quota: userEnt?.consumed_quota ?? userEnt?.used_quota ?? 0,
          used_quota: userEnt?.consumed_quota ?? userEnt?.used_quota ?? 0,
          cycle_reset_date: userEnt?.cycle_reset_date || null,
          created_at: p.created_at,
          updated_at: p.updated_at,
        };
      });

      setUsers(combined);
    } catch (err) {
      console.error('Error fetching admin users:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();

    // Subscribe to realtime changes on users, profiles, entitlements
    const channel = supabase
      .channel('admin-users-listener')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'entitlements' }, () => {
        fetchUsers();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        fetchUsers();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchUsers]);

  return (
    <AdminLayout
      title="Manajemen Pengguna & Kuota"
      subtitle="Kelola status aktivasi lisensi PEA, reset kata sandi, dan kuota bulanan pengguna."
      actions={
        <button
          onClick={fetchUsers}
          disabled={isRefreshing}
          className="flex items-center gap-2 rounded-xl border border-white/10 bg-slate-900/80 px-3.5 py-2 text-xs font-medium text-slate-300 backdrop-blur-xl hover:border-purple-500/30 hover:text-white transition-all disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin text-purple-400' : ''}`} />
          <span>Segarkan</span>
        </button>
      }
    >
      <div className="space-y-6">
        {/* Metric Overview Row */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 backdrop-blur-xl">
            <span className="text-xs font-medium text-slate-400">Total Pengguna Terdaftar</span>
            <div className="mt-2 text-2xl font-bold text-white">{users.length}</div>
          </div>
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-950/20 p-4 backdrop-blur-xl">
            <span className="text-xs font-medium text-emerald-300">Pengguna Aktif (PEA)</span>
            <div className="mt-2 text-2xl font-bold text-emerald-200">
              {users.filter((u) => u.entitlement_status === 'active').length}
            </div>
          </div>
          <div className="rounded-2xl border border-purple-500/20 bg-purple-950/20 p-4 backdrop-blur-xl">
            <span className="text-xs font-medium text-purple-300">Administrator</span>
            <div className="mt-2 text-2xl font-bold text-purple-200">
              {users.filter((u) => u.role === 'admin').length}
            </div>
          </div>
        </div>

        {/* User Table Component */}
        <AdminUserTable users={users} onRefresh={fetchUsers} />
      </div>
    </AdminLayout>
  );
};

export default AdminUsersPage;
