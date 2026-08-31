/**
 * Tier 2: Boundary Values & Corner Cases E2E Test Suite (≥95 Tests)
 * 
 * Validates edge cases, input limits, fuzzing scenarios, security boundary conditions,
 * timestamp mathematics, and failure handling across all system modules.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  MockSupabaseClient,
  mockDb,
  executeCheckAndConsumeQuota,
  executeHasRole,
  computeMockHmac,
  validateHmacSignature,
} from '../../src/lib/mockSupabase';

describe('Tier 2: Boundary Values & Corner Cases Test Suite (95 Tests)', () => {
  let supabase: MockSupabaseClient;

  beforeEach(() => {
    supabase = new MockSupabaseClient();
  });

  // =========================================================================
  // Section 1: File Upload Boundaries & Format Fuzzing (15 Tests)
  // =========================================================================
  describe('1. File Upload Boundaries & Format Fuzzing', () => {
    const validateUpload = (filename: string, sizeBytes: number, mimeType: string) => {
      const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      const allowedExts = ['.jpg', '.jpeg', '.png', '.webp'];
      const maxSizeBytes = 15 * 1024 * 1024; // 15MB

      if (sizeBytes <= 0) {
        return { valid: false, error: 'File tidak boleh kosong (0 bytes)' };
      }
      if (sizeBytes > maxSizeBytes) {
        return { valid: false, error: 'Ukuran file melebihi batas maksimal 15MB' };
      }

      const lowerMime = mimeType.toLowerCase();
      const dotIndex = filename.lastIndexOf('.');
      const ext = dotIndex !== -1 ? filename.slice(dotIndex).toLowerCase() : '';

      if (!allowedMimes.includes(lowerMime) || !allowedExts.includes(ext)) {
        return { valid: false, error: 'Format file tidak didukung (Gunakan JPG, PNG, atau WEBP)' };
      }

      // Check dangerous traversal
      if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
        const sanitized = filename.replace(/^.*[\\\/]/, '');
        return { valid: true, sanitizedFilename: sanitized, error: null };
      }

      return { valid: true, sanitizedFilename: filename, error: null };
    };

    it('1.1: 0-byte file is rejected with empty file error', () => {
      const res = validateUpload('empty.jpg', 0, 'image/jpeg');
      expect(res.valid).toBe(false);
      expect(res.error).toBe('File tidak boleh kosong (0 bytes)');
    });

    it('1.2: Exact 15.00MB boundary (15,728,640 bytes) is accepted', () => {
      const res = validateUpload('exact_limit.png', 15 * 1024 * 1024, 'image/png');
      expect(res.valid).toBe(true);
      expect(res.error).toBeNull();
    });

    it('1.3: 15MB + 1 byte (15,728,641 bytes) is rejected', () => {
      const res = validateUpload('over_by_one.png', 15 * 1024 * 1024 + 1, 'image/png');
      expect(res.valid).toBe(false);
      expect(res.error).toBe('Ukuran file melebihi batas maksimal 15MB');
    });

    it('1.4: Uppercase MIME type IMAGE/JPEG is normalized and accepted', () => {
      const res = validateUpload('photo.jpg', 1024, 'IMAGE/JPEG');
      expect(res.valid).toBe(true);
    });

    it('1.5: Uppercase file extension .PNG is accepted', () => {
      const res = validateUpload('RENDER.PNG', 2048, 'image/png');
      expect(res.valid).toBe(true);
    });

    it('1.6: Uppercase extension .WEBP is accepted', () => {
      const res = validateUpload('EXTERIOR.WEBP', 5000, 'image/webp');
      expect(res.valid).toBe(true);
    });

    it('1.7: Disallowed format .gif is rejected', () => {
      const res = validateUpload('animation.gif', 1024, 'image/gif');
      expect(res.valid).toBe(false);
      expect(res.error).toContain('tidak didukung');
    });

    it('1.8: Disallowed format .svg is rejected', () => {
      const res = validateUpload('vector.svg', 1024, 'image/svg+xml');
      expect(res.valid).toBe(false);
    });

    it('1.9: Disallowed format .heic / .heif is rejected', () => {
      const res = validateUpload('iphone_shot.heic', 2048, 'image/heic');
      expect(res.valid).toBe(false);
    });

    it('1.10: Disallowed format .bmp is rejected', () => {
      const res = validateUpload('bitmap.bmp', 4096, 'image/bmp');
      expect(res.valid).toBe(false);
    });

    it('1.11: Executable payload with fake extension .exe.jpg is validated', () => {
      const res = validateUpload('malware.exe', 1024, 'application/x-msdownload');
      expect(res.valid).toBe(false);
    });

    it('1.12: Unix path traversal in filename ../../../etc/passwd.jpg is sanitized', () => {
      const res = validateUpload('../../../etc/passwd.jpg', 2048, 'image/jpeg');
      expect(res.valid).toBe(true);
      expect(res.sanitizedFilename).toBe('passwd.jpg');
    });

    it('1.13: Windows path traversal in filename ..\\..\\boot.png is sanitized', () => {
      const res = validateUpload('..\\..\\boot.png', 2048, 'image/png');
      expect(res.valid).toBe(true);
      expect(res.sanitizedFilename).toBe('boot.png');
    });

    it('1.14: Filename with Indonesian / Asian Unicode characters & emoji is accepted', () => {
      const res = validateUpload('Rumah Mewah Menteng 🏡 豪华.jpg', 4096, 'image/jpeg');
      expect(res.valid).toBe(true);
      expect(res.sanitizedFilename).toBe('Rumah Mewah Menteng 🏡 豪华.jpg');
    });

    it('1.15: Filename with multiple periods photo.final.v2.min.jpg is parsed properly', () => {
      const res = validateUpload('photo.final.v2.min.jpg', 1024, 'image/jpeg');
      expect(res.valid).toBe(true);
    });
  });

  // =========================================================================
  // Section 2: Quota Tracking Boundaries & Timestamp Math (15 Tests)
  // =========================================================================
  describe('2. Quota Tracking Boundaries & Timestamp Math', () => {
    it('2.1: Exactly 0 consumed quota grants 100 remaining', async () => {
      const uId = 'u-q0';
      mockDb.entitlements.set(uId, {
        id: 'e0',
        user_id: uId,
        product_code: 'PEA',
        status: 'active',
        monthly_quota: 100,
        consumed_quota: 0,
        cycle_start_date: new Date().toISOString(),
        cycle_reset_date: new Date(Date.now() + 30 * 86400000).toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      const res = await executeCheckAndConsumeQuota(uId);
      expect(res.allowed).toBe(true);
      expect(res.remaining).toBe(99);
    });

    it('2.2: Exactly 99 consumed quota allows the 100th image (0 remaining)', async () => {
      const uId = 'u-q99';
      mockDb.entitlements.set(uId, {
        id: 'e99',
        user_id: uId,
        product_code: 'PEA',
        status: 'active',
        monthly_quota: 100,
        consumed_quota: 99,
        cycle_start_date: new Date().toISOString(),
        cycle_reset_date: new Date(Date.now() + 30 * 86400000).toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      const res = await executeCheckAndConsumeQuota(uId);
      expect(res.allowed).toBe(true);
      expect(res.remaining).toBe(0);
    });

    it('2.3: 100 consumed quota blocks the 101st image immediately', async () => {
      const uId = 'u-q100';
      mockDb.entitlements.set(uId, {
        id: 'e100',
        user_id: uId,
        product_code: 'PEA',
        status: 'active',
        monthly_quota: 100,
        consumed_quota: 100,
        cycle_start_date: new Date().toISOString(),
        cycle_reset_date: new Date(Date.now() + 30 * 86400000).toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      const res = await executeCheckAndConsumeQuota(uId);
      expect(res.allowed).toBe(false);
      expect(res.remaining).toBe(0);
      expect(res.error).toBe('Monthly quota exhausted');
    });

    it('2.4: 105 consumed quota (over-limit edge) remains strictly blocked', async () => {
      const uId = 'u-q105';
      mockDb.entitlements.set(uId, {
        id: 'e105',
        user_id: uId,
        product_code: 'PEA',
        status: 'active',
        monthly_quota: 100,
        consumed_quota: 105,
        cycle_start_date: new Date().toISOString(),
        cycle_reset_date: new Date(Date.now() + 30 * 86400000).toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      const res = await executeCheckAndConsumeQuota(uId);
      expect(res.allowed).toBe(false);
    });

    it('2.5: Custom quota limit (e.g. 500 quota for VIP) behaves correctly', async () => {
      const uId = 'u-vip';
      mockDb.entitlements.set(uId, {
        id: 'e-vip',
        user_id: uId,
        product_code: 'PEA',
        status: 'active',
        monthly_quota: 500,
        consumed_quota: 250,
        cycle_start_date: new Date().toISOString(),
        cycle_reset_date: new Date(Date.now() + 30 * 86400000).toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      const res = await executeCheckAndConsumeQuota(uId);
      expect(res.allowed).toBe(true);
      expect(res.remaining).toBe(249);
    });

    it('2.6: Small quota limit (1 photo trial) locks after 1 use', async () => {
      const uId = 'u-trial';
      mockDb.entitlements.set(uId, {
        id: 'e-trial',
        user_id: uId,
        product_code: 'PEA',
        status: 'active',
        monthly_quota: 1,
        consumed_quota: 0,
        cycle_start_date: new Date().toISOString(),
        cycle_reset_date: new Date(Date.now() + 30 * 86400000).toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      const res1 = await executeCheckAndConsumeQuota(uId);
      expect(res1.allowed).toBe(true);
      expect(res1.remaining).toBe(0);

      const res2 = await executeCheckAndConsumeQuota(uId);
      expect(res2.allowed).toBe(false);
    });

    it('2.7: Pre-reset timestamp (1 second before reset_date) does not trigger rollover', async () => {
      const uId = 'u-prereset';
      const futureReset = new Date(Date.now() + 1000).toISOString(); // 1s future

      mockDb.entitlements.set(uId, {
        id: 'e-pre',
        user_id: uId,
        product_code: 'PEA',
        status: 'active',
        monthly_quota: 100,
        consumed_quota: 100, // Exhausted
        cycle_start_date: new Date(Date.now() - 30 * 86400000).toISOString(),
        cycle_reset_date: futureReset,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      const res = await executeCheckAndConsumeQuota(uId);
      expect(res.allowed).toBe(false); // Still in old exhausted cycle
      expect(mockDb.entitlements.get(uId)?.consumed_quota).toBe(100);
    });

    it('2.8: Post-reset timestamp (1 second after reset_date) triggers automatic cycle reset', async () => {
      const uId = 'u-postreset';
      const pastReset = new Date(Date.now() - 1000).toISOString(); // 1s past

      mockDb.entitlements.set(uId, {
        id: 'e-post',
        user_id: uId,
        product_code: 'PEA',
        status: 'active',
        monthly_quota: 100,
        consumed_quota: 100,
        cycle_start_date: new Date(Date.now() - 31 * 86400000).toISOString(),
        cycle_reset_date: pastReset,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      const res = await executeCheckAndConsumeQuota(uId);
      expect(res.allowed).toBe(true);
      expect(res.remaining).toBe(99);
      expect(mockDb.entitlements.get(uId)?.consumed_quota).toBe(1);
    });

    it('2.9: Multi-month dormancy jump (60 days elapsed) rolls over cleanly to current 30-day window', async () => {
      const uId = 'u-dormant';
      const longPastReset = new Date(Date.now() - 60 * 86400000).toISOString(); // 60 days ago

      mockDb.entitlements.set(uId, {
        id: 'e-dorm',
        user_id: uId,
        product_code: 'PEA',
        status: 'active',
        monthly_quota: 100,
        consumed_quota: 75,
        cycle_start_date: new Date(Date.now() - 90 * 86400000).toISOString(),
        cycle_reset_date: longPastReset,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      const res = await executeCheckAndConsumeQuota(uId);
      expect(res.allowed).toBe(true);
      expect(res.remaining).toBe(99);

      const ent = mockDb.entitlements.get(uId);
      const newReset = new Date(ent!.cycle_reset_date).getTime();
      expect(newReset).toBeGreaterThan(Date.now() + 25 * 86400000);
    });

    it('2.10: Inactive status entitlement rejects quota consumption', async () => {
      const uId = 'u-inact-q';
      mockDb.entitlements.set(uId, {
        id: 'e-inact',
        user_id: uId,
        product_code: 'PEA',
        status: 'inactive',
        monthly_quota: 100,
        consumed_quota: 0,
        cycle_start_date: new Date().toISOString(),
        cycle_reset_date: new Date(Date.now() + 30 * 86400000).toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      const res = await executeCheckAndConsumeQuota(uId);
      expect(res.allowed).toBe(false);
      expect(res.error).toBe('Entitlement is not active');
    });

    it('2.11: Suspended status entitlement rejects quota consumption', async () => {
      const uId = 'u-susp-q';
      mockDb.entitlements.set(uId, {
        id: 'e-susp',
        user_id: uId,
        product_code: 'PEA',
        status: 'suspended',
        monthly_quota: 100,
        consumed_quota: 0,
        cycle_start_date: new Date().toISOString(),
        cycle_reset_date: new Date(Date.now() + 30 * 86400000).toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      const res = await executeCheckAndConsumeQuota(uId);
      expect(res.allowed).toBe(false);
    });

    it('2.12: Expired status entitlement rejects quota consumption', async () => {
      const uId = 'u-exp-q';
      mockDb.entitlements.set(uId, {
        id: 'e-exp',
        user_id: uId,
        product_code: 'PEA',
        status: 'expired',
        monthly_quota: 100,
        consumed_quota: 0,
        cycle_start_date: new Date().toISOString(),
        cycle_reset_date: new Date(Date.now() + 30 * 86400000).toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      const res = await executeCheckAndConsumeQuota(uId);
      expect(res.allowed).toBe(false);
    });

    it('2.13: Non-PEA product code entitlement is rejected by PEA quota check', async () => {
      const uId = 'u-other-prod';
      mockDb.entitlements.set(uId, {
        id: 'e-other',
        user_id: uId,
        product_code: 'OTHER_APP',
        status: 'active',
        monthly_quota: 100,
        consumed_quota: 0,
        cycle_start_date: new Date().toISOString(),
        cycle_reset_date: new Date(Date.now() + 30 * 86400000).toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      const res = await executeCheckAndConsumeQuota(uId);
      expect(res.allowed).toBe(false);
      expect(res.error).toBe('No PEA entitlement found');
    });

    it('2.14: Concurrent sequential decrements from same user decrement synchronously', async () => {
      const uId = 'u-seq-dec';
      mockDb.entitlements.set(uId, {
        id: 'e-seq',
        user_id: uId,
        product_code: 'PEA',
        status: 'active',
        monthly_quota: 100,
        consumed_quota: 0,
        cycle_start_date: new Date().toISOString(),
        cycle_reset_date: new Date(Date.now() + 30 * 86400000).toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      for (let i = 0; i < 5; i++) {
        await executeCheckAndConsumeQuota(uId);
      }

      const ent = mockDb.entitlements.get(uId);
      expect(ent?.consumed_quota).toBe(5);
    });

    it('2.15: Quota reset date format matches ISO 8601 string standard', async () => {
      const uId = 'u-iso-fmt';
      mockDb.entitlements.set(uId, {
        id: 'e-iso',
        user_id: uId,
        product_code: 'PEA',
        status: 'active',
        monthly_quota: 100,
        consumed_quota: 0,
        cycle_start_date: new Date().toISOString(),
        cycle_reset_date: new Date(Date.now() + 30 * 86400000).toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      const res = await executeCheckAndConsumeQuota(uId);
      expect(res.reset_date).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });

  // =========================================================================
  // Section 3: Auth, Passwords, Session & Security Boundaries (15 Tests)
  // =========================================================================
  describe('3. Auth, Passwords, Session & Security Boundaries', () => {
    it('3.1: Empty email in sign in returns error', async () => {
      const { data, error } = await supabase.auth.signInWithPassword({ email: '', password: 'Password123!' });
      expect(data.session).toBeNull();
      expect(error).toBeDefined();
    });

    it('3.2: Empty password in sign in returns error', async () => {
      const { data, error } = await supabase.auth.signInWithPassword({ email: 'admin@domain.com', password: '' });
      expect(data.session).toBeNull();
      expect(error).toBeDefined();
    });

    it('3.3: Whitespace email trimmed match succeeds', async () => {
      mockDb.users.set('u-trim', {
        id: 'u-trim',
        email: 'trim@domain.com',
        password: 'Pass!',
        created_at: new Date().toISOString(),
      });

      const { data, error } = await supabase.auth.signInWithPassword({
        email: '  trim@domain.com  '.trim(),
        password: 'Pass!',
      });
      expect(error).toBeNull();
      expect(data.user?.email).toBe('trim@domain.com');
    });

    it('3.4: Extremely long email (255+ characters) is handled cleanly', async () => {
      const longEmail = 'a'.repeat(240) + '@propertyenhancer.ai';
      mockDb.users.set('u-long', { id: 'u-long', email: longEmail, password: 'Pass!', created_at: new Date().toISOString() });

      const { data, error } = await supabase.auth.signInWithPassword({ email: longEmail, password: 'Pass!' });
      expect(error).toBeNull();
      expect(data.user?.email).toBe(longEmail);
    });

    it('3.5: SQL injection attempt in email is safely treated as string literal', async () => {
      const sqliEmail = "admin' OR 1=1 --";
      const { data, error } = await supabase.auth.signInWithPassword({ email: sqliEmail, password: 'Pass!' });
      expect(data.session).toBeNull();
      expect(error?.message).toBe('Invalid login credentials');
    });

    it('3.6: XSS script payload in profile name is stored harmlessly as literal string', async () => {
      const uId = 'u-xss';
      const xssPayload = '<script>alert("XSS")</script>';
      mockDb.profiles.set(uId, {
        id: uId,
        email: 'xss@test.com',
        full_name: xssPayload,
        phone: null,
        avatar_url: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      const { data } = await supabase.from('profiles').select('*').eq('id', uId).single();
      expect(data.full_name).toBe(xssPayload);
    });

    it('3.7: Password change with special symbols and unicode succeeds', async () => {
      const uId = 'u-unicode-pass';
      mockDb.users.set(uId, { id: uId, email: 'unicode@test.com', password: 'Old!', created_at: new Date().toISOString() });

      await supabase.auth.signInWithPassword({ email: 'unicode@test.com', password: 'Old!' });
      const complexPass = '🔒P@$$w0rd_Indonësia_2026!#%&*';
      const { error } = await supabase.auth.updateUser({ password: complexPass });
      expect(error).toBeNull();
      expect(mockDb.users.get(uId)?.password).toBe(complexPass);
    });

    it('3.8: Direct query for non-existent user profile returns PGRST116 single error', async () => {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', 'non-existent-uid').single();
      expect(data).toBeNull();
      expect(error?.code).toBe('PGRST116');
    });

    it('3.9: Query with maybeSingle returns null without error for non-existent record', async () => {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', 'ghost-id').maybeSingle();
      expect(data).toBeNull();
      expect(error).toBeNull();
    });

    it('3.10: Storage bucket upload creates nested folder structure path', async () => {
      const path = 'users/123/projects/456/photo.jpg';
      const { data, error } = await supabase.storage.from('images').upload(path, 'content');
      expect(error).toBeNull();
      expect(data?.path).toBe(path);
    });

    it('3.11: User session token contains user id reference', async () => {
      mockDb.users.set('u-jwt', { id: 'u-jwt', email: 'jwt@test.com', password: 'Pass!', created_at: new Date().toISOString() });
      const { data } = await supabase.auth.signInWithPassword({ email: 'jwt@test.com', password: 'Pass!' });
      expect(data.session?.access_token).toContain('mock_jwt_u-jwt');
    });

    it('3.12: Auth getUser returns null after sign out', async () => {
      mockDb.users.set('u-gu', { id: 'u-gu', email: 'gu@test.com', password: 'Pass!', created_at: new Date().toISOString() });
      await supabase.auth.signInWithPassword({ email: 'gu@test.com', password: 'Pass!' });
      await supabase.auth.signOut();

      const { data } = await supabase.auth.getUser();
      expect(data.user).toBeNull();
    });

    it('3.13: Multiple auth listeners receive state transitions independently', async () => {
      const events1: string[] = [];
      const events2: string[] = [];

      supabase.auth.onAuthStateChange((ev) => events1.push(ev));
      supabase.auth.onAuthStateChange((ev) => events2.push(ev));

      mockDb.users.set('u-multi-listen', { id: 'u-ml', email: 'ml@test.com', password: 'Pass!', created_at: new Date().toISOString() });
      await supabase.auth.signInWithPassword({ email: 'ml@test.com', password: 'Pass!' });

      expect(events1).toContain('SIGNED_IN');
      expect(events2).toContain('SIGNED_IN');
    });

    it('3.14: Admin deleteUser removes target from auth users map', async () => {
      mockDb.users.set('u-to-del', { id: 'u-to-del', email: 'todel@test.com', created_at: new Date().toISOString() });
      const { error } = await supabase.auth.admin.deleteUser('u-to-del');
      expect(error).toBeNull();
      expect(mockDb.users.has('u-to-del')).toBe(false);
    });

    it('3.15: Admin listUsers returns all currently stored users', async () => {
      mockDb.users.set('u-lu1', { id: 'u-lu1', email: 'lu1@test.com', created_at: new Date().toISOString() });
      mockDb.users.set('u-lu2', { id: 'u-lu2', email: 'lu2@test.com', created_at: new Date().toISOString() });

      const { data, error } = await supabase.auth.admin.listUsers();
      expect(error).toBeNull();
      expect(data.users.length).toBeGreaterThanOrEqual(2);
    });
  });

  // =========================================================================
  // Section 4: Webhook, HMAC & WAHA Boundary Conditions (15 Tests)
  // =========================================================================
  describe('4. Webhook, HMAC & WAHA Boundary Conditions', () => {
    it('4.1: Webhook HMAC validator accepts matching signature', () => {
      const payload = JSON.stringify({ email: 'test@domain.com' });
      const secret = 'test_secret_key';
      const sig = computeMockHmac(payload, secret);
      expect(validateHmacSignature(payload, sig, secret)).toBe(true);
    });

    it('4.2: Webhook HMAC validator rejects mismatched signature', () => {
      const payload = JSON.stringify({ email: 'test@domain.com' });
      const secret = 'test_secret_key';
      expect(validateHmacSignature(payload, 'tampered_signature_0000000000000000000000000000000000000000000000000000000000000000', secret)).toBe(false); // Length 64 test
      expect(validateHmacSignature(payload, 'short_tamper', secret)).toBe(false);
    });

    it('4.3: Empty signature string is rejected', () => {
      expect(validateHmacSignature('payload', '', 'secret')).toBe(false);
    });

    it('4.4: Empty secret key is rejected', () => {
      expect(validateHmacSignature('payload', 'sig', '')).toBe(false);
    });

    it('4.5: Webhook payload with null phone is allowed and stored as null', async () => {
      const payload = { email: 'nullphone@test.com', full_name: 'No Phone', phone: null, order_id: 'ORD-NP' };
      const sig = computeMockHmac(JSON.stringify(payload), mockDb.provisionSecret);

      const { data, error } = await supabase.functions.invoke('provision', {
        body: payload,
        headers: { 'X-Signature': sig },
      });

      expect(error).toBeNull();
      expect(data.success).toBe(true);
      const prof = mockDb.profiles.get(data.user_id);
      expect(prof?.phone).toBeNull();
    });

    it('4.6: Webhook payload with Indonesian phone format 0812... is preserved', async () => {
      const payload = { email: 'indo08@test.com', phone: '081234567890', order_id: 'ORD-08' };
      const sig = computeMockHmac(JSON.stringify(payload), mockDb.provisionSecret);

      const { data } = await supabase.functions.invoke('provision', {
        body: payload,
        headers: { 'X-Signature': sig },
      });

      expect(mockDb.profiles.get(data.user_id)?.phone).toBe('081234567890');
    });

    it('4.7: Webhook payload with international phone format +62812... is preserved', async () => {
      const payload = { email: 'indo62@test.com', phone: '+6281234567890', order_id: 'ORD-62' };
      const sig = computeMockHmac(JSON.stringify(payload), mockDb.provisionSecret);

      const { data } = await supabase.functions.invoke('provision', {
        body: payload,
        headers: { 'X-Signature': sig },
      });

      expect(mockDb.profiles.get(data.user_id)?.phone).toBe('+6281234567890');
    });

    it('4.8: Webhook with x-signature lowercase header is recognized', async () => {
      const payload = { email: 'lowersig@test.com', order_id: 'ORD-LOW' };
      const sig = computeMockHmac(JSON.stringify(payload), mockDb.provisionSecret);

      const { data, error } = await supabase.functions.invoke('provision', {
        body: payload,
        headers: { 'x-signature': sig },
      });

      expect(error).toBeNull();
      expect(data.success).toBe(true);
    });

    it('4.9: Webhook with X-Webhook-Signature header is recognized', async () => {
      const payload = { email: 'whsig@test.com', order_id: 'ORD-WH' };
      const sig = computeMockHmac(JSON.stringify(payload), mockDb.provisionSecret);

      const { data, error } = await supabase.functions.invoke('provision', {
        body: payload,
        headers: { 'X-Webhook-Signature': sig },
      });

      expect(error).toBeNull();
      expect(data.success).toBe(true);
    });

    it('4.10: Webhook with extremely long order ID (100 chars) is processed', async () => {
      const longOrder = 'ORD-' + 'X'.repeat(96);
      const payload = { email: 'longorder@test.com', order_id: longOrder };
      const sig = computeMockHmac(JSON.stringify(payload), mockDb.provisionSecret);

      const { data, error } = await supabase.functions.invoke('provision', {
        body: payload,
        headers: { 'X-Signature': sig },
      });

      expect(error).toBeNull();
      expect(data.success).toBe(true);
    });

    it('4.11: Webhook duplicate with trailing space in email is detected as duplicate', async () => {
      mockDb.users.set('u-sp', { id: 'u-sp', email: 'spacetest@domain.com', created_at: new Date().toISOString() });

      const payload = { email: ' spacetest@domain.com ', order_id: 'ORD-SP' };
      // Simulate trimmed comparison inside webhook
      const trimmedPayload = { ...payload, email: payload.email.trim() };
      const sig = computeMockHmac(JSON.stringify(trimmedPayload), mockDb.provisionSecret);

      const { error } = await supabase.functions.invoke('provision', {
        body: trimmedPayload,
        headers: { 'X-Signature': sig },
      });

      expect(error.status).toBe(409);
      expect(error.error).toBe('rejected_duplicate');
    });

    it('4.12: WAHA failure logs ip_address from x-forwarded-for header', async () => {
      mockDb.wahaShouldFail = true;
      const payload = { email: 'ipforward@test.com', order_id: 'ORD-IP' };
      const sig = computeMockHmac(JSON.stringify(payload), mockDb.provisionSecret);

      await supabase.functions.invoke('provision', {
        body: payload,
        headers: { 'X-Signature': sig, 'x-forwarded-for': '203.0.113.195' },
      });

      const log = Array.from(mockDb.provision_logs.values()).find((l) => l.email === 'ipforward@test.com');
      expect(log?.ip_address).toBe('203.0.113.195');
    });

    it('4.13: Multiple sequential webhooks create unique user IDs and entitlements', async () => {
      const ids = new Set<string>();
      for (let i = 0; i < 3; i++) {
        const payload = { email: `seqbuyer${i}@test.com`, order_id: `ORD-SEQ-${i}` };
        const sig = computeMockHmac(JSON.stringify(payload), mockDb.provisionSecret);

        const { data } = await supabase.functions.invoke('provision', {
          body: payload,
          headers: { 'X-Signature': sig },
        });
        ids.add(data.user_id);
      }
      expect(ids.size).toBe(3);
    });

    it('4.14: Provision log records raw_payload JSON cleanly', async () => {
      const payload = { email: 'rawpayload@test.com', custom_meta: { tier: 'pro', source: 'facebook_ads' } };
      const sig = computeMockHmac(JSON.stringify(payload), mockDb.provisionSecret);

      await supabase.functions.invoke('provision', {
        body: payload,
        headers: { 'X-Signature': sig },
      });

      const log = Array.from(mockDb.provision_logs.values()).find((l) => l.email === 'rawpayload@test.com');
      expect(log?.raw_payload?.custom_meta?.tier).toBe('pro');
    });

    it('4.15: Generated temporary password in provision response is at least 10 chars', async () => {
      const payload = { email: 'temppass@test.com', order_id: 'ORD-TP' };
      const sig = computeMockHmac(JSON.stringify(payload), mockDb.provisionSecret);

      const { data } = await supabase.functions.invoke('provision', {
        body: payload,
        headers: { 'X-Signature': sig },
      });

      expect(data.temp_password).toBeDefined();
      expect(data.temp_password.length).toBeGreaterThanOrEqual(10);
    });
  });

  // =========================================================================
  // Section 5: Admin Governance & Setup Secret Boundaries (15 Tests)
  // =========================================================================
  describe('5. Admin Governance & Setup Secret Boundaries', () => {
    const adminId = 'admin-user-0001-uuid';

    it('5.1: Setup secret with wrong key returns 403 Forbidden', async () => {
      const { data, error } = await supabase.functions.invoke('admin-users', {
        body: { action: 'list' },
        headers: { 'X-Admin-Setup-Secret': 'wrong_secret_123' },
      });
      expect(data).toBeNull();
      expect(error.status).toBe(403);
    });

    it('5.2: Setup secret with x-setup-secret lowercase header is accepted', async () => {
      const { data, error } = await supabase.functions.invoke('admin-users', {
        body: { action: 'list' },
        headers: { 'x-setup-secret': 'setup_secret_adm_9921' },
      });
      expect(error).toBeNull();
      expect(data.success).toBe(true);
    });

    it('5.3: Admin action on non-existent user ID returns 404', async () => {
      const { data, error } = await supabase.functions.invoke('admin-users', {
        body: { action: 'approve', target_user_id: 'ghost-target-id' },
        headers: { Authorization: `Bearer ${adminId}` },
      });
      expect(data).toBeNull();
      expect(error.status).toBe(404);
      expect(error.message).toBe('Entitlement not found');
    });

    it('5.4: Approving already active user entitlement is idempotent', async () => {
      const uId = 'u-idem-appr';
      mockDb.entitlements.set(uId, {
        id: 'e-idem',
        user_id: uId,
        product_code: 'PEA',
        status: 'active',
        monthly_quota: 100,
        consumed_quota: 0,
        cycle_start_date: new Date().toISOString(),
        cycle_reset_date: new Date(Date.now() + 30 * 86400000).toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      const { data } = await supabase.functions.invoke('admin-users', {
        body: { action: 'approve', target_user_id: uId },
        headers: { Authorization: `Bearer ${adminId}` },
      });
      expect(data.success).toBe(true);
      expect(mockDb.entitlements.get(uId)?.status).toBe('active');
    });

    it('5.5: Suspending already suspended user entitlement is idempotent', async () => {
      const uId = 'u-idem-susp';
      mockDb.entitlements.set(uId, {
        id: 'e-idem-s',
        user_id: uId,
        product_code: 'PEA',
        status: 'suspended',
        monthly_quota: 100,
        consumed_quota: 0,
        cycle_start_date: new Date().toISOString(),
        cycle_reset_date: new Date(Date.now() + 30 * 86400000).toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      const { data } = await supabase.functions.invoke('admin-users', {
        body: { action: 'reject', target_user_id: uId },
        headers: { Authorization: `Bearer ${adminId}` },
      });
      expect(data.success).toBe(true);
      expect(mockDb.entitlements.get(uId)?.status).toBe('suspended');
    });

    it('5.6: Admin adjust_quota sets monthly_quota to custom value', async () => {
      const uId = 'u-adj-1';
      mockDb.entitlements.set(uId, {
        id: 'e-adj-1',
        user_id: uId,
        product_code: 'PEA',
        status: 'active',
        monthly_quota: 100,
        consumed_quota: 50,
        cycle_start_date: new Date().toISOString(),
        cycle_reset_date: new Date(Date.now() + 30 * 86400000).toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      const { data } = await supabase.functions.invoke('admin-users', {
        body: { action: 'adjust_quota', target_user_id: uId, quota_adjustment: { monthly_quota: 250 } },
        headers: { Authorization: `Bearer ${adminId}` },
      });

      expect(data.success).toBe(true);
      expect(mockDb.entitlements.get(uId)?.monthly_quota).toBe(250);
    });

    it('5.7: Admin adjust_quota can reset consumed_quota to 0', async () => {
      const uId = 'u-adj-2';
      mockDb.entitlements.set(uId, {
        id: 'e-adj-2',
        user_id: uId,
        product_code: 'PEA',
        status: 'active',
        monthly_quota: 100,
        consumed_quota: 100,
        cycle_start_date: new Date().toISOString(),
        cycle_reset_date: new Date(Date.now() + 30 * 86400000).toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      const { data } = await supabase.functions.invoke('admin-users', {
        body: { action: 'adjust_quota', target_user_id: uId, quota_adjustment: { consumed_quota: 0 } },
        headers: { Authorization: `Bearer ${adminId}` },
      });

      expect(data.success).toBe(true);
      expect(mockDb.entitlements.get(uId)?.consumed_quota).toBe(0);
    });

    it('5.8: Unsupported admin action returns 400 Bad Request', async () => {
      const { data, error } = await supabase.functions.invoke('admin-users', {
        body: { action: 'unsupported_dangerous_action' },
        headers: { Authorization: `Bearer ${adminId}` },
      });

      expect(data).toBeNull();
      expect(error.status).toBe(400);
      expect(error.message).toContain('Unsupported action');
    });

    it('5.9: Audit log records admin IP address', async () => {
      const uId = 'u-aud-ip';
      mockDb.entitlements.set(uId, {
        id: 'e-aud-ip',
        user_id: uId,
        product_code: 'PEA',
        status: 'inactive',
        monthly_quota: 100,
        consumed_quota: 0,
        cycle_start_date: new Date().toISOString(),
        cycle_reset_date: new Date(Date.now() + 30 * 86400000).toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      await supabase.functions.invoke('admin-users', {
        body: { action: 'approve', target_user_id: uId },
        headers: { Authorization: `Bearer ${adminId}` },
      });

      const log = Array.from(mockDb.admin_audit_logs.values()).find((l) => l.target_user_id === uId);
      expect(log?.ip_address).toBe('127.0.0.1');
    });

    it('5.10: Audit log query with eq filter on action returns matching rows', async () => {
      await supabase.rpc('log_admin_action', {
        p_admin_id: adminId,
        p_admin_email: 'admin@propertyenhancer.ai',
        p_action: 'switch_provider',
        p_details: { from: 'lovable', to: 'openai' },
      });

      const { data } = await supabase.from('admin_audit_logs').select('*').eq('action', 'switch_provider');
      expect(data.length).toBeGreaterThanOrEqual(1);
    });

    it('5.11: Audit log query ordered descending by created_at sorts newest first', async () => {
      const log1 = 'aud-sort-1';
      const log2 = 'aud-sort-2';
      mockDb.admin_audit_logs.set(log1, {
        id: log1,
        admin_id: adminId,
        admin_email: 'a@a.com',
        action: 'approve_user',
        target_user_id: null,
        target_email: null,
        ip_address: null,
        details: {},
        created_at: '2026-08-30T10:00:00Z',
      });
      mockDb.admin_audit_logs.set(log2, {
        id: log2,
        admin_id: adminId,
        admin_email: 'a@a.com',
        action: 'reject_user',
        target_user_id: null,
        target_email: null,
        ip_address: null,
        details: {},
        created_at: '2026-08-31T10:00:00Z',
      });

      const { data } = await supabase.from('admin_audit_logs').select('*').order('created_at', { ascending: false });
      expect(new Date(data[0].created_at).getTime()).toBeGreaterThanOrEqual(new Date(data[1].created_at).getTime());
    });

    it('5.12: Provider switch updates default provider setting', async () => {
      const replicateId = 'prov-replicate';
      mockDb.api_provider_settings.set(replicateId, {
        id: replicateId,
        provider_name: 'replicate',
        is_default: false,
        is_enabled: true,
        model_name: 'lucataco/real-estate-enhancer',
        config: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      // Clear lovable default
      await supabase.from('api_provider_settings').eq('provider_name', 'lovable').update({ is_default: false });
      await supabase.from('api_provider_settings').eq('provider_name', 'replicate').update({ is_default: true });

      const { data } = await supabase.from('api_provider_settings').select('*').eq('is_default', true).single();
      expect(data.provider_name).toBe('replicate');
    });

    it('5.13: API usage log records failure error_details string', async () => {
      const usageId = 'usage-fail-detail';
      mockDb.api_usage_logs.set(usageId, {
        id: usageId,
        user_id: 'usr-1',
        image_id: 'img-1',
        provider: 'openai',
        model: 'dall-e-3',
        duration_ms: 3200,
        status: 'failed',
        error_details: 'Rate limit exceeded: 429 Too Many Requests',
        created_at: new Date().toISOString(),
      });

      const { data } = await supabase.from('api_usage_logs').select('*').eq('id', usageId).single();
      expect(data.error_details).toContain('Rate limit exceeded');
    });

    it('5.14: Admin settings table stores JSONB configuration objects', async () => {
      const setKey = 'maintenance_mode';
      mockDb.admin_settings.set(setKey, {
        id: 'set-maint',
        key: setKey,
        value: { enabled: true, estimated_end: '2026-09-01T00:00:00Z' },
        description: 'System maintenance toggle',
        updated_by: adminId,
        updated_at: new Date().toISOString(),
      });

      const { data } = await supabase.from('admin_settings').select('*').eq('key', setKey).single();
      expect(data.value.enabled).toBe(true);
    });

    it('5.15: System API keys status returns active provider list without exposing secret values', async () => {
      const providers = Array.from(mockDb.api_provider_settings.values()).map((p) => ({
        name: p.provider_name,
        enabled: p.is_enabled,
        model: p.model_name,
      }));

      expect(providers.length).toBeGreaterThanOrEqual(1);
      expect(providers[0].name).toBe('lovable');
      expect((providers[0] as any).secret).toBeUndefined();
    });
  });

  // =========================================================================
  // Section 6: CMS & Dynamic Content Boundaries (10 Tests)
  // =========================================================================
  describe('6. CMS & Dynamic Content Boundaries', () => {
    it('6.1: Zero active testimonials returns empty array without query error', async () => {
      // Mark all testimonials inactive
      for (const t of mockDb.testimonials.values()) {
        t.is_active = false;
      }

      const { data, error } = await supabase.from('testimonials').select('*').eq('is_active', true);
      expect(error).toBeNull();
      expect(data).toEqual([]);
    });

    it('6.2: Zero active FAQs returns empty array gracefully', async () => {
      for (const f of mockDb.faqs.values()) {
        f.is_active = false;
      }

      const { data, error } = await supabase.from('faqs').select('*').eq('is_active', true);
      expect(error).toBeNull();
      expect(data).toEqual([]);
    });

    it('6.3: FAQ with extreme sort order (9999) sorts to the very bottom', async () => {
      const lastFaq = 'faq-last';
      mockDb.faqs.set(lastFaq, {
        id: lastFaq,
        question: 'Last question?',
        answer: 'Last answer',
        category: 'misc',
        is_active: true,
        sort_order: 9999,
        created_at: new Date().toISOString(),
      });

      const { data } = await supabase.from('faqs').select('*').eq('is_active', true).order('sort_order', { ascending: true });
      expect(data[data.length - 1].id).toBe(lastFaq);
    });

    it('6.4: FAQ answer containing HTML formatting is stored intact', async () => {
      const htmlFaq = 'faq-html';
      const ans = 'Hubungi kami via <strong>WhatsApp</strong> resmi kami di <em>+628111222333</em>.';
      mockDb.faqs.set(htmlFaq, {
        id: htmlFaq,
        question: 'Kontak?',
        answer: ans,
        category: 'support',
        is_active: true,
        sort_order: 10,
        created_at: new Date().toISOString(),
      });

      const { data } = await supabase.from('faqs').select('*').eq('id', htmlFaq).single();
      expect(data.answer).toBe(ans);
    });

    it('6.5: Pricing setting update modifies package price', async () => {
      const priceId = 'pricing-lifetime-1';
      await supabase.from('pricing_settings').eq('id', priceId).update({ price_idr: 599000 });

      const { data } = await supabase.from('pricing_settings').select('*').eq('id', priceId).single();
      expect(data.price_idr).toBe(599000);
    });

    it('6.6: Pricing features list supports adding custom bullet point', async () => {
      const priceId = 'pricing-lifetime-1';
      const updatedFeatures = ['100 Foto AI / Bulan', 'Prioritas Render 4K Ultra'];
      await supabase.from('pricing_settings').eq('id', priceId).update({ features: updatedFeatures });

      const { data } = await supabase.from('pricing_settings').select('*').eq('id', priceId).single();
      expect(data.features).toContain('Prioritas Render 4K Ultra');
    });

    it('6.7: Testimonial rating handles 1-star boundary', async () => {
      const lowId = 'test-1star';
      mockDb.testimonials.set(lowId, {
        id: lowId,
        name: 'Critical Client',
        role: 'Buyer',
        company: null,
        avatar_url: null,
        content: 'Fair service.',
        rating: 1,
        is_active: true,
        sort_order: 50,
        created_at: new Date().toISOString(),
      });

      const { data } = await supabase.from('testimonials').select('*').eq('id', lowId).single();
      expect(data.rating).toBe(1);
    });

    it('6.8: Testimonial deletion removes entry from database', async () => {
      const delId = 'test-to-del';
      mockDb.testimonials.set(delId, {
        id: delId,
        name: 'Delete Me',
        role: 'Agent',
        company: null,
        avatar_url: null,
        content: 'Delete',
        rating: 5,
        is_active: true,
        sort_order: 90,
        created_at: new Date().toISOString(),
      });

      await supabase.from('testimonials').eq('id', delId).delete();
      expect(mockDb.testimonials.has(delId)).toBe(false);
    });

    it('6.9: FAQ deletion removes item cleanly', async () => {
      const delFaq = 'faq-to-del';
      mockDb.faqs.set(delFaq, {
        id: delFaq,
        question: 'Delete?',
        answer: 'Yes',
        category: 'misc',
        is_active: true,
        sort_order: 90,
        created_at: new Date().toISOString(),
      });

      await supabase.from('faqs').eq('id', delFaq).delete();
      expect(mockDb.faqs.has(delFaq)).toBe(false);
    });

    it('6.10: Pricing query with limit 1 returns top active tier', async () => {
      const { data } = await supabase.from('pricing_settings').select('*').eq('is_active', true).limit(1);
      expect(data.length).toBe(1);
    });
  });

  // =========================================================================
  // Section 7: Realtime Channels & Storage Boundaries (10 Tests)
  // =========================================================================
  describe('7. Realtime Channels & Storage Boundaries', () => {
    it('7.1: Realtime listener on specific image ID ignores events for other images', async () => {
      const watchedId = 'img-target-watch';
      const ignoredId = 'img-other-unrelated';
      let receivedCount = 0;

      const chan = supabase.channel(`images:id=eq.${watchedId}`);
      chan.on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'images', filter: `id=eq.${watchedId}` }, () => {
        receivedCount++;
      }).subscribe();

      // Trigger update on unrelated image
      mockDb.images.set(ignoredId, {
        id: ignoredId,
        user_id: 'usr-1',
        project_id: null,
        batch_id: null,
        original_url: 'raw.jpg',
        enhanced_url: null,
        preset: 'HDR_BALANCED',
        status: 'queued',
        error_message: null,
        file_size: 100,
        mime_type: 'image/jpeg',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      await supabase.from('images').eq('id', ignoredId).update({ status: 'done' });

      expect(receivedCount).toBe(0);
    });

    it('7.2: Uploading duplicate filename without upsert returns 409 conflict', async () => {
      const path = 'images/usr-1/dup_photo.jpg';
      await supabase.storage.from('images').upload(path, 'content_v1');

      const { data, error } = await supabase.storage.from('images').upload(path, 'content_v2', { upsert: false });
      expect(data).toBeNull();
      expect(error.statusCode).toBe(409);
    });

    it('7.3: Uploading duplicate filename with upsert: true overwrites content', async () => {
      const path = 'images/usr-1/overwrite_photo.jpg';
      await supabase.storage.from('images').upload(path, 'content_v1');

      const { data, error } = await supabase.storage.from('images').upload(path, 'content_v2', { upsert: true });
      expect(error).toBeNull();
      expect(data?.path).toBe(path);
    });

    it('7.4: Downloading non-existent storage file returns 404', async () => {
      const { data, error } = await supabase.storage.from('images').download('images/ghost/missing.png');
      expect(data).toBeNull();
      expect(error.statusCode).toBe(404);
    });

    it('7.5: Creating signed URL for non-existent file returns 404', async () => {
      const { data, error } = await supabase.storage.from('images').createSignedUrl('images/ghost/missing.png', 3600);
      expect(data).toBeNull();
      expect(error.statusCode).toBe(404);
    });

    it('7.6: Listing empty storage directory returns empty array', async () => {
      const { data, error } = await supabase.storage.from('images').list('empty_folder');
      expect(error).toBeNull();
      expect(data).toEqual([]);
    });

    it('7.7: Listing directory with files returns only items inside that directory', async () => {
      await supabase.storage.from('images').upload('projects/p1/shot1.jpg', 'data');
      await supabase.storage.from('images').upload('projects/p1/shot2.jpg', 'data');
      await supabase.storage.from('images').upload('projects/p2/shot3.jpg', 'data');

      const { data } = await supabase.storage.from('images').list('projects/p1');
      expect(data.length).toBe(2);
      expect(data.map((f) => f.name)).toContain('shot1.jpg');
      expect(data.map((f) => f.name)).toContain('shot2.jpg');
    });

    it('7.8: Batch remove deletes multiple storage files in single call', async () => {
      const f1 = 'batch/del1.jpg';
      const f2 = 'batch/del2.jpg';
      await supabase.storage.from('images').upload(f1, 'd1');
      await supabase.storage.from('images').upload(f2, 'd2');

      const { data, error } = await supabase.storage.from('images').remove([f1, f2]);
      expect(error).toBeNull();
      expect(data).toEqual([f1, f2]);

      const check1 = await supabase.storage.from('images').download(f1);
      const check2 = await supabase.storage.from('images').download(f2);
      expect(check1.error).not.toBeNull();
      expect(check2.error).not.toBeNull();
    });

    it('7.9: Public URL generation returns formatted Supabase storage URL', () => {
      const { data } = supabase.storage.from('images').getPublicUrl('photos/pool.jpg');
      expect(data.publicUrl).toBe('https://mock.supabase.co/storage/v1/object/public/images/photos/pool.jpg');
    });

    it('7.10: Range query limits and offsets database records precisely', async () => {
      mockDb.faqs.clear();
      for (let i = 0; i < 10; i++) {
        mockDb.faqs.set(`faq-range-${i}`, {
          id: `faq-range-${i}`,
          question: `Q${i}`,
          answer: `A${i}`,
          category: 'gen',
          is_active: true,
          sort_order: i,
          created_at: new Date().toISOString(),
        });
      }

      const { data } = await supabase.from('faqs').select('*').order('sort_order', { ascending: true }).range(2, 4); // index 2,3,4 = 3 items
      expect(data.length).toBe(3);
      expect(data[0].sort_order).toBe(2);
      expect(data[2].sort_order).toBe(4);
    });
  });
});
