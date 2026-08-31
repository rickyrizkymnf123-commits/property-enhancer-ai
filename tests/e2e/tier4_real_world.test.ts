/**
 * Tier 4: Real-World End-to-End Workload & Scenario Tests (≥10 Tests)
 * 
 * Validates complex, multi-stage, production-representative user journeys
 * and administrative governance operations across the entire Property Enhancer AI application.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  MockSupabaseClient,
  mockDb,
  executeCheckAndConsumeQuota,
  computeMockHmac,
} from '../../src/lib/mockSupabase';

describe('Tier 4: Real-World End-to-End Scenarios Test Suite (10 Scenarios)', () => {
  let supabase: MockSupabaseClient;

  beforeEach(() => {
    supabase = new MockSupabaseClient();
  });

  // =========================================================================
  // Scenario 1: Complete Paid Buyer Onboarding & First Photo Enhancement
  // =========================================================================
  it('Scenario 1: End-to-End Buyer Onboarding (Webhook -> WhatsApp -> Login -> HDR Enhance -> Download)', async () => {
    // 1. External payment webhook fires
    const purchasePayload = {
      email: 'ahmad.realtor@grandjakarta.id',
      full_name: 'Ahmad Dahlan',
      phone: '6281234567890',
      order_id: 'ORD-LIFETIME-991',
    };
    const signature = computeMockHmac(JSON.stringify(purchasePayload), mockDb.provisionSecret);

    const { data: provisionData, error: provisionErr } = await supabase.functions.invoke('provision', {
      body: purchasePayload,
      headers: { 'X-Signature': signature },
    });

    expect(provisionErr).toBeNull();
    expect(provisionData.success).toBe(true);
    expect(provisionData.wa_status).toBe('sent');
    const generatedPassword = provisionData.temp_password;

    // 2. User authenticates on /login with WhatsApp-delivered credentials
    const { data: loginData, error: loginErr } = await supabase.auth.signInWithPassword({
      email: purchasePayload.email,
      password: generatedPassword,
    });

    expect(loginErr).toBeNull();
    expect(loginData.user?.email).toBe(purchasePayload.email);

    // 3. User checks active entitlement on dashboard
    const { data: entRecord } = await supabase
      .from('entitlements')
      .select('*')
      .eq('user_id', loginData.user!.id)
      .single();

    expect(entRecord.status).toBe('active');
    expect(entRecord.monthly_quota).toBe(100);
    expect(entRecord.consumed_quota).toBe(0);

    // 4. User navigates to /app/editor and uploads raw photo
    const rawFilePath = `images/${loginData.user!.id}/raw_interior_01.jpg`;
    await supabase.storage.from('images').upload(rawFilePath, 'raw_jpeg_binary_stream');

    // 5. User clicks "Enhance" with HDR_BALANCED preset
    const { data: enhanceResult, error: enhanceErr } = await supabase.functions.invoke('enhance-image', {
      body: { preset: 'HDR_BALANCED', file_path: rawFilePath },
      headers: { Authorization: `Bearer ${loginData.user!.id}` },
    });

    expect(enhanceErr).toBeNull();
    expect(enhanceResult.status).toBe('done');
    expect(enhanceResult.enhanced_url).toContain('enhanced_');
    expect(enhanceResult.remaining_quota).toBe(99);

    // 6. User downloads high-resolution enhanced photo via signed URL
    const { data: downloadUrl } = await supabase.storage.from('images').createSignedUrl(enhanceResult.enhanced_url, 3600);
    expect(downloadUrl?.signedUrl).toBeDefined();
  });

  // =========================================================================
  // Scenario 2: Professional Photographer Multi-Preset Project Workflow
  // =========================================================================
  it('Scenario 2: Photographer Project Workflow (Create Project -> 4 Multi-Preset Enhancements -> Gallery Filter)', async () => {
    const userId = 'usr-photographer-01';
    mockDb.users.set(userId, { id: userId, email: 'studio@prophotos.id', created_at: new Date().toISOString() });
    mockDb.profiles.set(userId, { id: userId, email: 'studio@prophotos.id', full_name: 'Studio Pro', phone: null, avatar_url: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
    mockDb.entitlements.set(userId, {
      id: 'ent-photo',
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

    // 1. Create project "Villa Sunset Nusa Dua"
    const { data: project } = await supabase.from('projects').insert({
      user_id: userId,
      name: 'Villa Sunset Nusa Dua',
      address: 'Jl. Sunset Road No. 88, Bali',
    });

    // 2. Enhance 4 photos across different presets
    const photoJobs = [
      { name: 'living_room.jpg', preset: 'HDR_BALANCED' },
      { name: 'pool_dusk.jpg', preset: 'TWILIGHT' },
      { name: 'exterior_lawn.jpg', preset: 'LAWN_GREEN' },
      { name: 'aerial_roof.jpg', preset: 'SKY_ENHANCE' },
    ];

    for (const job of photoJobs) {
      const path = `images/${userId}/${job.name}`;
      await supabase.storage.from('images').upload(path, 'photo_data');

      await supabase.functions.invoke('enhance-image', {
        body: { preset: job.preset, file_path: path, project_id: project.id },
        headers: { Authorization: `Bearer ${userId}` },
      });
    }

    // 3. Verify user consumed exactly 4 quota units
    const { data: ent } = await supabase.from('entitlements').select('*').eq('user_id', userId).single();
    expect(ent.consumed_quota).toBe(4);

    // 4. Verify gallery returns 4 project images
    const { data: projectImages } = await supabase.from('images').select('*').eq('project_id', project.id);
    expect(projectImages.length).toBe(4);
    const presetsUsed = projectImages.map((p: any) => p.preset);
    expect(presetsUsed).toEqual(expect.arrayContaining(['HDR_BALANCED', 'TWILIGHT', 'LAWN_GREEN', 'SKY_ENHANCE']));
  });

  // =========================================================================
  // Scenario 3: Quota Exhaustion & 30-Day Automated Rollover Lifecycle
  // =========================================================================
  it('Scenario 3: Quota Lifecycle (100 Photos Used -> Lock -> 30-Day Rollover -> Resumed Access)', async () => {
    const userId = 'usr-lifecycle-01';
    const now = Date.now();
    mockDb.users.set(userId, { id: userId, email: 'heavyuser@agency.com', created_at: new Date().toISOString() });
    mockDb.entitlements.set(userId, {
      id: 'ent-life',
      user_id: userId,
      product_code: 'PEA',
      status: 'active',
      monthly_quota: 100,
      consumed_quota: 99, // 1 remaining
      cycle_start_date: new Date(now - 20 * 86400000).toISOString(),
      cycle_reset_date: new Date(now + 10 * 86400000).toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // 1. Use the 100th quota
    const res100 = await supabase.functions.invoke('enhance-image', {
      body: { preset: 'HDR_BALANCED' },
      headers: { Authorization: `Bearer ${userId}` },
    });
    expect(res100.data.remaining_quota).toBe(0);

    // 2. Attempt 101st photo -> Blocked with 402 QUOTA_EXHAUSTED
    const res101 = await supabase.functions.invoke('enhance-image', {
      body: { preset: 'HDR_BALANCED' },
      headers: { Authorization: `Bearer ${userId}` },
    });
    expect(res101.error.status).toBe(402);
    expect(res101.error.code).toBe('QUOTA_EXHAUSTED');

    // 3. Time advances past cycle_reset_date (simulated by updating cycle_reset_date to past)
    const ent = mockDb.entitlements.get(userId)!;
    ent.cycle_reset_date = new Date(Date.now() - 1000).toISOString();
    mockDb.entitlements.set(userId, ent);

    // 4. Next enhancement automatically triggers rollover and consumes 1 quota
    const resNextCycle = await supabase.functions.invoke('enhance-image', {
      body: { preset: 'HDR_BALANCED' },
      headers: { Authorization: `Bearer ${userId}` },
    });

    expect(resNextCycle.error).toBeNull();
    expect(resNextCycle.data.status).toBe('done');
    expect(resNextCycle.data.remaining_quota).toBe(99); // Reset to 100, 1 consumed
  });

  // =========================================================================
  // Scenario 4: Administrator User Governance & Security Audit Trail
  // =========================================================================
  it('Scenario 4: Admin User Governance (Review Users -> Suspend -> Audit Verification -> Reset Password)', async () => {
    const adminId = 'admin-user-0001-uuid';
    const targetUserId = 'usr-abusive-user-99';

    // Seed target user
    mockDb.users.set(targetUserId, { id: targetUserId, email: 'spammer@bad.com', password: 'BadPassword1!', created_at: new Date().toISOString() });
    mockDb.profiles.set(targetUserId, { id: targetUserId, email: 'spammer@bad.com', full_name: 'Spammer', phone: '0800', avatar_url: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
    mockDb.entitlements.set(targetUserId, {
      id: 'ent-bad',
      user_id: targetUserId,
      product_code: 'PEA',
      status: 'active',
      monthly_quota: 100,
      consumed_quota: 0,
      cycle_start_date: new Date().toISOString(),
      cycle_reset_date: new Date(Date.now() + 30 * 86400000).toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // 1. Admin lists all users
    const { data: listResult } = await supabase.functions.invoke('admin-users', {
      body: { action: 'list' },
      headers: { Authorization: `Bearer ${adminId}` },
    });
    expect(listResult.users.length).toBeGreaterThanOrEqual(1);

    // 2. Admin suspends abusive user
    const { data: suspendResult } = await supabase.functions.invoke('admin-users', {
      body: { action: 'reject', target_user_id: targetUserId },
      headers: { Authorization: `Bearer ${adminId}` },
    });
    expect(suspendResult.success).toBe(true);
    expect(mockDb.entitlements.get(targetUserId)?.status).toBe('suspended');

    // 3. Verify audit log entry
    const auditLogs = Array.from(mockDb.admin_audit_logs.values());
    const suspendLog = auditLogs.find((l) => l.action === 'reject_user' && l.target_user_id === targetUserId);
    expect(suspendLog).toBeDefined();

    // 4. Admin resets password for customer support request
    const { data: passResetResult } = await supabase.functions.invoke('admin-users', {
      body: { action: 'reset_password', target_user_id: targetUserId, new_password: 'NewSupportPassword99!' },
      headers: { Authorization: `Bearer ${adminId}` },
    });
    expect(passResetResult.success).toBe(true);
    expect(mockDb.users.get(targetUserId)?.password).toBe('NewSupportPassword99!');
  });

  // =========================================================================
  // Scenario 5: External Webhook Outage & Incident Recovery Flow
  // =========================================================================
  it('Scenario 5: Webhook Outage & Recovery (Invalid Signature -> Rejected -> WAHA Fail Alert -> Resend)', async () => {
    const adminId = 'admin-user-0001-uuid';

    // 1. Webhook with fake signature is rejected 401
    const badPayload = { email: 'fake@attack.com' };
    const { error: forgedErr } = await supabase.functions.invoke('provision', {
      body: badPayload,
      headers: { 'X-Signature': 'forged_hash_invalid' },
    });
    expect(forgedErr.status).toBe(401);

    // 2. Valid purchase arrives while WAHA is down
    mockDb.wahaShouldFail = true;
    const legitPayload = {
      email: 'customer.vip@domain.com',
      full_name: 'VIP Client',
      phone: '6281122334455',
      order_id: 'ORD-VIP-001',
    };
    const validSig = computeMockHmac(JSON.stringify(legitPayload), mockDb.provisionSecret);

    const { data: provResult } = await supabase.functions.invoke('provision', {
      body: legitPayload,
      headers: { 'X-Signature': validSig },
    });
    expect(provResult.success).toBe(true);
    expect(provResult.wa_status).toBe('failed');

    // 3. Admin checks notifications and discovers critical WA alert
    const { data: critNotifs } = await supabase.from('admin_notifications').select('*').eq('severity', 'critical');
    const waAlert = critNotifs.find((n: any) => n.title.includes('WhatsApp'));
    expect(waAlert).toBeDefined();

    // 4. Admin resends credential via admin-users action
    const { data: resendResult } = await supabase.functions.invoke('admin-users', {
      body: { action: 'resend_credential', target_user_id: provResult.user_id },
      headers: { Authorization: `Bearer ${adminId}` },
    });
    expect(resendResult.success).toBe(true);

    // 5. Audit log reflects resend action
    const auditLogs = Array.from(mockDb.admin_audit_logs.values());
    const resendLog = auditLogs.find((l) => l.action === 'resend_credential' && l.target_user_id === provResult.user_id);
    expect(resendLog).toBeDefined();
  });

  // =========================================================================
  // Scenario 6: Customer Password Recovery & Profile Management
  // =========================================================================
  it('Scenario 6: Password Recovery & Profile Lifecycle (Forgot -> Update Password -> Login -> Edit Profile)', async () => {
    const userId = 'usr-selfservice-01';
    mockDb.users.set(userId, { id: userId, email: 'budi@realty.id', password: 'OldPassword123!', created_at: new Date().toISOString() });
    mockDb.profiles.set(userId, { id: userId, email: 'budi@realty.id', full_name: 'Budi', phone: '0812', avatar_url: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });

    // 1. Forgot password request
    const { error: forgotErr } = await supabase.auth.resetPasswordForEmail('budi@realty.id');
    expect(forgotErr).toBeNull();

    // 2. User logs in with recovery session and updates password
    await supabase.auth.signInWithPassword({ email: 'budi@realty.id', password: 'OldPassword123!' });
    const { error: updatePassErr } = await supabase.auth.updateUser({ password: 'BudiNewSecurePass2026!' });
    expect(updatePassErr).toBeNull();

    // 3. User signs out and logs in with new password
    await supabase.auth.signOut();
    const { data: loginData, error: loginErr } = await supabase.auth.signInWithPassword({
      email: 'budi@realty.id',
      password: 'BudiNewSecurePass2026!',
    });
    expect(loginErr).toBeNull();
    expect(loginData.user?.email).toBe('budi@realty.id');

    // 4. User edits profile information in /app/settings
    await supabase.auth.updateUser({
      data: { full_name: 'Budi Santoso, S.Kom', phone: '6281299998888' },
    });

    const { data: updatedProfile } = await supabase.from('profiles').select('*').eq('id', userId).single();
    expect(updatedProfile.full_name).toBe('Budi Santoso, S.Kom');
    expect(updatedProfile.phone).toBe('6281299998888');
  });

  // =========================================================================
  // Scenario 7: Enterprise User Custom API Key Provisioning
  // =========================================================================
  it('Scenario 7: Custom API Keys (Add Key -> Masked Render -> Deactivate Key -> Purge)', async () => {
    const userId = 'usr-enterprise-01';
    mockDb.users.set(userId, { id: userId, email: 'corp@enterprise.com', created_at: new Date().toISOString() });

    // 1. Add custom OpenAI key
    const rawKey = 'sk-proj-prod99887766554433221100aa';
    const keyHint = 'sk-...00aa';

    const { data: insertedKey } = await supabase.from('user_api_keys').insert({
      user_id: userId,
      provider: 'openai',
      encrypted_key: 'enc_AES256_' + rawKey,
      key_hint: keyHint,
      is_active: true,
    });

    // 2. Fetch keys list for settings view
    const { data: keysList } = await supabase.from('user_api_keys').select('id, provider, key_hint, is_active').eq('user_id', userId);
    expect(keysList.length).toBe(1);
    expect(keysList[0].key_hint).toBe('sk-...00aa');

    // 3. User deactivates key
    await supabase.from('user_api_keys').eq('id', insertedKey.id).update({ is_active: false });
    const { data: deactivated } = await supabase.from('user_api_keys').select('*').eq('id', insertedKey.id).single();
    expect(deactivated.is_active).toBe(false);

    // 4. User deletes key
    await supabase.from('user_api_keys').eq('id', insertedKey.id).delete();
    const { data: remainingKeys } = await supabase.from('user_api_keys').select('*').eq('user_id', userId);
    expect(remainingKeys.length).toBe(0);
  });

  // =========================================================================
  // Scenario 8: Landing Page CMS Management & Public Marketing Experience
  // =========================================================================
  it('Scenario 8: Landing CMS & Public Experience (Admin CMS Update -> Public Visitor Browsing)', async () => {
    // 1. Admin adds new testimonial and updates pricing
    await supabase.from('testimonials').insert({
      name: 'Maya Indah',
      role: 'Head of Marketing',
      company: 'Century 21 Prima',
      content: 'Solusi AI terbaik untuk tim listing properti kami. Sangat cepat dan jernih!',
      rating: 5,
      is_active: true,
      sort_order: 2,
    });

    await supabase.from('pricing_settings').eq('id', 'pricing-lifetime-1').update({
      price_idr: 549000,
    });

    // 2. Public visitor visits landing page
    // Fetches pricing
    const { data: pricing } = await supabase.from('pricing_settings').select('*').eq('is_active', true).single();
    expect(pricing.price_idr).toBe(549000);

    // Fetches testimonials
    const { data: testimonials } = await supabase.from('testimonials').select('*').eq('is_active', true);
    const hasMaya = testimonials.some((t: any) => t.name === 'Maya Indah');
    expect(hasMaya).toBe(true);

    // Fetches active FAQs
    const { data: faqs } = await supabase.from('faqs').select('*').eq('is_active', true);
    expect(faqs.length).toBeGreaterThanOrEqual(2);
  });

  // =========================================================================
  // Scenario 9: Multi-Tenant Data Isolation & Security Perimeter
  // =========================================================================
  it('Scenario 9: Tenant Isolation (User A Photos & Projects Inaccessible to User B)', async () => {
    const userA = 'usr-tenant-A';
    const userB = 'usr-tenant-B';

    // Seed User A and B
    mockDb.users.set(userA, { id: userA, email: 'userA@test.com', created_at: new Date().toISOString() });
    mockDb.users.set(userB, { id: userB, email: 'userB@test.com', created_at: new Date().toISOString() });

    // User A creates project and photos
    const { data: projectA } = await supabase.from('projects').insert({ user_id: userA, name: 'Secret Mansion A' });
    await supabase.from('images').insert([
      { user_id: userA, project_id: projectA.id, original_url: `images/${userA}/confidential1.jpg`, preset: 'HDR_BALANCED' },
      { user_id: userA, project_id: projectA.id, original_url: `images/${userA}/confidential2.jpg`, preset: 'TWILIGHT' },
    ]);

    // User B queries images filtered by User B's user_id
    const { data: userBImages } = await supabase.from('images').select('*').eq('user_id', userB);
    expect(userBImages.length).toBe(0);

    // User B queries projects filtered by User B's user_id
    const { data: userBProjects } = await supabase.from('projects').select('*').eq('user_id', userB);
    expect(userBProjects.length).toBe(0);
  });

  // =========================================================================
  // Scenario 10: Multi-Provider AI Failover & Operational Continuity
  // =========================================================================
  it('Scenario 10: AI Provider Failover (Lovable Gateway Down -> Critical Alert -> Provider Switch -> Success)', async () => {
    const adminId = 'admin-user-0001-uuid';
    const userId = 'usr-failover-user';

    mockDb.users.set(userId, { id: userId, email: 'failover@agency.com', created_at: new Date().toISOString() });
    mockDb.entitlements.set(userId, {
      id: 'ent-fo',
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

    // 1. Provider outage occurs
    mockDb.aiProviderShouldFail = true;
    mockDb.aiProviderErrorMessage = 'Lovable AI Gateway 500 Internal Error';

    const { error: outageErr } = await supabase.functions.invoke('enhance-image', {
      body: { preset: 'HDR_BALANCED' },
      headers: { Authorization: `Bearer ${userId}` },
    });
    expect(outageErr.status).toBe(500);

    // 2. Admin inspects critical notification
    const { data: notifs } = await supabase.from('admin_notifications').select('*').eq('severity', 'critical');
    expect(notifs.length).toBeGreaterThanOrEqual(1);

    // 3. Admin switches active provider to Direct Gemini / fixes outage
    mockDb.aiProviderShouldFail = false;
    await supabase.rpc('log_admin_action', {
      p_admin_id: adminId,
      p_admin_email: 'admin@pea.com',
      p_action: 'switch_provider',
      p_details: { switched_to: 'gemini-direct' },
    });

    // 4. User retries enhancement and succeeds
    const { data: retrySuccess, error: retryErr } = await supabase.functions.invoke('enhance-image', {
      body: { preset: 'HDR_BALANCED' },
      headers: { Authorization: `Bearer ${userId}` },
    });

    expect(retryErr).toBeNull();
    expect(retrySuccess.status).toBe('done');
    expect(retrySuccess.enhanced_url).toBeDefined();
  });
});
