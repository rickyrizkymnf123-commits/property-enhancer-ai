import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import { formatCycleResetDate } from '../lib/maskUtils';

export interface QuotaInfo {
  monthlyQuota: number;
  usedQuota: number;
  remainingQuota: number;
  isExhausted: boolean;
  cycleResetDate: string | null;
  formattedResetDate: string;
  status: string;
  isLoading: boolean;
  refreshQuota: () => Promise<void>;
}

export function useQuota(): QuotaInfo {
  const { user, entitlement: authEntitlement, refreshEntitlement } = useAuth();
  const [entitlement, setEntitlement] = useState(authEntitlement);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const fetchQuota = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const { data } = await supabase
        .from('entitlements')
        .select('*')
        .eq('user_id', user.id)
        .eq('product_code', 'PEA')
        .maybeSingle();

      if (data) {
        setEntitlement(data);
      }
    } catch (err) {
      console.error('Error fetching quota:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (authEntitlement) {
      setEntitlement(authEntitlement);
    } else {
      fetchQuota();
    }
  }, [authEntitlement, fetchQuota]);

  // Subscribe to realtime updates on entitlements for current user
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`user-entitlement-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'entitlements',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.new) {
            setEntitlement(payload.new as any);
            refreshEntitlement();
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user, refreshEntitlement]);

  const monthlyQuota = entitlement?.monthly_quota ?? 100;
  const usedQuota = entitlement?.used_quota ?? (entitlement as any)?.consumed_quota ?? 0;
  const remainingQuota = Math.max(0, monthlyQuota - usedQuota);
  const isExhausted = remainingQuota <= 0;
  const cycleResetDate = entitlement?.cycle_reset_date || null;
  const formattedResetDate = formatCycleResetDate(cycleResetDate);
  const status = entitlement?.status || 'active';

  return {
    monthlyQuota,
    usedQuota,
    remainingQuota,
    isExhausted,
    cycleResetDate,
    formattedResetDate,
    status,
    isLoading,
    refreshQuota: fetchQuota,
  };
}

export default useQuota;
