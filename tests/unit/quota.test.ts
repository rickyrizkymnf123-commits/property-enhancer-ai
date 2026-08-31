import { describe, it, expect } from 'vitest';

export interface EntitlementRecord {
  id: string;
  user_id: string;
  product_code: string;
  monthly_quota: number;
  used_quota: number;
  cycle_reset_date: string;
  status: 'active' | 'inactive' | 'expired' | 'suspended';
  created_at: string;
  updated_at: string;
}

export interface QuotaCheckResult {
  allowed: boolean;
  cycle_reset?: boolean;
  monthly_quota?: number;
  used_quota?: number;
  remaining_quota?: number;
  cycle_reset_date?: string;
  reason?: string;
  status?: string;
  message?: string;
}

/**
 * Exact TypeScript simulation of the PostgreSQL SECURITY DEFINER function `check_and_consume_quota`
 */
export function simulateCheckAndConsumeQuota(
  entitlement: EntitlementRecord | null,
  amount: number = 1,
  currentTime: Date = new Date()
): { result: QuotaCheckResult; updatedEntitlement: EntitlementRecord | null } {
  if (!entitlement) {
    return {
      result: {
        allowed: false,
        reason: 'no_entitlement',
        message: 'Tidak ada paket aktif untuk produk ini.',
      },
      updatedEntitlement: null,
    };
  }

  if (entitlement.status !== 'active') {
    return {
      result: {
        allowed: false,
        reason: 'entitlement_inactive',
        status: entitlement.status,
        message: 'Akses paket Anda sedang nonaktif atau disuspend.',
      },
      updatedEntitlement: { ...entitlement },
    };
  }

  const nowTime = currentTime.getTime();
  const resetTime = new Date(entitlement.cycle_reset_date).getTime();

  // Check if monthly cycle has expired
  if (nowTime >= resetTime) {
    const newCycleReset = new Date(nowTime + 30 * 24 * 60 * 60 * 1000).toISOString();
    const newUsed = amount;

    if (newUsed > entitlement.monthly_quota) {
      const updated: EntitlementRecord = {
        ...entitlement,
        used_quota: 0,
        cycle_reset_date: newCycleReset,
        updated_at: currentTime.toISOString(),
      };
      return {
        result: {
          allowed: false,
          reason: 'quota_exhausted',
          monthly_quota: entitlement.monthly_quota,
          used_quota: 0,
          remaining_quota: entitlement.monthly_quota,
          cycle_reset_date: newCycleReset,
          message: 'Permintaan melebihi kuota bulanan yang tersedia.',
        },
        updatedEntitlement: updated,
      };
    }

    const updated: EntitlementRecord = {
      ...entitlement,
      used_quota: newUsed,
      cycle_reset_date: newCycleReset,
      updated_at: currentTime.toISOString(),
    };

    return {
      result: {
        allowed: true,
        cycle_reset: true,
        monthly_quota: entitlement.monthly_quota,
        used_quota: newUsed,
        remaining_quota: entitlement.monthly_quota - newUsed,
        cycle_reset_date: newCycleReset,
      },
      updatedEntitlement: updated,
    };
  } else {
    // Within active cycle
    if (entitlement.used_quota + amount > entitlement.monthly_quota) {
      return {
        result: {
          allowed: false,
          reason: 'quota_exhausted',
          monthly_quota: entitlement.monthly_quota,
          used_quota: entitlement.used_quota,
          remaining_quota: entitlement.monthly_quota - entitlement.used_quota,
          cycle_reset_date: entitlement.cycle_reset_date,
          message: `Kuota bulanan Anda telah habis. Kuota akan direset pada ${entitlement.cycle_reset_date}`,
        },
        updatedEntitlement: { ...entitlement },
      };
    }

    const newUsed = entitlement.used_quota + amount;
    const updated: EntitlementRecord = {
      ...entitlement,
      used_quota: newUsed,
      updated_at: currentTime.toISOString(),
    };

    return {
      result: {
        allowed: true,
        cycle_reset: false,
        monthly_quota: entitlement.monthly_quota,
        used_quota: newUsed,
        remaining_quota: entitlement.monthly_quota - newUsed,
        cycle_reset_date: entitlement.cycle_reset_date,
      },
      updatedEntitlement: updated,
    };
  }
}

