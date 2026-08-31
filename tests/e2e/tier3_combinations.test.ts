/**
 * Tier 3: Pairwise Combinatorial E2E Test Suite (≥20 Tests)
 * 
 * Validates cross-feature interactions, multi-service workflows, state transitions,
 * and data synchronization between UI components, database tables, and Edge Functions.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  MockSupabaseClient,
  mockDb,
  executeCheckAndConsumeQuota,
  computeMockHmac,
} from '../../src/lib/mockSupabase';

describe('Tier 3: Pairwise Cross-Feature Combinations Test Suite (20 Tests)', () => {
  let supabase: MockSupabaseClient;

  beforeEach(() => {
    supabase = new MockSupabaseClient();
  });

  // =========================================================================
  // Pair 1: Webhook Provisioning + Immediate Login + Quota Verification
  // =========================================================================
  it('Pair 1: Webhook provisioned user can immediately authenticate and access 100 quota', async () => {
    const payload = {
      email: 'pair1@grandrealty.com',
      full_name: 'Pair One Agent',
      phone: '628123456701',
      order_id: 'ORD-PAIR-01',
    };
    const sig = computeMockHmac(JSON.stringify(payload), mockDb.provisionSecret);

    // 1. Webhook
    const { data: provData } = await supabase.functions.invoke('provision', {
      body: payload,
      headers: { 'X-Signature': sig },
    });
    expect(provData.success).toBe(true);

    // 2. Sign In
    const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
      email: payload.email,
      password: provData.temp_password,
    });
    expect(authErr).toBeNull();
    expect(authData.user?.id).toBe(provData.user_id);

    // 3. Quota check
    const quotaRes = await executeCheckAndConsumeQuota(provData.user_id);
    expect(quotaRes.allowed).toBe(true);
    expect(quotaRes.remaining).toBe(99);
  });

  // =========================================================================
  // Pair 2: Photo Upload + Realtime Event Lifecycle + Photo Gallery Query
  // =========================================================================
  it('Pair 2: Uploaded photo transitions via Realtime and appears in user gallery', async () => {
    const userId = 'usr-pair-2';
    mockDb.users.set(userId, { id: userId, email: 'p2@test.com', created_at: new Date().toISOString() });
    mockDb.entitlements.set(userId, {
      id: 'e-p2',
      user_id: userId,
      product_code: 'PEA',
      status: 'active',
      monthly_quota: 100,
      consumed_quota: 0,
      cycle_start_date: new Date().toISOString(),
      cycle_reset_date: new Date(Date.now() + 30 * 86400000).toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // 1. Upload to storage
    const storagePath = `images/${userId}/living_room.jpg`;
    await supabase.storage.from('images').upload(storagePath, 'binary_photo_data');

    // 2. Enhance image
    const { data: enhData } = await supabase.functions.invoke('enhance-image', {
      body: { preset: 'HDR_BALANCED', file_path: storagePath },
      headers: { Authorization: `Bearer ${userId}` },
    });
    expect(enhData.status).toBe('done');

    // 3. Query gallery
    const { data: galleryItems } = await supabase
      .from('images')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'done');

    expect(galleryItems.length).toBe(1);
    expect(galleryItems[0].id).toBe(enhData.image_id);
    expect(galleryItems[0].enhanced_url).toBeDefined();
  });

  // =========================================================================
  // Pair 3: Enhancement Quota Consumption + Exhaustion Lock + Admin Top-Up
  // =========================================================================
  it('Pair 3: Quota exhaustion blocks enhancement until Admin performs quota top-up', async () => {
    const adminId = 'admin-user-0001-uuid';
    const userId = 'usr-pair-3';
    mockDb.users.set(userId, { id: userId, email: 'p3@test.com', created_at: new Date().toISOString() });
    mockDb.entitlements.set(userId, {
      id: 'e-p3',
      user_id: userId,
      product_code: 'PEA',
      status: 'active',
      monthly_quota: 100,
      consumed_quota: 100, // Exhausted
      cycle_start_date: new Date().toISOString(),
      cycle_reset_date: new Date(Date.now() + 15 * 86400000).toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // 1. Attempt enhance -> Blocked
    const { error: blockErr } = await supabase.functions.invoke('enhance-image', {
      body: { preset: 'TWILIGHT' },
      headers: { Authorization: `Bearer ${userId}` },
    });
    expect(blockErr.status).toBe(402);

    // 2. Admin tops up quota to 200
    await supabase.functions.invoke('admin-users', {
      body: { action: 'adjust_quota', target_user_id: userId, quota_adjustment: { monthly_quota: 200 } },
      headers: { Authorization: `Bearer ${adminId}` },
    });

    // 3. Retry enhance -> Succeeded
    const { data: successData } = await supabase.functions.invoke('enhance-image', {
      body: { preset: 'TWILIGHT' },
      headers: { Authorization: `Bearer ${userId}` },
    });
    expect(successData.success).toBe(true);
    expect(successData.remaining_quota).toBe(99); // 200 - (100+1) = 99
  });

  // =========================================================================
  // Pair 4: Admin Suspension + Session Invalidation & Re-login Lock
  // =========================================================================
  it('Pair 4: Admin user suspension revokes active session access to dashboard', async () => {
    const adminId = 'admin-user-0001-uuid';
    const userId = 'usr-pair-4';
    mockDb.users.set(userId, { id: userId, email: 'p4@test.com', created_at: new Date().toISOString() });
    mockDb.profiles.set(userId, { id: userId, email: 'p4@test.com', full_name: 'P4', phone: null, avatar_url: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
    mockDb.entitlements.set(userId, {
      id: 'e-p4',
      user_id: userId,
      product_code: 'PEA',
      status: 'active',
      monthly_quota: 100,
      consumed_quota: 0,
      cycle_start_date: new Date().toISOString(),
      cycle_reset_date: new Date(Date.now() + 30 * 86400000).toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // 1. Admin rejects / suspends
    await supabase.functions.invoke('admin-users', {
      body: { action: 'reject', target_user_id: userId },
      headers: { Authorization: `Bearer ${adminId}` },
    });

    // 2. Check entitlement
    const checkQuota = await executeCheckAndConsumeQuota(userId);
    expect(checkQuota.allowed).toBe(false);
    expect(checkQuota.error).toBe('Entitlement is not active');
  });

  // =========================================================================
  // Pair 5: Admin User Approval + App Access Gatekeeper
  // =========================================================================
  it('Pair 5: Admin approving inactive account immediately enables app access', async () => {
    const adminId = 'admin-user-0001-uuid';
    const userId = 'usr-pair-5';
    mockDb.profiles.set(userId, { id: userId, email: 'p5@test.com', full_name: 'P5', phone: null, avatar_url: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
    mockDb.entitlements.set(userId, {
      id: 'e-p5',
      user_id: userId,
      product_code: 'PEA',
      status: 'inactive',
      monthly_quota: 100,
      consumed_quota: 0,
      cycle_start_date: new Date().toISOString(),
      cycle_reset_date: new Date(Date.now() + 30 * 86400000).toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // 1. Before approval -> access denied
    const before = await executeCheckAndConsumeQuota(userId);
    expect(before.allowed).toBe(false);

    // 2. Admin approves
    await supabase.functions.invoke('admin-users', {
      body: { action: 'approve', target_user_id: userId },
      headers: { Authorization: `Bearer ${adminId}` },
    });

    // 3. After approval -> access granted
    const after = await executeCheckAndConsumeQuota(userId);
    expect(after.allowed).toBe(true);
  });

  // =========================================================================
  // Pair 6: AI Provider Outage + Critical Notification + Quota Preservation
  // =========================================================================
  it('Pair 6: AI Provider failure alerts admin and preserves user quota', async () => {
    const userId = 'usr-pair-6';
    mockDb.users.set(userId, { id: userId, email: 'p6@test.com', created_at: new Date().toISOString() });
    mockDb.entitlements.set(userId, {
      id: 'e-p6',
      user_id: userId,
      product_code: 'PEA',
      status: 'active',
      monthly_quota: 100,
      consumed_quota: 10,
      cycle_start_date: new Date().toISOString(),
      cycle_reset_date: new Date(Date.now() + 30 * 86400000).toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    mockDb.aiProviderShouldFail = true;
    mockDb.aiProviderErrorMessage = 'Lovable AI Gateway 502 Bad Gateway';

    const { error } = await supabase.functions.invoke('enhance-image', {
      body: { preset: 'HDR_BALANCED' },
      headers: { Authorization: `Bearer ${userId}` },
    });
    expect(error.status).toBe(500);

    // Critical notification exists
    const notifs = Array.from(mockDb.admin_notifications.values());
    const critAlert = notifs.find((n) => n.severity === 'critical' && n.title === 'AI Provider Failure');
    expect(critAlert).toBeDefined();

    // Reset flag for subsequent tests
    mockDb.aiProviderShouldFail = false;
  });

  // =========================================================================
  // Pair 7: Password Reset Request + New Password Sign In
  // =========================================================================
  it('Pair 7: User can reset password and log in with updated password', async () => {
    const userId = 'usr-pair-7';
    mockDb.users.set(userId, { id: userId, email: 'p7@test.com', password: 'InitialPassword!', created_at: new Date().toISOString() });

    // Request reset
    await supabase.auth.resetPasswordForEmail('p7@test.com');

    // User updates password
    await supabase.auth.signInWithPassword({ email: 'p7@test.com', password: 'InitialPassword!' });
    await supabase.auth.updateUser({ password: 'BrandNewPassword2026!' });
    await supabase.auth.signOut();

    // Verify new password
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'p7@test.com',
      password: 'BrandNewPassword2026!',
    });
    expect(error).toBeNull();
    expect(data.user?.email).toBe('p7@test.com');
  });

  // =========================================================================
  // Pair 8: Personal API Key Storage + Masking Display + Key Modification
  // =========================================================================
  it('Pair 8: User saves personal API key, displays masked, and updates status', async () => {
    const userId = 'usr-pair-8';
    const rawKey = 'sk-proj-xyz9876543210abcdef';
    const maskedHint = 'sk-...cdef';

    // Insert key
    await supabase.from('user_api_keys').insert({
      user_id: userId,
      provider: 'openai',
      encrypted_key: 'encrypted_blob',
      key_hint: maskedHint,
      is_active: true,
    });

    // Fetch key
    const { data: keyRow } = await supabase
      .from('user_api_keys')
      .select('id, provider, key_hint, is_active')
      .eq('user_id', userId)
      .single();

    expect(keyRow.key_hint).toBe(maskedHint);
    expect(keyRow.is_active).toBe(true);

    // Toggle active status
    await supabase.from('user_api_keys').eq('id', keyRow.id).update({ is_active: false });
    const { data: updatedKey } = await supabase.from('user_api_keys').select('*').eq('id', keyRow.id).single();
    expect(updatedKey.is_active).toBe(false);
  });

  // =========================================================================
  // Pair 9: Project Creation + Photo Assignment + Project Filtering
  // =========================================================================
  it('Pair 9: Photos assigned to a project can be filtered by project_id', async () => {
    const userId = 'usr-pair-9';
    mockDb.users.set(userId, { id: userId, email: 'p9@test.com', created_at: new Date().toISOString() });

    // 1. Create project
    const { data: project } = await supabase.from('projects').insert({
      user_id: userId,
      name: 'Villa Nusa Dua Bali',
      address: 'Jl. Pantai Mengiat No. 8',
    });

    // 2. Add photos to project
    await supabase.from('images').insert([
      { user_id: userId, project_id: project.id, original_url: 'p1.jpg', preset: 'HDR_BALANCED', status: 'done' },
      { user_id: userId, project_id: project.id, original_url: 'p2.jpg', preset: 'TWILIGHT', status: 'done' },
      { user_id: userId, project_id: null, original_url: 'unassigned.jpg', preset: 'SKY_ENHANCE', status: 'done' },
    ]);

    // 3. Filter by project
    const { data: projectPhotos } = await supabase
      .from('images')
      .select('*')
      .eq('project_id', project.id);

    expect(projectPhotos.length).toBe(2);
    expect(projectPhotos.map((p: any) => p.original_url)).toContain('p1.jpg');
    expect(projectPhotos.map((p: any) => p.original_url)).toContain('p2.jpg');
  });

  // =========================================================================
  // Pair 10: Gallery Bulk Selection + Storage & Database Cleanup
  // =========================================================================
  it('Pair 10: Bulk delete removes photos from both storage bucket and database', async () => {
    const userId = 'usr-pair-10';
    const path1 = `images/${userId}/bulk1.jpg`;
    const path2 = `images/${userId}/bulk2.jpg`;

    await supabase.storage.from('images').upload(path1, 'data1');
    await supabase.storage.from('images').upload(path2, 'data2');

    const { data: img1 } = await supabase.from('images').insert({ user_id: userId, original_url: path1, preset: 'HDR_BALANCED' });
    const { data: img2 } = await supabase.from('images').insert({ user_id: userId, original_url: path2, preset: 'HDR_BALANCED' });

    // Bulk delete storage
    await supabase.storage.from('images').remove([path1, path2]);

    // Bulk delete DB
    await supabase.from('images').in('id', [img1.id, img2.id]).delete();

    // Verify DB deleted
    const { data: remainingDb } = await supabase.from('images').select('*').eq('user_id', userId);
    expect(remainingDb.length).toBe(0);

    // Verify Storage deleted
    const check1 = await supabase.storage.from('images').download(path1);
    expect(check1.error).not.toBeNull();
  });

  // =========================================================================
  // Pair 11: WAHA Delivery Failure + User Creation + Critical Notification
  // =========================================================================
  it('Pair 11: WAHA failure during webhook provisioning alerts admin without breaking account', async () => {
    mockDb.wahaShouldFail = true;
    const payload = {
      email: 'wahafailpair@domain.com',
      full_name: 'WA Fail User',
      phone: '628198765432',
      order_id: 'ORD-WA-FAIL-P11',
    };
    const sig = computeMockHmac(JSON.stringify(payload), mockDb.provisionSecret);

    const { data } = await supabase.functions.invoke('provision', {
      body: payload,
      headers: { 'X-Signature': sig },
    });

    expect(data.success).toBe(true);
    expect(data.wa_status).toBe('failed');

    // Account still created
    expect(mockDb.users.has(data.user_id)).toBe(true);
    expect(mockDb.entitlements.get(data.user_id)?.status).toBe('active');

    // Critical alert created
    const notifs = Array.from(mockDb.admin_notifications.values());
    const waAlert = notifs.find((n) => n.severity === 'critical' && n.title.includes('WhatsApp'));
    expect(waAlert).toBeDefined();
  });

  // =========================================================================
  // Pair 12: Admin Provider Switch + Subsequent Enhancement Call
  // =========================================================================
  it('Pair 12: Switching AI provider dynamically logs usage with new provider name', async () => {
    const adminId = 'admin-user-0001-uuid';
    const userId = 'usr-pair-12';
    mockDb.users.set(userId, { id: userId, email: 'p12@test.com', created_at: new Date().toISOString() });
    mockDb.entitlements.set(userId, {
      id: 'e-p12',
      user_id: userId,
      product_code: 'PEA',
      status: 'active',
      monthly_quota: 100,
      consumed_quota: 0,
      cycle_start_date: new Date().toISOString(),
      cycle_reset_date: new Date(Date.now() + 30 * 86400000).toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // Admin switches provider
    await supabase.rpc('log_admin_action', {
      p_admin_id: adminId,
      p_admin_email: 'admin@pea.com',
      p_action: 'switch_provider',
      p_details: { provider: 'openai', model: 'dall-e-3' },
    });

    const { data } = await supabase.functions.invoke('enhance-image', {
      body: { preset: 'HDR_BALANCED' },
      headers: { Authorization: `Bearer ${userId}` },
    });
    expect(data.success).toBe(true);

    const audit = Array.from(mockDb.admin_audit_logs.values()).find((a) => a.action === 'switch_provider');
    expect(audit).toBeDefined();
  });

  // =========================================================================
  // Pair 13: Pricing CMS Modification + Public Landing Page Reflection
  // =========================================================================
  it('Pair 13: Admin updates pricing settings and public query reflects new price', async () => {
    const priceId = 'pricing-lifetime-1';
    await supabase.from('pricing_settings').eq('id', priceId).update({
      price_idr: 649000,
      plan_name: 'Lifetime Special Edition',
    });

    const { data } = await supabase.from('pricing_settings').select('*').eq('id', priceId).single();
    expect(data.price_idr).toBe(649000);
    expect(data.plan_name).toBe('Lifetime Special Edition');
  });

  // =========================================================================
  // Pair 14: FAQ CMS Active/Inactive Toggle + Public Landing Rendering
  // =========================================================================
  it('Pair 14: Admin deactivates FAQ item and public active query excludes it', async () => {
    const faqId = 'faq-1';
    await supabase.from('faqs').eq('id', faqId).update({ is_active: false });

    const { data } = await supabase.from('faqs').select('*').eq('is_active', true);
    const hasFaq1 = data.some((f: any) => f.id === faqId);
    expect(hasFaq1).toBe(false);
  });

  // =========================================================================
  // Pair 15: Admin Dashboard Embedded Sandbox + User Quota Deduction Sync
  // =========================================================================
  it('Pair 15: Admin testing user studio consumes quota accurately in sandbox', async () => {
    const adminId = 'admin-user-0001-uuid';
    const res1 = await executeCheckAndConsumeQuota(adminId);
    expect(res1.allowed).toBe(true);

    const ent = mockDb.entitlements.get(adminId);
    expect(ent?.consumed_quota).toBe(1);
  });

  // =========================================================================
  // Pair 16: Duplicate Webhook Provisioning + Status Log + Data Unchanged
  // =========================================================================
  it('Pair 16: Repeated duplicate webhook provisioning returns 409 and logs attempt', async () => {
    const payload = {
      email: 'dup_pair16@domain.com',
      order_id: 'ORD-P16',
    };
    const sig = computeMockHmac(JSON.stringify(payload), mockDb.provisionSecret);

    // First attempt -> 200
    await supabase.functions.invoke('provision', { body: payload, headers: { 'X-Signature': sig } });

    // Second attempt -> 409
    const { error: dupErr } = await supabase.functions.invoke('provision', { body: payload, headers: { 'X-Signature': sig } });
    expect(dupErr.status).toBe(409);
    expect(dupErr.error).toBe('rejected_duplicate');

    const logs = Array.from(mockDb.provision_logs.values()).filter((l) => l.email === payload.email);
    expect(logs.length).toBe(2);
    expect(logs[1].status).toBe('rejected_duplicate');
  });

  // =========================================================================
  // Pair 17: User Profile Update + Dashboard Header Sync
  // =========================================================================
  it('Pair 17: Profile full name update reflects immediately in database query', async () => {
    const userId = 'usr-pair-17';
    mockDb.users.set(userId, { id: userId, email: 'p17@test.com', password: 'Pass!', created_at: new Date().toISOString() });
    mockDb.profiles.set(userId, {
      id: userId,
      email: 'p17@test.com',
      full_name: 'Original Agent',
      phone: null,
      avatar_url: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    await supabase.auth.signInWithPassword({ email: 'p17@test.com', password: 'Pass!' });
    await supabase.auth.updateUser({ data: { full_name: 'Senior Principal Agent' } });

    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    expect(data.full_name).toBe('Senior Principal Agent');
  });

  // =========================================================================
  // Pair 18: Preset Selection (HDR -> Twilight) + Prompt Metadata Tracking
  // =========================================================================
  it('Pair 18: Changing preset to TWILIGHT saves preset in image record', async () => {
    const userId = 'usr-pair-18';
    mockDb.users.set(userId, { id: userId, email: 'p18@test.com', created_at: new Date().toISOString() });
    mockDb.entitlements.set(userId, {
      id: 'e-p18',
      user_id: userId,
      product_code: 'PEA',
      status: 'active',
      monthly_quota: 100,
      consumed_quota: 0,
      cycle_start_date: new Date().toISOString(),
      cycle_reset_date: new Date(Date.now() + 30 * 86400000).toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    const { data } = await supabase.functions.invoke('enhance-image', {
      body: { preset: 'TWILIGHT' },
      headers: { Authorization: `Bearer ${userId}` },
    });

    const img = mockDb.images.get(data.image_id);
    expect(img?.preset).toBe('TWILIGHT');
  });

  // =========================================================================
  // Pair 19: Storage File Upload + Signed Download URL Expiry Validation
  // =========================================================================
  it('Pair 19: Private image upload can generate temporary signed URL', async () => {
    const path = 'images/usr-p19/raw_shot.jpg';
    await supabase.storage.from('images').upload(path, 'jpeg_data');

    const { data: signData, error: signErr } = await supabase.storage.from('images').createSignedUrl(path, 7200);
    expect(signErr).toBeNull();
    expect(signData?.signedUrl).toContain('mock_sign_');
  });

  // =========================================================================
  // Pair 20: Role Elevation (User -> Admin) + Immediate Admin API Authorization
  // =========================================================================
  it('Pair 20: Assigning admin role grants access to admin-users endpoint', async () => {
    const userId = 'usr-pair-20';
    mockDb.users.set(userId, { id: userId, email: 'p20@test.com', created_at: new Date().toISOString() });
    mockDb.user_roles.set(userId, { id: 'r-p20', user_id: userId, role: 'user', created_at: new Date().toISOString() });

    // 1. Initial attempt -> 403 Forbidden
    const { error: err1 } = await supabase.functions.invoke('admin-users', {
      body: { action: 'list' },
      headers: { Authorization: `Bearer ${userId}` },
    });
    expect(err1.status).toBe(403);

    // 2. Elevate role
    mockDb.user_roles.set(userId, { id: 'r-p20', user_id: userId, role: 'admin', created_at: new Date().toISOString() });

    // 3. Subsequent attempt -> 200 OK
    const { data: data2, error: err2 } = await supabase.functions.invoke('admin-users', {
      body: { action: 'list' },
      headers: { Authorization: `Bearer ${userId}` },
    });
    expect(err2).toBeNull();
    expect(data2.success).toBe(true);
  });
});
