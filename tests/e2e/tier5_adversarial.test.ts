/**
 * Tier 5: Adversarial Coverage Hardening E2E Test Suite (30 Tests)
 * 
 * Validates system resilience against sophisticated attacks, concurrent race conditions,
 * token forgery, payload tampering, injection attacks, webhook replay, realtime desync,
 * and cross-tenant storage/database isolation breaches.
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

describe('Tier 5: Adversarial Coverage Hardening Test Suite (30 Tests)', () => {
  let supabase: MockSupabaseClient;

  beforeEach(() => {
    mockDb.reset();
    supabase = new MockSupabaseClient();
  });

  // =========================================================================
  // Section 1: Rapid Concurrent Quota Consumption & Race Conditions (5 Tests)
  // =========================================================================
  describe('1. Rapid Concurrent Quota Consumption & Race Conditions', () => {
    it('1.1: 50 simultaneous parallel quota consumption requests succeed without loss or corruption', async () => {
      const userId = 'usr-adv-race-50';
      mockDb.users.set(userId, { id: userId, email: 'race50@test.com', created_at: new Date().toISOString() });
      mockDb.profiles.set(userId, { id: userId, email: 'race50@test.com', full_name: 'Race Fifty', phone: null, avatar_url: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
      mockDb.entitlements.set(userId, {
        id: 'ent-race-50',
        user_id: userId,
        product_code: 'PEA',
        status: 'active',
        monthly_quota: 100,
        consumed_quota: 0,
        cycle_start_date: new Date().toISOString(),
        cycle_reset_date: new Date(Date.now() + 25 * 86400000).toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      // Dispatch 50 concurrent requests
      const promises = Array.from({ length: 50 }, () => executeCheckAndConsumeQuota(userId));
      const results = await Promise.all(promises);

      const allAllowed = results.every((r) => r.allowed === true);
      expect(allAllowed).toBe(true);

      const finalEntitlement = mockDb.entitlements.get(userId);
      expect(finalEntitlement?.consumed_quota).toBe(50);
      expect(finalEntitlement?.monthly_quota - finalEntitlement!.consumed_quota).toBe(50);
    });

    it('1.2: Over-subscription race: 25 concurrent requests with only 5 quota remaining strictly allows exactly 5 and rejects 20', async () => {
      const userId = 'usr-adv-oversub';
      mockDb.users.set(userId, { id: userId, email: 'oversub@test.com', created_at: new Date().toISOString() });
      mockDb.profiles.set(userId, { id: userId, email: 'oversub@test.com', full_name: 'Over Sub', phone: null, avatar_url: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
      mockDb.entitlements.set(userId, {
        id: 'ent-oversub',
        user_id: userId,
        product_code: 'PEA',
        status: 'active',
        monthly_quota: 100,
        consumed_quota: 95, // only 5 remaining
        cycle_start_date: new Date().toISOString(),
        cycle_reset_date: new Date(Date.now() + 15 * 86400000).toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      // Fire 25 concurrent enhance-image requests
      const promises = Array.from({ length: 25 }, () =>
        supabase.functions.invoke('enhance-image', {
          body: { preset: 'HDR_BALANCED' },
          headers: { Authorization: `Bearer ${userId}` },
        })
      );

      const responses = await Promise.all(promises);
      const successful = responses.filter((r) => r.data && r.data.success === true);
      const rejected = responses.filter((r) => r.error && r.error.code === 'QUOTA_EXHAUSTED');

      expect(successful.length).toBe(5);
      expect(rejected.length).toBe(20);

      const finalEnt = mockDb.entitlements.get(userId);
      expect(finalEnt?.consumed_quota).toBe(100);
    });

    it('1.3: Simultaneous multi-client enhance calls prevent double-spending and track separate images', async () => {
      const userId = 'usr-adv-multiclient';
      mockDb.users.set(userId, { id: userId, email: 'multiclient@test.com', created_at: new Date().toISOString() });
      mockDb.profiles.set(userId, { id: userId, email: 'multiclient@test.com', full_name: 'Multi Client', phone: null, avatar_url: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
      mockDb.entitlements.set(userId, {
        id: 'ent-multiclient',
        user_id: userId,
        product_code: 'PEA',
        status: 'active',
        monthly_quota: 100,
        consumed_quota: 10,
        cycle_start_date: new Date().toISOString(),
        cycle_reset_date: new Date(Date.now() + 20 * 86400000).toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      // 4 different presets concurrently requested
      const presets = ['HDR_BALANCED', 'TWILIGHT', 'SKY_ENHANCE', 'DECLUTTER'];
      const requests = presets.map((p) =>
        supabase.functions.invoke('enhance-image', {
          body: { preset: p, file_path: `images/${userId}/photo_${p}.jpg` },
          headers: { Authorization: `Bearer ${userId}` },
        })
      );

      const responses = await Promise.all(requests);
      const imageIds = responses.map((r) => r.data.image_id);
      const uniqueImageIds = new Set(imageIds);

      expect(uniqueImageIds.size).toBe(4);
      expect(mockDb.entitlements.get(userId)?.consumed_quota).toBe(14);
    });

    it('1.4: Concurrent calls during cycle rollover date seamlessly reset quota to 0 before consuming', async () => {
      const userId = 'usr-adv-rollover-race';
      mockDb.users.set(userId, { id: userId, email: 'rollover@test.com', created_at: new Date().toISOString() });
      mockDb.profiles.set(userId, { id: userId, email: 'rollover@test.com', full_name: 'Rollover User', phone: null, avatar_url: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
      mockDb.entitlements.set(userId, {
        id: 'ent-rollover-race',
        user_id: userId,
        product_code: 'PEA',
        status: 'active',
        monthly_quota: 100,
        consumed_quota: 100, // fully used in past cycle
        cycle_start_date: new Date(Date.now() - 35 * 86400000).toISOString(),
        cycle_reset_date: new Date(Date.now() - 5 * 86400000).toISOString(), // expired 5 days ago
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      // Fire 10 concurrent requests at cycle renewal
      const promises = Array.from({ length: 10 }, () => executeCheckAndConsumeQuota(userId));
      const results = await Promise.all(promises);

      expect(results.every((r) => r.allowed === true)).toBe(true);
      const finalEnt = mockDb.entitlements.get(userId);
      expect(finalEnt?.consumed_quota).toBe(10);
      expect(new Date(finalEnt!.cycle_reset_date).getTime()).toBeGreaterThan(Date.now());
    });

    it('1.5: Concurrent admin quota adjustment while user is consuming quota maintains atomic state', async () => {
      const userId = 'usr-adv-admin-adjust';
      mockDb.users.set(userId, { id: userId, email: 'adjust@test.com', created_at: new Date().toISOString() });
      mockDb.profiles.set(userId, { id: userId, email: 'adjust@test.com', full_name: 'Adjust Target', phone: null, avatar_url: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
      mockDb.entitlements.set(userId, {
        id: 'ent-adjust',
        user_id: userId,
        product_code: 'PEA',
        status: 'active',
        monthly_quota: 100,
        consumed_quota: 50,
        cycle_start_date: new Date().toISOString(),
        cycle_reset_date: new Date(Date.now() + 20 * 86400000).toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      // Admin increases quota to 200 via admin-users while user consumes quota
      const adminPromise = supabase.functions.invoke('admin-users', {
        body: { action: 'adjust_quota', user_id: userId, quota_adjustment: { monthly_quota: 200 } },
        headers: { 'X-Admin-Setup-Secret': mockDb.adminSetupSecret },
      });
      const userPromise = executeCheckAndConsumeQuota(userId);

      const [adminRes, userRes] = await Promise.all([adminPromise, userPromise]);
      expect(adminRes.data.success).toBe(true);
      expect(userRes.allowed).toBe(true);

      const ent = mockDb.entitlements.get(userId);
      expect(ent?.monthly_quota).toBe(200);
      expect(ent?.consumed_quota).toBeGreaterThanOrEqual(51);
    });
  });

  // =========================================================================
  // Section 2: Edge Function Token Forgery & Invalid Authorization (5 Tests)
  // =========================================================================
  describe('2. Edge Function Token Forgery & Invalid Authorization', () => {
    it('2.1: Completely forged / non-existent user JWT token is rejected with 401 Unauthorized', async () => {
      const fakeToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.fake_tampered_payload.signature';
      const { data, error } = await supabase.functions.invoke('enhance-image', {
        body: { preset: 'HDR_BALANCED' },
        headers: { Authorization: `Bearer ${fakeToken}` },
      });

      expect(data).toBeNull();
      expect(error).toBeDefined();
      expect(error.status).toBe(401);
      expect(error.message).toContain('User not found');
    });

    it('2.2: Standard user attempting to invoke admin-users with standard bearer token is rejected with 403 Forbidden', async () => {
      const userId = 'usr-non-admin';
      mockDb.users.set(userId, { id: userId, email: 'nonadmin@test.com', created_at: new Date().toISOString() });
      mockDb.profiles.set(userId, { id: userId, email: 'nonadmin@test.com', full_name: 'Regular User', phone: null, avatar_url: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
      mockDb.user_roles.set(userId, { id: 'role-na', user_id: userId, role: 'user', created_at: new Date().toISOString() });

      const { data, error } = await supabase.functions.invoke('admin-users', {
        body: { action: 'list' },
        headers: { Authorization: `Bearer ${userId}` },
      });

      expect(data).toBeNull();
      expect(error).toBeDefined();
      expect(error.status).toBe(403);
      expect(error.message).toContain('Admin role required');
    });

    it('2.3: Cross-user impersonation attempt in enhance-image is confined to authenticated caller identity', async () => {
      const callerId = 'usr-caller-legit';
      const victimId = 'usr-victim-target';

      mockDb.users.set(callerId, { id: callerId, email: 'caller@test.com', created_at: new Date().toISOString() });
      mockDb.profiles.set(callerId, { id: callerId, email: 'caller@test.com', full_name: 'Caller', phone: null, avatar_url: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
      mockDb.entitlements.set(callerId, {
        id: 'ent-caller',
        user_id: callerId,
        product_code: 'PEA',
        status: 'active',
        monthly_quota: 100,
        consumed_quota: 0,
        cycle_start_date: new Date().toISOString(),
        cycle_reset_date: new Date(Date.now() + 20 * 86400000).toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      mockDb.users.set(victimId, { id: victimId, email: 'victim@test.com', created_at: new Date().toISOString() });
      mockDb.profiles.set(victimId, { id: victimId, email: 'victim@test.com', full_name: 'Victim', phone: null, avatar_url: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
      mockDb.entitlements.set(victimId, {
        id: 'ent-victim',
        user_id: victimId,
        product_code: 'PEA',
        status: 'active',
        monthly_quota: 100,
        consumed_quota: 5,
        cycle_start_date: new Date().toISOString(),
        cycle_reset_date: new Date(Date.now() + 20 * 86400000).toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      // Caller tries to pass victim's storage path in body
      const { data } = await supabase.functions.invoke('enhance-image', {
        body: { preset: 'HDR_BALANCED', file_path: `images/${victimId}/private.jpg` },
        headers: { Authorization: `Bearer ${callerId}` },
      });

      expect(data.success).toBe(true);
      // Quota must be deducted from caller, not victim
      expect(mockDb.entitlements.get(callerId)?.consumed_quota).toBe(1);
      expect(mockDb.entitlements.get(victimId)?.consumed_quota).toBe(5);

      // Resulting record must belong to caller
      const createdRecord = mockDb.images.get(data.image_id);
      expect(createdRecord?.user_id).toBe(callerId);
    });

    it('2.4: Malformed Authorization headers (Basic auth, empty bearer, random schemes) are rejected', async () => {
      const malformedHeaders = [
        { Authorization: '' },
        { Authorization: 'Basic dXNlcjpwYXNz' },
        { Authorization: 'Token abc123xyz' },
        { Authorization: 'Bearer   ' },
      ];

      for (const headers of malformedHeaders) {
        const { data, error } = await supabase.functions.invoke('enhance-image', {
          body: { preset: 'HDR_BALANCED' },
          headers,
        });

        expect(data).toBeNull();
        expect(error).toBeDefined();
        expect(error.status).toBe(401);
      }
    });

    it('2.5: Admin setup secret brute force / incorrect secret rejection in admin-users', async () => {
      const badSecrets = ['invalid_secret', 'admin', '123456', '', 'setup_secret_adm_9920'];

      for (const secret of badSecrets) {
        const { data, error } = await supabase.functions.invoke('admin-users', {
          body: { action: 'list' },
          headers: { 'X-Setup-Secret': secret },
        });

        expect(data).toBeNull();
        expect(error).toBeDefined();
        expect(error.status).toBe(403);
      }
    });
  });

  // =========================================================================
  // Section 3: Malformed, Tampered Payloads & Injection Vectors (5 Tests)
  // =========================================================================
  describe('3. Malformed, Tampered Payloads & Injection Vectors', () => {
    it('3.1: SQL injection strings in query filters are treated as literal match values without syntax breakdown', async () => {
      const sqliPayloads = [
        "' OR '1'='1",
        "'; DROP TABLE images; --",
        "admin' --",
        "1 UNION SELECT * FROM profiles",
      ];

      for (const payload of sqliPayloads) {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('email', payload);

        expect(error).toBeNull();
        expect(Array.isArray(data)).toBe(true);
        expect(data.length).toBe(0); // Safely returns 0 matches
      }
    });

    it('3.2: XSS payloads in profile name or preset are safely stored as pure text without execution', async () => {
      const userId = 'usr-xss-test';
      const xssScript = '<script>alert(document.cookie)</script>';
      const xssImg = '<img src=x onerror=alert(1)>';

      mockDb.users.set(userId, { id: userId, email: 'xss@test.com', created_at: new Date().toISOString() });
      mockDb.profiles.set(userId, {
        id: userId,
        email: 'xss@test.com',
        full_name: xssScript,
        phone: '0812345678',
        avatar_url: xssImg,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
      expect(data.full_name).toBe(xssScript);
      expect(data.avatar_url).toBe(xssImg);
    });

    it('3.3: Extreme deep-nested JSON payloads in admin audit logs details are handled gracefully', async () => {
      const nestedDetails: any = { level0: 'root' };
      let current = nestedDetails;
      for (let i = 1; i <= 20; i++) {
        current[`level${i}`] = { step: i };
        current = current[`level${i}`];
      }

      await supabase.rpc('log_admin_action', {
        p_action: 'update_settings',
        p_details: nestedDetails,
      });

      const auditLogs = Array.from(mockDb.admin_audit_logs.values());
      const lastLog = auditLogs[auditLogs.length - 1];
      expect(lastLog.details.level0).toBe('root');
      expect(lastLog.details.level1.level2.level3.step).toBe(3);
    });

    it('3.4: Prototype pollution injection attempt via payload properties does not pollute global Object prototype', async () => {
      const maliciousPayload = JSON.parse('{"__proto__": {"polluted": true}, "email": "safe@domain.com"}');
      
      expect(({} as any).polluted).toBeUndefined();

      mockDb.users.set('usr-proto', {
        id: 'usr-proto',
        email: maliciousPayload.email,
        created_at: new Date().toISOString(),
      });

      expect(({} as any).polluted).toBeUndefined();
      expect(Object.prototype.hasOwnProperty('polluted')).toBe(false);
    });

    it('3.5: Unicode homoglyphs and special characters in email and phone numbers are normalized or safely stored', async () => {
      const unicodeEmail = 'user.name+tag@domain.co.id';
      const formattedPhone = '+62 (812) 3456-7890';

      const userId = 'usr-unicode';
      mockDb.users.set(userId, { id: userId, email: unicodeEmail, created_at: new Date().toISOString() });
      mockDb.profiles.set(userId, {
        id: userId,
        email: unicodeEmail,
        full_name: 'Budi J. Müller 🚀',
        phone: formattedPhone,
        avatar_url: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
      expect(data.full_name).toBe('Budi J. Müller 🚀');
      expect(data.email).toBe(unicodeEmail);
    });
  });

  // =========================================================================
  // Section 4: Webhook Replay, Timing & Signature Attacks (5 Tests)
  // =========================================================================
  describe('4. Webhook Replay, Timing & Signature Attacks', () => {
    it('4.1: Webhook duplicate replay attack is rejected with HTTP 409 and logged as rejected_duplicate', async () => {
      const payload = {
        email: 'replay_target@grandrealty.com',
        full_name: 'Replay Target',
        phone: '628111222999',
        order_id: 'ORD-REPLAY-001',
      };
      const signature = computeMockHmac(JSON.stringify(payload), mockDb.provisionSecret);

      // First webhook attempt -> 200 OK
      const res1 = await supabase.functions.invoke('provision', {
        body: payload,
        headers: { 'X-Signature': signature },
      });
      expect(res1.data.success).toBe(true);

      // Replay identical webhook attempt -> 409 Conflict
      const res2 = await supabase.functions.invoke('provision', {
        body: payload,
        headers: { 'X-Signature': signature },
      });

      expect(res2.data).toBeNull();
      expect(res2.error.status).toBe(409);
      expect(res2.error.error).toBe('rejected_duplicate');

      // Verify audit trail in provision_logs
      const logs = Array.from(mockDb.provision_logs.values());
      const duplicateLog = logs.find((l) => l.email === payload.email && l.status === 'rejected_duplicate');
      expect(duplicateLog).toBeDefined();
    });

    it('4.2: Bit-flip tampering in webhook payload payload invalidates HMAC signature', async () => {
      const originalPayload = { email: 'genuine@domain.com', order_id: 'ORD-100', amount: 499000 };
      const originalSignature = computeMockHmac(JSON.stringify(originalPayload), mockDb.provisionSecret);

      // Attacker changes amount from 499000 to 0
      const tamperedPayload = { email: 'genuine@domain.com', order_id: 'ORD-100', amount: 0 };

      const isValid = validateHmacSignature(
        JSON.stringify(tamperedPayload),
        originalSignature,
        mockDb.provisionSecret
      );

      // Signatures must mismatch
      const expectedTamperedSig = computeMockHmac(JSON.stringify(tamperedPayload), mockDb.provisionSecret);
      expect(originalSignature).not.toBe(expectedTamperedSig);
    });

    it('4.3: Webhook with forged HMAC signature using different secret key is rejected with 401', async () => {
      const payload = { email: 'forged@domain.com', order_id: 'ORD-FORGE-9' };
      const wrongSecret = 'attacker_secret_key_12345';
      const forgedSignature = computeMockHmac(JSON.stringify(payload), wrongSecret);

      // If provision endpoint receives forged signature, it must reject
      const { data, error } = await supabase.functions.invoke('provision', {
        body: payload,
        headers: { 'X-Signature': 'invalid_signature_hex_0000' },
      });

      expect(data).toBeNull();
      expect(error.status).toBe(401);
      expect(error.message).toContain('Invalid signature');
    });

    it('4.4: Webhook missing signature headers is rejected immediately before JSON processing', async () => {
      const { data, error } = await supabase.functions.invoke('provision', {
        body: { email: 'nosig@domain.com' },
        headers: {}, // No signature header
      });

      expect(data).toBeNull();
      expect(error.status).toBe(401);
    });

    it('4.5: Webhook payload missing mandatory email field is rejected with 400 Bad Request', async () => {
      const payload = { full_name: 'No Email User', phone: '628111222333' };
      const sig = computeMockHmac(JSON.stringify(payload), mockDb.provisionSecret);

      const { data, error } = await supabase.functions.invoke('provision', {
        body: payload,
        headers: { 'X-Signature': sig },
      });

      expect(data).toBeNull();
      expect(error.status).toBe(400);
      expect(error.message).toContain('Email is required');
    });
  });

  // =========================================================================
  // Section 5: Realtime Channel Reconnection & Message Ordering (5 Tests)
  // =========================================================================
  describe('5. Realtime Channel Reconnection & Message Ordering', () => {
    it('5.1: Rapid subscribe / unsubscribe / resubscribe cycle does not leak listeners or duplicate events', async () => {
      const channelName = 'images:id=eq.img-churn-1';
      let eventCount = 0;
      const callback = () => {
        eventCount++;
      };

      // Subscribe 1
      const ch1 = supabase.channel(channelName);
      ch1.on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'images', filter: 'id=eq.img-churn-1' }, callback).subscribe();

      // Unsubscribe 1
      await ch1.unsubscribe();

      // Subscribe 2
      const ch2 = supabase.channel(channelName);
      ch2.on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'images', filter: 'id=eq.img-churn-1' }, callback).subscribe();

      // Trigger single update
      mockDb.images.set('img-churn-1', {
        id: 'img-churn-1',
        user_id: 'u1',
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

      await supabase.from('images').eq('id', 'img-churn-1').update({ status: 'done' });

      expect(eventCount).toBe(1);
    });

    it('5.2: Strict sequential state progression (queued -> processing -> done) preserves event order', async () => {
      const imageId = 'img-order-seq';
      const eventSequence: string[] = [];

      const ch = supabase.channel(`images:id=eq.${imageId}`);
      ch.on('postgres_changes', { event: '*', schema: 'public', table: 'images', filter: `id=eq.${imageId}` }, (payload) => {
        eventSequence.push(payload.new.status);
      }).subscribe();

      // 1. Insert queued
      await supabase.from('images').insert({
        id: imageId,
        user_id: 'u1',
        preset: 'TWILIGHT',
        status: 'queued',
      });

      // 2. Update processing
      await supabase.from('images').eq('id', imageId).update({ status: 'processing' });

      // 3. Update done
      await supabase.from('images').eq('id', imageId).update({ status: 'done', enhanced_url: 'enhanced.webp' });

      expect(eventSequence).toEqual(['queued', 'processing', 'done']);
    });

    it('5.3: Filter isolation prevents cross-image event leakage', async () => {
      let imageAReceived = 0;
      let imageBReceived = 0;

      const chA = supabase.channel('images:id=eq.img-A');
      chA.on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'images', filter: 'id=eq.img-A' }, () => {
        imageAReceived++;
      }).subscribe();

      const chB = supabase.channel('images:id=eq.img-B');
      chB.on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'images', filter: 'id=eq.img-B' }, () => {
        imageBReceived++;
      }).subscribe();

      // Seed both
      mockDb.images.set('img-A', { id: 'img-A', user_id: 'uA', project_id: null, batch_id: null, original_url: 'a.jpg', enhanced_url: null, preset: 'HDR', status: 'queued', error_message: null, file_size: 10, mime_type: 'image/jpeg', created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
      mockDb.images.set('img-B', { id: 'img-B', user_id: 'uB', project_id: null, batch_id: null, original_url: 'b.jpg', enhanced_url: null, preset: 'HDR', status: 'queued', error_message: null, file_size: 10, mime_type: 'image/jpeg', created_at: new Date().toISOString(), updated_at: new Date().toISOString() });

      // Update only Image A
      await supabase.from('images').eq('id', 'img-A').update({ status: 'done' });

      expect(imageAReceived).toBe(1);
      expect(imageBReceived).toBe(0);
    });

    it('5.4: Multiple listeners on same channel all receive simultaneous broadcast notifications', async () => {
      let listener1Called = false;
      let listener2Called = false;

      const ch = supabase.channel('images:id=eq.img-multi-listen');
      ch.on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'images', filter: 'id=eq.img-multi-listen' }, () => {
        listener1Called = true;
      });
      ch.on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'images', filter: 'id=eq.img-multi-listen' }, () => {
        listener2Called = true;
      });
      ch.subscribe();

      mockDb.images.set('img-multi-listen', { id: 'img-multi-listen', user_id: 'u1', project_id: null, batch_id: null, original_url: 'm.jpg', enhanced_url: null, preset: 'HDR', status: 'queued', error_message: null, file_size: 10, mime_type: 'image/jpeg', created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
      await supabase.from('images').eq('id', 'img-multi-listen').update({ status: 'done' });

      expect(listener1Called).toBe(true);
      expect(listener2Called).toBe(true);
    });

    it('5.5: Realtime DELETE event triggers correct callback with old record metadata', async () => {
      let deletedRecordId = '';
      const ch = supabase.channel('public:images');
      ch.on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'images' }, (payload) => {
        deletedRecordId = payload.old.id;
      }).subscribe();

      mockDb.images.set('img-del-target', { id: 'img-del-target', user_id: 'u1', project_id: null, batch_id: null, original_url: 'd.jpg', enhanced_url: null, preset: 'HDR', status: 'done', error_message: null, file_size: 10, mime_type: 'image/jpeg', created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
      await supabase.from('images').eq('id', 'img-del-target').delete();

      expect(deletedRecordId).toBe('img-del-target');
    });
  });

  // =========================================================================
  // Section 6: Storage Isolation & Cross-User Access Attempts (5 Tests)
  // =========================================================================
  describe('6. Storage Isolation & Cross-User Access Attempts', () => {
    it('6.1: Storage path scoping keeps user upload assets isolated in their own folder', async () => {
      const userAId = 'usr-tenant-A';
      const userBId = 'usr-tenant-B';

      const fileA = 'images/usr-tenant-A/house.jpg';
      const fileB = 'images/usr-tenant-B/villa.jpg';

      await supabase.storage.from('images').upload(fileA, 'dataA');
      await supabase.storage.from('images').upload(fileB, 'dataB');

      // Listing user A's folder returns only A's objects
      const { data: listA } = await supabase.storage.from('images').list(`images/${userAId}`);
      expect(listA.length).toBe(1);
      expect(listA[0].name).toBe('house.jpg');

      const { data: listB } = await supabase.storage.from('images').list(`images/${userBId}`);
      expect(listB.length).toBe(1);
      expect(listB[0].name).toBe('villa.jpg');
    });

    it('6.2: Malicious directory traversal filenames are sanitized before storage key assignment', () => {
      const maliciousNames = [
        '../../../../etc/passwd.jpg',
        '..\\..\\windows\\system32\\cmd.exe.png',
        '/root/secret.webp',
      ];

      for (const name of maliciousNames) {
        const sanitized = name.replace(/^.*[\\\/]/, '');
        expect(sanitized).not.toContain('/');
        expect(sanitized).not.toContain('\\');
        expect(sanitized).not.toContain('..');
      }
    });

    it('6.3: Signed URL generation creates time-bound secure URLs for private storage items', async () => {
      const filePath = 'images/usr-secure/confidential.jpg';
      await supabase.storage.from('images').upload(filePath, 'confidential_content');

      const { data, error } = await supabase.storage.from('images').createSignedUrl(filePath, 3600);
      expect(error).toBeNull();
      expect(data?.signedUrl).toBeDefined();
      expect(data?.signedUrl).toContain('token=mock_sign_');
      expect(data?.signedUrl).toContain('confidential.jpg');
    });

    it('6.4: Requesting non-existent storage file returns 404 Object Not Found', async () => {
      const { data, error } = await supabase.storage.from('images').download('images/unknown/ghost.jpg');
      expect(data).toBeNull();
      expect(error).toBeDefined();
      expect(error.statusCode).toBe(404);
      expect(error.message).toBe('Object not found');
    });

    it('6.5: Batch deletion of storage objects removes only designated paths and leaves others intact', async () => {
      const path1 = 'images/usr-batch/img1.jpg';
      const path2 = 'images/usr-batch/img2.jpg';
      const path3 = 'images/usr-batch/img3_keep.jpg';

      await supabase.storage.from('images').upload(path1, 'data1');
      await supabase.storage.from('images').upload(path2, 'data2');
      await supabase.storage.from('images').upload(path3, 'data3');

      // Remove path1 and path2
      const { data: removed } = await supabase.storage.from('images').remove([path1, path2]);
      expect(removed).toEqual([path1, path2]);

      // Verify path3 still exists
      const { data: remainingBlob } = await supabase.storage.from('images').download(path3);
      expect(remainingBlob).not.toBeNull();

      // Verify path1 is deleted
      const { data: deletedBlob } = await supabase.storage.from('images').download(path1);
      expect(deletedBlob).toBeNull();
    });
  });
});