describe('check_and_consume_quota Logic & Boundary Tests', () => {
  const baseEntitlement: EntitlementRecord = {
    id: 'ent-123',
    user_id: 'user-456',
    product_code: 'PEA',
    monthly_quota: 100,
    used_quota: 0,
    cycle_reset_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  it('1. should reject when user has no entitlement record', () => {
    const { result } = simulateCheckAndConsumeQuota(null);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('no_entitlement');
    expect(result.message).toContain('Tidak ada paket aktif');
  });

  it('2. should reject when entitlement status is inactive', () => {
    const inactive = { ...baseEntitlement, status: 'inactive' as const };
    const { result } = simulateCheckAndConsumeQuota(inactive);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('entitlement_inactive');
    expect(result.status).toBe('inactive');
  });

  it('3. should reject when entitlement status is suspended', () => {
    const suspended = { ...baseEntitlement, status: 'suspended' as const };
    const { result } = simulateCheckAndConsumeQuota(suspended);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('entitlement_inactive');
    expect(result.status).toBe('suspended');
  });

  it('4. should successfully consume 1 quota when quota is fresh (0/100)', () => {
    const { result, updatedEntitlement } = simulateCheckAndConsumeQuota(baseEntitlement, 1);
    expect(result.allowed).toBe(true);
    expect(result.cycle_reset).toBe(false);
    expect(result.used_quota).toBe(1);
    expect(result.remaining_quota).toBe(99);
    expect(result.monthly_quota).toBe(100);
    expect(updatedEntitlement?.used_quota).toBe(1);
  });

  it('5. should allow consuming up to exact boundary (100/100)', () => {
    const nearlyFull = { ...baseEntitlement, used_quota: 99 };
    const { result, updatedEntitlement } = simulateCheckAndConsumeQuota(nearlyFull, 1);
    expect(result.allowed).toBe(true);
    expect(result.used_quota).toBe(100);
    expect(result.remaining_quota).toBe(0);
    expect(updatedEntitlement?.used_quota).toBe(100);
  });

  it('6. should reject when quota is completely exhausted (100/100 used, requesting 1)', () => {
    const full = { ...baseEntitlement, used_quota: 100 };
    const { result, updatedEntitlement } = simulateCheckAndConsumeQuota(full, 1);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('quota_exhausted');
    expect(result.remaining_quota).toBe(0);
    expect(result.cycle_reset_date).toBe(baseEntitlement.cycle_reset_date);
    expect(updatedEntitlement?.used_quota).toBe(100);
  });

  it('7. should automatically rollover cycle and reset quota when current time is past cycle_reset_date', () => {
    const expiredCycle: EntitlementRecord = {
      ...baseEntitlement,
      used_quota: 100,
      cycle_reset_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
    };

    const currentTime = new Date();
    const { result, updatedEntitlement } = simulateCheckAndConsumeQuota(expiredCycle, 1, currentTime);

    expect(result.allowed).toBe(true);
    expect(result.cycle_reset).toBe(true);
    expect(result.used_quota).toBe(1);
    expect(result.remaining_quota).toBe(99);
    expect(new Date(result.cycle_reset_date!).getTime()).toBeGreaterThan(currentTime.getTime());
    expect(updatedEntitlement?.used_quota).toBe(1);
  });

  it('8. should reject if request amount exceeds monthly quota during cycle rollover', () => {
    const expiredCycle: EntitlementRecord = {
      ...baseEntitlement,
      used_quota: 100,
      cycle_reset_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    };

    const { result } = simulateCheckAndConsumeQuota(expiredCycle, 105, new Date());
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('quota_exhausted');
    expect(result.remaining_quota).toBe(100);
  });

  it('9. should handle batch amounts correctly within limit', () => {
    const fresh = { ...baseEntitlement, used_quota: 20 };
    const { result, updatedEntitlement } = simulateCheckAndConsumeQuota(fresh, 10);
    expect(result.allowed).toBe(true);
    expect(result.used_quota).toBe(30);
    expect(result.remaining_quota).toBe(70);
    expect(updatedEntitlement?.used_quota).toBe(30);
  });

  it('10. should reject batch amount exceeding remaining quota', () => {
    const state = { ...baseEntitlement, used_quota: 95 };
    const { result } = simulateCheckAndConsumeQuota(state, 10);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('quota_exhausted');
    expect(result.remaining_quota).toBe(5);
  });
});
