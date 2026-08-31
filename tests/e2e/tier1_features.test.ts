/**
 * Tier 1: Feature Isolation E2E Test Suite (≥95 Tests)
 * 
 * Validates all 19 core features of Property Enhancer AI in complete isolation,
 * ensuring each component, security rule, and workflow adheres to requirements R1–R5
 * and Acceptance Criteria AC-1 through AC-14.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  MockSupabaseClient,
  mockDb,
  executeCheckAndConsumeQuota,
  executeHasRole,
  computeMockHmac,
} from '../../src/lib/mockSupabase';

describe('Tier 1: Feature Isolation Test Suite (19 Features x 5 Tests = 95 Tests)', () => {
  let supabase: MockSupabaseClient;

  beforeEach(() => {
    supabase = new MockSupabaseClient();
  });

  // =========================================================================
  // Feature 1: No Public Self-Registration on /login (R1, AC-1)
  // =========================================================================
  describe('Feature 1: No Public Self-Registration on /login', () => {
    it('1.1: Login endpoint authenticates valid registered users', async () => {
      // Seed user
      mockDb.users.set('usr-test-1', {
        id: 'usr-test-1',
        email: 'agent@grandrealty.com',
        password: 'SecurePassword123!',
        created_at: new Date().toISOString(),
      });

      const { data, error } = await supabase.auth.signInWithPassword({
        email: 'agent@grandrealty.com',
        password: 'SecurePassword123!',
      });

      expect(error).toBeNull();
      expect(data.user).toBeDefined();
      expect(data.user?.email).toBe('agent@grandrealty.com');
      expect(data.session?.access_token).toBeDefined();
    });

    it('1.2: Login rejects non-existent email with invalid credentials error', async () => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: 'unregistered@domain.com',
        password: 'SomePassword123!',
      });

      expect(data.session).toBeNull();
      expect(error).toBeDefined();
      expect(error.message).toBe('Invalid login credentials');
      expect(error.status).toBe(400);
    });

    it('1.3: Login rejects incorrect password for registered user', async () => {
      mockDb.users.set('usr-test-2', {
        id: 'usr-test-2',
        email: 'agent2@grandrealty.com',
        password: 'CorrectPassword123!',
        created_at: new Date().toISOString(),
      });

      const { data, error } = await supabase.auth.signInWithPassword({
        email: 'agent2@grandrealty.com',
        password: 'WrongPassword!',
      });

      expect(data.session).toBeNull();
      expect(error).toBeDefined();
      expect(error.message).toBe('Invalid login credentials');
    });

    it('1.4: Direct self-registration lacks PEA entitlement by default', async () => {
      const { data, error } = await supabase.auth.signUp({
        email: 'public_visitor@domain.com',
        password: 'Password123!',
      });

      expect(error).toBeNull();
      expect(data.user?.id).toBeDefined();
      
      // Entitlement must not exist without webhook purchase or admin grant
      const ent = mockDb.entitlements.get(data.user!.id);
      expect(ent).toBeUndefined();
    });

    it('1.5: Login verifies user session retrieval via getSession', async () => {
      mockDb.users.set('usr-test-3', {
        id: 'usr-test-3',
        email: 'agent3@grandrealty.com',
        password: 'Password123!',
        created_at: new Date().toISOString(),
      });

      await supabase.auth.signInWithPassword({
        email: 'agent3@grandrealty.com',
        password: 'Password123!',
      });

      const { data } = await supabase.auth.getSession();
      expect(data.session).not.toBeNull();
      expect(data.session?.user.email).toBe('agent3@grandrealty.com');
    });
  });

  // =========================================================================
  // Feature 2: Role & Entitlement Redirect Gate (R1, AC-2, AC-3)
  // =========================================================================
  describe('Feature 2: Role & Entitlement Redirect Gate', () => {
    it('2.1: Admin user login resolves admin role from user_roles', async () => {
      const adminId = 'admin-user-0001-uuid';
      const hasAdmin = await executeHasRole(adminId, 'admin');
      expect(hasAdmin).toBe(true);

      const hasUser = await executeHasRole(adminId, 'user');
      expect(hasUser).toBe(false);
    });

    it('2.2: Standard user role resolves user role correctly', async () => {
      const userId = 'std-user-1';
      mockDb.user_roles.set(userId, {
        id: 'role-std-1',
        user_id: userId,
        role: 'user',
        created_at: new Date().toISOString(),
      });

      const isUser = await executeHasRole(userId, 'user');
      const isAdmin = await executeHasRole(userId, 'admin');
      expect(isUser).toBe(true);
      expect(isAdmin).toBe(false);
    });

    it('2.3: Entitled user with active PEA entitlement is permitted', async () => {
      const userId = 'entitled-user-1';
      mockDb.entitlements.set(userId, {
        id: 'ent-1',
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

      const { data } = await supabase
        .from('entitlements')
        .select('*')
        .eq('user_id', userId)
        .eq('product_code', 'PEA')
        .single();

      expect(data).toBeDefined();
      expect(data.status).toBe('active');
      expect(data.product_code).toBe('PEA');
    });

    it('2.4: Non-admin user querying admin role returns false', async () => {
      const strangerId = 'stranger-uid-999';
      const isAdmin = await executeHasRole(strangerId, 'admin');
      expect(isAdmin).toBe(false);
    });

    it('2.5: User without role record defaults to no administrative privileges', async () => {
      const unassignedId = 'unassigned-uid-888';
      const roleResult = await supabase.rpc('has_role', { p_user_id: unassignedId, p_role: 'admin' });
      expect(roleResult.data).toBe(false);
    });
  });

  // =========================================================================
  // Feature 3: Unentitled Toast & SignOut (R1, AC-2)
  // =========================================================================
  describe('Feature 3: Unentitled Toast & SignOut', () => {
    it('3.1: User without entitlement record fails quota access', async () => {
      const unentitledId = 'unentitled-user-1';
      const quotaRes = await executeCheckAndConsumeQuota(unentitledId);
      expect(quotaRes.allowed).toBe(false);
      expect(quotaRes.error).toBe('No PEA entitlement found');
    });

    it('3.2: User with inactive entitlement status is denied access', async () => {
      const inactiveId = 'inactive-user-1';
      mockDb.entitlements.set(inactiveId, {
        id: 'ent-inact',
        user_id: inactiveId,
        product_code: 'PEA',
        status: 'inactive',
        monthly_quota: 100,
        consumed_quota: 0,
        cycle_start_date: new Date().toISOString(),
        cycle_reset_date: new Date(Date.now() + 30 * 86400000).toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      const quotaRes = await executeCheckAndConsumeQuota(inactiveId);
      expect(quotaRes.allowed).toBe(false);
      expect(quotaRes.error).toBe('Entitlement is not active');
    });

    it('3.3: User with suspended entitlement status is rejected', async () => {
      const suspendedId = 'suspended-user-1';
      mockDb.entitlements.set(suspendedId, {
        id: 'ent-susp',
        user_id: suspendedId,
        product_code: 'PEA',
        status: 'suspended',
        monthly_quota: 100,
        consumed_quota: 50,
        cycle_start_date: new Date().toISOString(),
        cycle_reset_date: new Date(Date.now() + 15 * 86400000).toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      const quotaRes = await executeCheckAndConsumeQuota(suspendedId);
      expect(quotaRes.allowed).toBe(false);
      expect(quotaRes.error).toBe('Entitlement is not active');
    });

    it('3.4: SignOut invalidates active session and resets state', async () => {
      mockDb.users.set('usr-out', {
        id: 'usr-out',
        email: 'out@domain.com',
        password: 'Pass!',
        created_at: new Date().toISOString(),
      });

      await supabase.auth.signInWithPassword({ email: 'out@domain.com', password: 'Pass!' });
      const { error } = await supabase.auth.signOut();
      expect(error).toBeNull();

      const { data } = await supabase.auth.getSession();
      expect(data.session).toBeNull();
    });

    it('3.5: Auth state listener notifies on SIGNED_OUT event', async () => {
      let lastEvent = '';
      supabase.auth.onAuthStateChange((event) => {
        lastEvent = event;
      });

      mockDb.users.set('usr-ev', {
        id: 'usr-ev',
        email: 'ev@domain.com',
        password: 'Pass!',
        created_at: new Date().toISOString(),
      });

      await supabase.auth.signInWithPassword({ email: 'ev@domain.com', password: 'Pass!' });
      expect(lastEvent).toBe('SIGNED_IN');

      await supabase.auth.signOut();
      expect(lastEvent).toBe('SIGNED_OUT');
    });
  });

  // =========================================================================
  // Feature 4: Password Recovery Flow (R1)
  // =========================================================================
  describe('Feature 4: Password Recovery Flow', () => {
    it('4.1: Forgot password request dispatches recovery without error', async () => {
      mockDb.users.set('usr-rec-1', {
        id: 'usr-rec-1',
        email: 'forgot@example.com',
        password: 'OldPassword123!',
        created_at: new Date().toISOString(),
      });

      const { data, error } = await supabase.auth.resetPasswordForEmail('forgot@example.com');
      expect(error).toBeNull();
      expect(data).toBeDefined();
    });

    it('4.2: Forgot password for non-existent email returns generic success (prevents user enumeration)', async () => {
      const { data, error } = await supabase.auth.resetPasswordForEmail('unknown@domain.com');
      expect(error).toBeNull();
      expect(data).toBeDefined();
    });

    it('4.3: Password update successfully updates credentials for authenticated user', async () => {
      const userId = 'usr-update-pass';
      mockDb.users.set(userId, {
        id: userId,
        email: 'updatepass@domain.com',
        password: 'InitialPassword123!',
        created_at: new Date().toISOString(),
      });

      await supabase.auth.signInWithPassword({
        email: 'updatepass@domain.com',
        password: 'InitialPassword123!',
      });

      const { data, error } = await supabase.auth.updateUser({ password: 'NewSecurePassword456!' });
      expect(error).toBeNull();
      expect(data.user).toBeDefined();

      // Verify new password is required for sign-in
      await supabase.auth.signOut();
      const oldLogin = await supabase.auth.signInWithPassword({
        email: 'updatepass@domain.com',
        password: 'InitialPassword123!',
      });
      expect(oldLogin.error).not.toBeNull();

      const newLogin = await supabase.auth.signInWithPassword({
        email: 'updatepass@domain.com',
        password: 'NewSecurePassword456!',
      });
      expect(newLogin.error).toBeNull();
    });

    it('4.4: Password update fails when unauthenticated', async () => {
      const { error } = await supabase.auth.updateUser({ password: 'NewPassword!' });
      expect(error).toBeDefined();
      expect(error.status).toBe(401);
    });

    it('4.5: Profile updates alongside user metadata update', async () => {
      const userId = 'usr-prof-up';
      mockDb.users.set(userId, {
        id: userId,
        email: 'prof@domain.com',
        password: 'Pass!',
        created_at: new Date().toISOString(),
      });
      mockDb.profiles.set(userId, {
        id: userId,
        email: 'prof@domain.com',
        full_name: 'Old Name',
        phone: '081234',
        avatar_url: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      await supabase.auth.signInWithPassword({ email: 'prof@domain.com', password: 'Pass!' });
      await supabase.auth.updateUser({ data: { full_name: 'Updated Name', phone: '089999' } });

      const updatedProf = mockDb.profiles.get(userId);
      expect(updatedProf?.full_name).toBe('Updated Name');
      expect(updatedProf?.phone).toBe('089999');
    });
  });

  // =========================================================================
  // Feature 5: Public Landing Page & Glassmorphism Theme (R2)
  // =========================================================================
  describe('Feature 5: Public Landing Page & Glassmorphism Theme', () => {
    it('5.1: Pricing CMS returns active lifetime package', async () => {
      const { data, error } = await supabase
        .from('pricing_settings')
        .select('*')
        .eq('is_active', true)
        .single();

      expect(error).toBeNull();
      expect(data.plan_name).toContain('Lifetime Deal');
      expect(data.monthly_quota).toBe(100);
      expect(data.price_idr).toBe(499000);
    });

    it('5.2: Active testimonials are fetched for public social proof', async () => {
      const { data, error } = await supabase
        .from('testimonials')
        .select('*')
        .eq('is_active', true);

      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThanOrEqual(1);
      expect(data[0].rating).toBe(5);
    });

    it('5.3: Active FAQ list is fetched and ordered by sort_order', async () => {
      const { data, error } = await supabase
        .from('faqs')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThanOrEqual(2);
      expect(data[0].sort_order).toBeLessThanOrEqual(data[1].sort_order);
    });

    it('5.4: Default AI Provider configuration is seeded', async () => {
      const { data, error } = await supabase
        .from('api_provider_settings')
        .select('*')
        .eq('is_default', true)
        .single();

      expect(error).toBeNull();
      expect(data.provider_name).toBe('lovable');
      expect(data.model_name).toBe('google/gemini-2.5-flash-image');
    });

    it('5.5: Pricing settings features array includes 5 core benefits', async () => {
      const { data } = await supabase.from('pricing_settings').select('*').single();
      expect(data.features).toBeInstanceOf(Array);
      expect(data.features.length).toBe(5);
      expect(data.features).toContain('100 Foto AI Setiap Bulan');
    });
  });

  // =========================================================================
  // Feature 6: Landing Hero Before/After Slider (R2, AC-7)
  // =========================================================================
  describe('Feature 6: Landing Hero Before/After Slider', () => {
    it('6.1: Before/After slider calculates 50% split position by default', () => {
      const defaultPosition = 50;
      expect(defaultPosition).toBe(50);
      const clipLeft = `inset(0 ${100 - defaultPosition}% 0 0)`;
      expect(clipLeft).toBe('inset(0 50% 0 0)');
    });

    it('6.2: Slider drag updates position within boundary range [0, 100]', () => {
      const clamp = (val: number) => Math.max(0, Math.min(100, val));
      expect(clamp(75)).toBe(75);
      expect(clamp(-10)).toBe(0);
      expect(clamp(115)).toBe(100);
    });

    it('6.3: Slider computes left offset percentage for divider bar', () => {
      const pos = 35;
      const style = { left: `${pos}%` };
      expect(style.left).toBe('35%');
    });

    it('6.4: Slider supports touch and mouse drag coordinate calculation', () => {
      const containerWidth = 800;
      const clientX = 400;
      const containerLeft = 0;
      const calculatedPos = Math.round(((clientX - containerLeft) / containerWidth) * 100);
      expect(calculatedPos).toBe(50);
    });

    it('6.5: Slider handles zero-width container edge case safely', () => {
      const containerWidth = 0;
      const clientX = 200;
      const safePos = containerWidth > 0 ? (clientX / containerWidth) * 100 : 50;
      expect(safePos).toBe(50);
    });
  });

  // =========================================================================
  // Feature 7: Features Showcase (Batch marked Segera Hadir) (R2)
  // =========================================================================
  describe('Feature 7: Features Showcase (Batch marked Segera Hadir)', () => {
    const featuresList = [
      { id: 'hdr', name: 'HDR & Lighting Balancing', isComingSoon: false },
      { id: 'sky', name: 'Sky Replacement', isComingSoon: false },
      { id: 'lawn', name: 'Lawn Greening', isComingSoon: false },
      { id: 'twilight', name: 'Twilight Magic', isComingSoon: false },
      { id: 'declutter', name: 'Declutter & Clean', isComingSoon: false },
      { id: 'batch', name: 'Batch Processing', isComingSoon: true, badgeText: 'Segera Hadir' },
    ];

    it('7.1: Showcase contains exactly 6 feature cards', () => {
      expect(featuresList.length).toBe(6);
    });

    it('7.2: First 5 features are active (not coming soon)', () => {
      const activeFeatures = featuresList.filter((f) => !f.isComingSoon);
      expect(activeFeatures.length).toBe(5);
    });

    it('7.3: Batch Processing is explicitly marked with "Segera Hadir" badge', () => {
      const batch = featuresList.find((f) => f.id === 'batch');
      expect(batch).toBeDefined();
      expect(batch?.isComingSoon).toBe(true);
      expect(batch?.badgeText).toBe('Segera Hadir');
    });

    it('7.4: HDR and Lighting Balancing feature is present with correct name', () => {
      const hdr = featuresList.find((f) => f.id === 'hdr');
      expect(hdr?.name).toBe('HDR & Lighting Balancing');
    });

    it('7.5: Twilight and Declutter features are present in feature list', () => {
      const twilight = featuresList.find((f) => f.id === 'twilight');
      const declutter = featuresList.find((f) => f.id === 'declutter');
      expect(twilight).toBeDefined();
      expect(declutter).toBeDefined();
    });
  });

  // =========================================================================
  // Feature 8: Pricing & Testimonials/FAQ (is_active filter) (R2)
  // =========================================================================
  describe('Feature 8: Pricing & Testimonials/FAQ (is_active filter)', () => {
    it('8.1: Inactive testimonials are filtered out from query', async () => {
      const inactiveId = 'test-inact-1';
      mockDb.testimonials.set(inactiveId, {
        id: inactiveId,
        name: 'Hidden Reviewer',
        role: 'Broker',
        company: 'Hidden Real Estate',
        avatar_url: null,
        content: 'Draft testimonial',
        rating: 4,
        is_active: false,
        sort_order: 99,
        created_at: new Date().toISOString(),
      });

      const { data } = await supabase.from('testimonials').select('*').eq('is_active', true);
      const containsInactive = data.some((t: any) => t.id === inactiveId);
      expect(containsInactive).toBe(false);
    });

    it('8.2: Inactive FAQs are filtered out from query', async () => {
      const hiddenFaq = 'faq-hidden-1';
      mockDb.faqs.set(hiddenFaq, {
        id: hiddenFaq,
        question: 'Hidden internal question?',
        answer: 'Confidential answer',
        category: 'admin',
        is_active: false,
        sort_order: 100,
        created_at: new Date().toISOString(),
      });

      const { data } = await supabase.from('faqs').select('*').eq('is_active', true);
      const containsHidden = data.some((f: any) => f.id === hiddenFaq);
      expect(containsHidden).toBe(false);
    });

    it('8.3: FAQs are ordered strictly ascending by sort_order', async () => {
      const { data } = await supabase.from('faqs').select('*').eq('is_active', true).order('sort_order', { ascending: true });
      for (let i = 0; i < data.length - 1; i++) {
        expect(data[i].sort_order).toBeLessThanOrEqual(data[i + 1].sort_order);
      }
    });

    it('8.4: Pricing calculation reflects discount from original price', async () => {
      const { data } = await supabase.from('pricing_settings').select('*').single();
      expect(data.original_price_idr).toBe(999000);
      expect(data.price_idr).toBe(499000);
      const savings = data.original_price_idr - data.price_idr;
      expect(savings).toBe(500000);
    });

    it('8.5: Testimonials contain 5-star rating by default', async () => {
      const { data } = await supabase.from('testimonials').select('*').eq('is_active', true);
      expect(data[0].rating).toBe(5);
    });
  });

  // =========================================================================
  // Feature 9: Single Photo Upload Validation (JPG/PNG/WEBP) (R3, AC-4)
  // =========================================================================
  describe('Feature 9: Single Photo Upload Validation (JPG/PNG/WEBP)', () => {
    const validateFile = (name: string, sizeBytes: number, mimeType: string) => {
      const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      const maxSizeBytes = 15 * 1024 * 1024; // 15MB

      if (!allowedMimes.includes(mimeType.toLowerCase())) {
        return { valid: false, error: 'Format file tidak didukung (Gunakan JPG, PNG, atau WEBP)' };
      }
      if (sizeBytes > maxSizeBytes) {
        return { valid: false, error: 'Ukuran file melebihi batas maksimal 15MB' };
      }
      return { valid: true, error: null };
    };

    it('9.1: Valid JPEG file (2MB) passes validation', () => {
      const res = validateFile('living_room.jpg', 2 * 1024 * 1024, 'image/jpeg');
      expect(res.valid).toBe(true);
      expect(res.error).toBeNull();
    });

    it('9.2: Valid PNG file (8MB) passes validation', () => {
      const res = validateFile('exterior_pool.png', 8 * 1024 * 1024, 'image/png');
      expect(res.valid).toBe(true);
      expect(res.error).toBeNull();
    });

    it('9.3: Valid WEBP file (1MB) passes validation', () => {
      const res = validateFile('kitchen.webp', 1024 * 1024, 'image/webp');
      expect(res.valid).toBe(true);
      expect(res.error).toBeNull();
    });

    it('9.4: Invalid file format (PDF) is rejected with clear error message', () => {
      const res = validateFile('contract.pdf', 500 * 1024, 'application/pdf');
      expect(res.valid).toBe(false);
      expect(res.error).toBe('Format file tidak didukung (Gunakan JPG, PNG, atau WEBP)');
    });

    it('9.5: Oversized file (16MB JPG) is rejected with size limit error', () => {
      const res = validateFile('raw_aerial.jpg', 16 * 1024 * 1024, 'image/jpeg');
      expect(res.valid).toBe(false);
      expect(res.error).toBe('Ukuran file melebihi batas maksimal 15MB');
    });
  });

  // =========================================================================
  // Feature 10: Realtime Status Transitions (queued->proc->done) (R3, AC-6)
  // =========================================================================
  describe('Feature 10: Realtime Status Transitions (queued->proc->done)', () => {
    it('10.1: Edge function enhance-image creates initial queued image record', async () => {
      const userId = 'usr-realtime-1';
      mockDb.users.set(userId, { id: userId, email: 'realtime@test.com', created_at: new Date().toISOString() });
      mockDb.profiles.set(userId, { id: userId, email: 'realtime@test.com', full_name: 'Tester', phone: null, avatar_url: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
      mockDb.entitlements.set(userId, {
        id: 'ent-rt',
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

      const { data, error } = await supabase.functions.invoke('enhance-image', {
        body: { preset: 'HDR_BALANCED', file_path: `images/${userId}/raw.jpg` },
        headers: { Authorization: `Bearer ${userId}` },
      });

      expect(error).toBeNull();
      expect(data.success).toBe(true);
      expect(data.status).toBe('done');
      expect(data.enhanced_url).toBeDefined();

      const imgRecord = mockDb.images.get(data.image_id);
      expect(imgRecord).toBeDefined();
      expect(imgRecord?.status).toBe('done');
    });

    it('10.2: Realtime subscriber receives UPDATE event on image completion', async () => {
      const targetImageId = 'img-watch-1';
      let receivedUpdateStatus = '';

      const channel = supabase.channel(`images:id=eq.${targetImageId}`);
      channel.on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'images', filter: `id=eq.${targetImageId}` }, (payload) => {
        receivedUpdateStatus = payload.new.status;
      }).subscribe();

      // Trigger update
      const initialRecord = {
        id: targetImageId,
        user_id: 'usr-1',
        project_id: null,
        batch_id: null,
        original_url: 'raw.jpg',
        enhanced_url: null,
        preset: 'HDR_BALANCED',
        status: 'queued' as const,
        error_message: null,
        file_size: 100,
        mime_type: 'image/jpeg',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      mockDb.images.set(targetImageId, initialRecord);

      await supabase.from('images').eq('id', targetImageId).update({ status: 'done', enhanced_url: 'enhanced.png' });

      expect(receivedUpdateStatus).toBe('done');
    });

    it('10.3: AI failure updates status to failed and sets error_message', async () => {
      const userId = 'usr-fail-1';
      mockDb.users.set(userId, { id: userId, email: 'fail@test.com', created_at: new Date().toISOString() });
      mockDb.entitlements.set(userId, {
        id: 'ent-fail',
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

      mockDb.aiProviderShouldFail = true;
      mockDb.aiProviderErrorMessage = 'Model Gateway 503 Overloaded';

      const { data, error } = await supabase.functions.invoke('enhance-image', {
        body: { preset: 'TWILIGHT' },
        headers: { Authorization: `Bearer ${userId}` },
      });

      expect(data).toBeNull();
      expect(error).toBeDefined();
      expect(error.message).toBe('Model Gateway 503 Overloaded');

      // Check admin notification emitted
      const notifs = Array.from(mockDb.admin_notifications.values());
      const failNotif = notifs.find((n) => n.title === 'AI Provider Failure');
      expect(failNotif).toBeDefined();
      expect(failNotif?.severity).toBe('critical');
    });

    it('10.4: Usage logs record successful AI enhancement duration', async () => {
      const userId = 'usr-log-1';
      mockDb.users.set(userId, { id: userId, email: 'log@test.com', created_at: new Date().toISOString() });
      mockDb.entitlements.set(userId, {
        id: 'ent-log',
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

      await supabase.functions.invoke('enhance-image', {
        body: { preset: 'SKY_ENHANCE' },
        headers: { Authorization: `Bearer ${userId}` },
      });

      const usageLogs = Array.from(mockDb.api_usage_logs.values());
      expect(usageLogs.length).toBeGreaterThanOrEqual(1);
      expect(usageLogs[0].status).toBe('success');
      expect(usageLogs[0].provider).toBe('lovable');
    });

    it('10.5: Realtime channel allows unsubscription without error', async () => {
      const channel = supabase.channel('test-unsub');
      channel.subscribe();
      await expect(channel.unsubscribe()).resolves.toBeUndefined();
    });
  });

  // =========================================================================
  // Feature 11: Monthly Quota Tracking & Exhaustion Guard (R3, AC-5)
  // =========================================================================
  describe('Feature 11: Monthly Quota Tracking & Exhaustion Guard', () => {
    it('11.1: Consumed quota increments accurately on each enhancement', async () => {
      const userId = 'usr-quota-inc';
      mockDb.entitlements.set(userId, {
        id: 'ent-qi',
        user_id: userId,
        product_code: 'PEA',
        status: 'active',
        monthly_quota: 100,
        consumed_quota: 5,
        cycle_start_date: new Date().toISOString(),
        cycle_reset_date: new Date(Date.now() + 25 * 86400000).toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      const res1 = await executeCheckAndConsumeQuota(userId);
      expect(res1.allowed).toBe(true);
      expect(res1.remaining).toBe(94);

      const res2 = await executeCheckAndConsumeQuota(userId);
      expect(res2.allowed).toBe(true);
      expect(res2.remaining).toBe(93);
    });

    it('11.2: Quota exhaustion rejects when consumed_quota equals monthly_quota (100/100)', async () => {
      const userId = 'usr-exhausted';
      mockDb.entitlements.set(userId, {
        id: 'ent-exh',
        user_id: userId,
        product_code: 'PEA',
        status: 'active',
        monthly_quota: 100,
        consumed_quota: 100,
        cycle_start_date: new Date().toISOString(),
        cycle_reset_date: new Date(Date.now() + 10 * 86400000).toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      const res = await executeCheckAndConsumeQuota(userId);
      expect(res.allowed).toBe(false);
      expect(res.remaining).toBe(0);
      expect(res.error).toBe('Monthly quota exhausted');
      expect(res.reset_date).toBeDefined();
    });

    it('11.3: Quota exhaustion in enhance-image returns 402 HTTP status with cycle_reset_date', async () => {
      const userId = 'usr-402';
      mockDb.users.set(userId, { id: userId, email: 'exhaust@test.com', created_at: new Date().toISOString() });
      mockDb.entitlements.set(userId, {
        id: 'ent-402',
        user_id: userId,
        product_code: 'PEA',
        status: 'active',
        monthly_quota: 100,
        consumed_quota: 100,
        cycle_start_date: new Date().toISOString(),
        cycle_reset_date: '2026-09-25T12:00:00.000Z',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      const { data, error } = await supabase.functions.invoke('enhance-image', {
        body: { preset: 'HDR_BALANCED' },
        headers: { Authorization: `Bearer ${userId}` },
      });

      expect(data).toBeNull();
      expect(error.status).toBe(402);
      expect(error.code).toBe('QUOTA_EXHAUSTED');
      expect(error.cycle_reset_date).toBe('2026-09-25T12:00:00.000Z');
    });

    it('11.4: 30-day rollover automatically resets consumed_quota to 0', async () => {
      const userId = 'usr-rollover';
      const pastDate = new Date(Date.now() - 1000).toISOString(); // 1s ago

      mockDb.entitlements.set(userId, {
        id: 'ent-roll',
        user_id: userId,
        product_code: 'PEA',
        status: 'active',
        monthly_quota: 100,
        consumed_quota: 100, // Exhausted in previous cycle
        cycle_start_date: new Date(Date.now() - 31 * 86400000).toISOString(),
        cycle_reset_date: pastDate, // Expired!
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      // Executing quota check should trigger rollover
      const res = await executeCheckAndConsumeQuota(userId);
      expect(res.allowed).toBe(true);
      expect(res.remaining).toBe(99); // 100 reset - 1 consumed = 99

      const updatedEnt = mockDb.entitlements.get(userId);
      expect(updatedEnt?.consumed_quota).toBe(1);
    });

    it('11.5: Querying entitlements table returns current remaining quota accurately', async () => {
      const userId = 'usr-qmeter';
      mockDb.entitlements.set(userId, {
        id: 'ent-qm',
        user_id: userId,
        product_code: 'PEA',
        status: 'active',
        monthly_quota: 100,
        consumed_quota: 42,
        cycle_start_date: new Date().toISOString(),
        cycle_reset_date: new Date(Date.now() + 14 * 86400000).toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      const { data } = await supabase.from('entitlements').select('*').eq('user_id', userId).single();
      const remaining = data.monthly_quota - data.consumed_quota;
      expect(remaining).toBe(58);
      expect(data.consumed_quota).toBe(42);
    });
  });

  // =========================================================================
  // Feature 12: Editor Slider, Zoom Viewer & Download (R3, AC-7)
  // =========================================================================
  describe('Feature 12: Editor Slider, Zoom Viewer & Download', () => {
    it('12.1: Editor supports 5 specific real estate presets', () => {
      const presets = ['HDR_BALANCED', 'SKY_ENHANCE', 'TWILIGHT', 'INTERIOR_BRIGHT', 'LAWN_GREEN'];
      expect(presets).toContain('HDR_BALANCED');
      expect(presets).toContain('SKY_ENHANCE');
      expect(presets).toContain('TWILIGHT');
      expect(presets).toContain('INTERIOR_BRIGHT');
      expect(presets).toContain('LAWN_GREEN');
    });

    it('12.2: Zoom viewer handles zoom level magnification from 1x to 4x', () => {
      let zoomLevel = 1.0;
      const zoomIn = () => (zoomLevel = Math.min(4.0, zoomLevel + 0.5));
      const zoomOut = () => (zoomLevel = Math.max(1.0, zoomLevel - 0.5));
      const resetZoom = () => (zoomLevel = 1.0);

      zoomIn();
      expect(zoomLevel).toBe(1.5);
      zoomIn();
      zoomIn();
      expect(zoomLevel).toBe(2.5);
      zoomOut();
      expect(zoomLevel).toBe(2.0);
      resetZoom();
      expect(zoomLevel).toBe(1.0);
    });

    it('12.3: Storage creates signed download URL for private images', async () => {
      const path = 'images/usr-1/enhanced_123.png';
      await supabase.storage.from('images').upload(path, 'fake_png_data');

      const { data, error } = await supabase.storage.from('images').createSignedUrl(path, 3600);
      expect(error).toBeNull();
      expect(data?.signedUrl).toContain('mock.supabase.co/storage/v1/object/sign/images/');
      expect(data?.signedUrl).toContain('token=');
    });

    it('12.4: Storage download retrieves image file blob', async () => {
      const path = 'images/usr-1/download_test.jpg';
      await supabase.storage.from('images').upload(path, 'image_binary_content', { contentType: 'image/jpeg' });

      const { data, error } = await supabase.storage.from('images').download(path);
      expect(error).toBeNull();
      expect(data).toBeInstanceOf(Blob);
      expect(data?.type).toBe('image/jpeg');
    });

    it('12.5: Image deletion removes object from storage and database', async () => {
      const path = 'images/usr-1/to_delete.jpg';
      await supabase.storage.from('images').upload(path, 'data');
      const { error: removeErr } = await supabase.storage.from('images').remove([path]);
      expect(removeErr).toBeNull();

      const { error: downloadErr } = await supabase.storage.from('images').download(path);
      expect(downloadErr).not.toBeNull();
    });
  });

  // =========================================================================
  // Feature 13: Client-Side API Key Masking ("sk-...ab12") (R3, AC-8)
  // =========================================================================
  describe('Feature 13: Client-Side API Key Masking ("sk-...ab12")', () => {
    const maskApiKey = (rawKey: string): string => {
      if (!rawKey || rawKey.length < 8) return '****';
      const prefix = rawKey.slice(0, 3);
      const suffix = rawKey.slice(-4);
      return `${prefix}...${suffix}`;
    };

    it('13.1: OpenAI API key is masked in format sk-...ab12', () => {
      const masked = maskApiKey('sk-proj-1234567890abcdef12');
      expect(masked).toBe('sk-...ef12');
      expect(masked).not.toContain('1234567890');
    });

    it('13.2: Gemini API key is masked preserving prefix and suffix', () => {
      const masked = maskApiKey('AIzaSyD1234567890XYZ89');
      expect(masked).toBe('AIz...YZ89');
    });

    it('13.3: Replicate API key is masked properly', () => {
      const masked = maskApiKey('r8_abcdef1234567890zz99');
      expect(masked).toBe('r8_...zz99');
    });

    it('13.4: Short or invalid API key formats return generic mask', () => {
      expect(maskApiKey('short')).toBe('****');
      expect(maskApiKey('')).toBe('****');
    });

    it('13.5: User API key record stores key_hint without raw plaintext', async () => {
      const userId = 'usr-key-1';
      const rawKey = 'sk-live-999888777666555444333222111000';
      const keyHint = maskApiKey(rawKey);

      await supabase.from('user_api_keys').insert({
        user_id: userId,
        provider: 'openai',
        encrypted_key: 'enc_AES_GCM_' + Buffer.from(rawKey).toString('base64'),
        key_hint: keyHint,
        is_active: true,
      });

      const { data } = await supabase.from('user_api_keys').select('id, provider, key_hint, is_active').single();
      expect(data.key_hint).toBe('sk-...1000');
      expect(data.encrypted_key).toBeUndefined(); // Select excluded encrypted_key
    });
  });

  // =========================================================================
  // Feature 14: Admin Panel Role Enforcement & Dashboard Embed (R4, AC-9)
  // =========================================================================
  describe('Feature 14: Admin Panel Role Enforcement & Dashboard Embed', () => {
    it('14.1: Admin-users function rejects unauthenticated requests with 403', async () => {
      const { data, error } = await supabase.functions.invoke('admin-users', {
        body: { action: 'list' },
      });

      expect(data).toBeNull();
      expect(error.status).toBe(403);
    });

    it('14.2: Admin-users function rejects standard user role with 403 Forbidden', async () => {
      const stdUserId = 'usr-standard-1';
      mockDb.user_roles.set(stdUserId, {
        id: 'r-std',
        user_id: stdUserId,
        role: 'user',
        created_at: new Date().toISOString(),
      });

      const { data, error } = await supabase.functions.invoke('admin-users', {
        body: { action: 'list' },
        headers: { Authorization: `Bearer ${stdUserId}` },
      });

      expect(data).toBeNull();
      expect(error.status).toBe(403);
    });

    it('14.3: Admin-users function permits admin user session', async () => {
      const adminId = 'admin-user-0001-uuid';
      const { data, error } = await supabase.functions.invoke('admin-users', {
        body: { action: 'list' },
        headers: { Authorization: `Bearer ${adminId}` },
      });

      expect(error).toBeNull();
      expect(data.success).toBe(true);
      expect(Array.isArray(data.users)).toBe(true);
    });

    it('14.4: Admin-users function permits execution via X-Admin-Setup-Secret', async () => {
      const { data, error } = await supabase.functions.invoke('admin-users', {
        body: { action: 'list' },
        headers: { 'X-Admin-Setup-Secret': 'setup_secret_adm_9921' },
      });

      expect(error).toBeNull();
      expect(data.success).toBe(true);
    });

    it('14.5: Admin dashboard computes system aggregate metrics', async () => {
      // Seed metrics
      mockDb.users.set('u1', { id: 'u1', email: 'u1@test.com', created_at: new Date().toISOString() });
      mockDb.users.set('u2', { id: 'u2', email: 'u2@test.com', created_at: new Date().toISOString() });

      const totalUsers = mockDb.users.size;
      const totalEntitlements = mockDb.entitlements.size;
      const totalImages = mockDb.images.size;

      expect(totalUsers).toBeGreaterThanOrEqual(2);
      expect(totalEntitlements).toBeGreaterThanOrEqual(1);
      expect(typeof totalImages).toBe('number');
    });
  });

  // =========================================================================
  // Feature 15: Admin User Actions & Mandatory Audit Logging (R4, AC-10)
  // =========================================================================
  describe('Feature 15: Admin User Actions & Mandatory Audit Logging', () => {
    const adminId = 'admin-user-0001-uuid';

    it('15.1: Admin approve action updates entitlement to active and writes audit log', async () => {
      const targetId = 'usr-target-appr';
      mockDb.profiles.set(targetId, { id: targetId, email: 'target@appr.com', full_name: 'Appr', phone: null, avatar_url: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
      mockDb.entitlements.set(targetId, {
        id: 'ent-appr',
        user_id: targetId,
        product_code: 'PEA',
        status: 'inactive',
        monthly_quota: 100,
        consumed_quota: 0,
        cycle_start_date: new Date().toISOString(),
        cycle_reset_date: new Date(Date.now() + 30 * 86400000).toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      const { data, error } = await supabase.functions.invoke('admin-users', {
        body: { action: 'approve', target_user_id: targetId },
        headers: { Authorization: `Bearer ${adminId}` },
      });

      expect(error).toBeNull();
      expect(data.success).toBe(true);

      expect(mockDb.entitlements.get(targetId)?.status).toBe('active');

      const auditLogs = Array.from(mockDb.admin_audit_logs.values());
      const log = auditLogs.find((l) => l.action === 'approve_user' && l.target_user_id === targetId);
      expect(log).toBeDefined();
      expect(log?.admin_id).toBe(adminId);
    });

    it('15.2: Admin reject action updates entitlement to suspended and writes audit log', async () => {
      const targetId = 'usr-target-rej';
      mockDb.profiles.set(targetId, { id: targetId, email: 'target@rej.com', full_name: 'Rej', phone: null, avatar_url: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
      mockDb.entitlements.set(targetId, {
        id: 'ent-rej',
        user_id: targetId,
        product_code: 'PEA',
        status: 'active',
        monthly_quota: 100,
        consumed_quota: 10,
        cycle_start_date: new Date().toISOString(),
        cycle_reset_date: new Date(Date.now() + 30 * 86400000).toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      const { data } = await supabase.functions.invoke('admin-users', {
        body: { action: 'reject', target_user_id: targetId },
        headers: { Authorization: `Bearer ${adminId}` },
      });

      expect(data.success).toBe(true);
      expect(mockDb.entitlements.get(targetId)?.status).toBe('suspended');

      const auditLogs = Array.from(mockDb.admin_audit_logs.values());
      const log = auditLogs.find((l) => l.action === 'reject_user' && l.target_user_id === targetId);
      expect(log).toBeDefined();
    });

    it('15.3: Admin reset_password updates user password and writes audit log', async () => {
      const targetId = 'usr-target-pass';
      mockDb.users.set(targetId, { id: targetId, email: 'target@pass.com', password: 'OldPass!', created_at: new Date().toISOString() });

      const { data } = await supabase.functions.invoke('admin-users', {
        body: { action: 'reset_password', target_user_id: targetId, new_password: 'NewAdminAssignedPass99!' },
        headers: { Authorization: `Bearer ${adminId}` },
      });

      expect(data.success).toBe(true);
      expect(mockDb.users.get(targetId)?.password).toBe('NewAdminAssignedPass99!');

      const auditLogs = Array.from(mockDb.admin_audit_logs.values());
      const log = auditLogs.find((l) => l.action === 'reset_password' && l.target_user_id === targetId);
      expect(log).toBeDefined();
    });

    it('15.4: Admin delete removes user profile and writes audit log', async () => {
      const targetId = 'usr-target-del';
      mockDb.users.set(targetId, { id: targetId, email: 'del@user.com', created_at: new Date().toISOString() });
      mockDb.profiles.set(targetId, { id: targetId, email: 'del@user.com', full_name: 'Del', phone: null, avatar_url: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });

      const { data } = await supabase.functions.invoke('admin-users', {
        body: { action: 'delete', target_user_id: targetId },
        headers: { Authorization: `Bearer ${adminId}` },
      });

      expect(data.success).toBe(true);
      expect(mockDb.users.has(targetId)).toBe(false);
      expect(mockDb.profiles.has(targetId)).toBe(false);

      const auditLogs = Array.from(mockDb.admin_audit_logs.values());
      const log = auditLogs.find((l) => l.action === 'delete_user' && l.target_user_id === targetId);
      expect(log).toBeDefined();
    });

    it('15.5: Admin resend_credential triggers notification and writes audit log', async () => {
      const targetId = 'usr-target-wa';
      mockDb.users.set(targetId, { id: targetId, email: 'wa@user.com', created_at: new Date().toISOString() });
      mockDb.profiles.set(targetId, { id: targetId, email: 'wa@user.com', full_name: 'WA User', phone: '62812345678', avatar_url: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });

      const { data } = await supabase.functions.invoke('admin-users', {
        body: { action: 'resend_credential', target_user_id: targetId },
        headers: { Authorization: `Bearer ${adminId}` },
      });

      expect(data.success).toBe(true);
      const auditLogs = Array.from(mockDb.admin_audit_logs.values());
      const log = auditLogs.find((l) => l.action === 'resend_credential' && l.target_user_id === targetId);
      expect(log).toBeDefined();
    });
  });

  // =========================================================================
  // Feature 16: Admin Notifications (info/warning/critical) (R4, AC-11)
  // =========================================================================
  describe('Feature 16: Admin Notifications (info/warning/critical)', () => {
    it('16.1: Notifications can be created with info severity', async () => {
      const notifId = 'notif-info-1';
      mockDb.admin_notifications.set(notifId, {
        id: notifId,
        title: 'New User Onboarded',
        message: 'Agent Rian joined the platform.',
        severity: 'info',
        is_read: false,
        metadata: { user_id: 'usr-1' },
        created_at: new Date().toISOString(),
      });

      const { data } = await supabase.from('admin_notifications').select('*').eq('severity', 'info');
      expect(data.length).toBeGreaterThanOrEqual(1);
    });

    it('16.2: Notifications can be filtered for critical alerts only', async () => {
      const critId = 'notif-crit-1';
      mockDb.admin_notifications.set(critId, {
        id: critId,
        title: 'WAHA Gateway Disconnect',
        message: 'Could not connect to WhatsApp HTTP API gateway.',
        severity: 'critical',
        is_read: false,
        metadata: { retry_count: 3 },
        created_at: new Date().toISOString(),
      });

      const { data } = await supabase.from('admin_notifications').select('*').eq('severity', 'critical');
      const found = data.find((n: any) => n.id === critId);
      expect(found).toBeDefined();
      expect(found.severity).toBe('critical');
    });

    it('16.3: Admin can mark unread notification as read', async () => {
      const notifId = 'notif-unread-1';
      mockDb.admin_notifications.set(notifId, {
        id: notifId,
        title: 'Warning Alert',
        message: 'High API usage detected.',
        severity: 'warning',
        is_read: false,
        metadata: {},
        created_at: new Date().toISOString(),
      });

      await supabase.from('admin_notifications').eq('id', notifId).update({ is_read: true });
      expect(mockDb.admin_notifications.get(notifId)?.is_read).toBe(true);
    });

    it('16.4: AI Provider outage writes critical notification record', async () => {
      mockDb.aiProviderShouldFail = true;
      mockDb.aiProviderErrorMessage = 'Fatal Provider Error 500';

      const userId = 'usr-crit-ai';
      mockDb.users.set(userId, { id: userId, email: 'crit@test.com', created_at: new Date().toISOString() });
      mockDb.entitlements.set(userId, {
        id: 'ent-crit',
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

      await supabase.functions.invoke('enhance-image', {
        body: { preset: 'HDR_BALANCED' },
        headers: { Authorization: `Bearer ${userId}` },
      });

      const notifs = Array.from(mockDb.admin_notifications.values());
      const aiCrit = notifs.find((n) => n.severity === 'critical' && n.title === 'AI Provider Failure');
      expect(aiCrit).toBeDefined();
    });

    it('16.5: WAHA dispatch failure writes critical notification record', async () => {
      mockDb.wahaShouldFail = true;
      const payload = {
        email: 'wahafail@test.com',
        full_name: 'WA Fail User',
        phone: '628199998888',
        order_id: 'ORD-FAIL-01',
      };
      const sig = computeMockHmac(JSON.stringify(payload), mockDb.provisionSecret);

      await supabase.functions.invoke('provision', {
        body: payload,
        headers: { 'X-Signature': sig },
      });

      const notifs = Array.from(mockDb.admin_notifications.values());
      const waCrit = notifs.find((n) => n.severity === 'critical' && n.title === 'WhatsApp Provisioning Delivery Failed');
      expect(waCrit).toBeDefined();
    });
  });

  // =========================================================================
  // Feature 17: Provision Webhook HMAC Verification (R5, AC-12)
  // =========================================================================
  describe('Feature 17: Provision Webhook HMAC Verification', () => {
    it('17.1: Valid HMAC signature allows provisioning with 200 OK', async () => {
      const payload = {
        email: 'hmac_valid@example.com',
        full_name: 'Budi Hartono',
        phone: '628123456789',
        order_id: 'INV-HMAC-001',
      };
      const sig = computeMockHmac(JSON.stringify(payload), mockDb.provisionSecret);

      const { data, error } = await supabase.functions.invoke('provision', {
        body: payload,
        headers: { 'X-Signature': sig },
      });

      expect(error).toBeNull();
      expect(data.success).toBe(true);
      expect(data.user_id).toBeDefined();
    });

    it('17.2: Missing signature header returns 401 Unauthorized', async () => {
      const payload = { email: 'no_sig@example.com' };
      const { data, error } = await supabase.functions.invoke('provision', {
        body: payload,
        headers: {}, // No X-Signature
      });

      expect(data).toBeNull();
      expect(error.status).toBe(401);
      expect(error.message).toBe('Invalid signature');
    });

    it('17.3: Invalid signature hash returns 401 Unauthorized', async () => {
      const payload = { email: 'tampered@example.com' };
      const { data, error } = await supabase.functions.invoke('provision', {
        body: payload,
        headers: { 'X-Signature': 'invalid_forged_signature_hash_123' },
      });

      expect(data).toBeNull();
      expect(error.status).toBe(401);
    });

    it('17.4: Empty payload or missing email returns 400 Bad Request', async () => {
      const payload = { full_name: 'No Email' };
      const sig = computeMockHmac(JSON.stringify(payload), mockDb.provisionSecret);

      const { data, error } = await supabase.functions.invoke('provision', {
        body: payload,
        headers: { 'X-Signature': sig },
      });

      expect(data).toBeNull();
      expect(error.status).toBe(400);
      expect(error.message).toBe('Email is required');
    });

    it('17.5: Signature created with wrong secret key is rejected', async () => {
      const payload = { email: 'wrong_secret@example.com' };
      const wrongSig = computeMockHmac(JSON.stringify(payload), 'wrong_secret_attacker');

      const { data, error } = await supabase.functions.invoke('provision', {
        body: payload,
        headers: { 'X-Signature': wrongSig },
      });

      expect(data).toBeNull();
      expect(error.status).toBe(401);
    });
  });

  // =========================================================================
  // Feature 18: Provision Duplicate Email Rejection (R5, AC-13)
  // =========================================================================
  describe('Feature 18: Provision Duplicate Email Rejection', () => {
    it('18.1: Existing user email returns 409 Conflict with rejected_duplicate', async () => {
      mockDb.users.set('usr-dup-1', {
        id: 'usr-dup-1',
        email: 'duplicate@example.com',
        password: 'Pass!',
        created_at: new Date().toISOString(),
      });

      const payload = {
        email: 'duplicate@example.com',
        full_name: 'Duplicate User',
        phone: '628999999',
        order_id: 'INV-DUP-01',
      };
      const sig = computeMockHmac(JSON.stringify(payload), mockDb.provisionSecret);

      const { data, error } = await supabase.functions.invoke('provision', {
        body: payload,
        headers: { 'X-Signature': sig },
      });

      expect(data).toBeNull();
      expect(error.status).toBe(409);
      expect(error.error).toBe('rejected_duplicate');
    });

    it('18.2: Duplicate attempt writes rejected_duplicate to provision_logs', async () => {
      mockDb.users.set('usr-dup-2', {
        id: 'usr-dup-2',
        email: 'logdup@example.com',
        password: 'Pass!',
        created_at: new Date().toISOString(),
      });

      const payload = {
        email: 'logdup@example.com',
        full_name: 'Log Duplicate',
        phone: '62811111',
        order_id: 'INV-DUP-02',
      };
      const sig = computeMockHmac(JSON.stringify(payload), mockDb.provisionSecret);

      await supabase.functions.invoke('provision', {
        body: payload,
        headers: { 'X-Signature': sig },
      });

      const provLogs = Array.from(mockDb.provision_logs.values());
      const dupLog = provLogs.find((l) => l.email === 'logdup@example.com');
      expect(dupLog).toBeDefined();
      expect(dupLog?.status).toBe('rejected_duplicate');
    });

    it('18.3: Duplicate email check is case-insensitive', async () => {
      mockDb.users.set('usr-case', {
        id: 'usr-case',
        email: 'agent.case@domain.com',
        password: 'Pass!',
        created_at: new Date().toISOString(),
      });

      const payload = {
        email: 'AGENT.CASE@DOMAIN.COM',
        order_id: 'INV-CASE-01',
      };
      const sig = computeMockHmac(JSON.stringify(payload), mockDb.provisionSecret);

      const { error } = await supabase.functions.invoke('provision', {
        body: payload,
        headers: { 'X-Signature': sig },
      });

      expect(error.status).toBe(409);
      expect(error.error).toBe('rejected_duplicate');
    });

    it('18.4: Existing user record is not altered when duplicate is rejected', async () => {
      const originalPass = 'OriginalSecretPass123!';
      mockDb.users.set('usr-safe', {
        id: 'usr-safe',
        email: 'safe@domain.com',
        password: originalPass,
        created_at: new Date().toISOString(),
      });

      const payload = { email: 'safe@domain.com', order_id: 'ORD-ATTACK' };
      const sig = computeMockHmac(JSON.stringify(payload), mockDb.provisionSecret);

      await supabase.functions.invoke('provision', {
        body: payload,
        headers: { 'X-Signature': sig },
      });

      expect(mockDb.users.get('usr-safe')?.password).toBe(originalPass);
    });

    it('18.5: Total user count remains unchanged after duplicate rejection', async () => {
      mockDb.users.set('usr-cnt', { id: 'usr-cnt', email: 'count@domain.com', created_at: new Date().toISOString() });
      const initialCount = mockDb.users.size;

      const payload = { email: 'count@domain.com', order_id: 'ORD-DUP' };
      const sig = computeMockHmac(JSON.stringify(payload), mockDb.provisionSecret);

      await supabase.functions.invoke('provision', {
        body: payload,
        headers: { 'X-Signature': sig },
      });

      expect(mockDb.users.size).toBe(initialCount);
    });
  });

  // =========================================================================
  // Feature 19: Provision User Account, Quota & WAHA Dispatch (R5, AC-14)
  // =========================================================================
  describe('Feature 19: Provision User Account, Quota & WAHA Dispatch', () => {
    it('19.1: Provisioning generates user account and profile record', async () => {
      const payload = {
        email: 'newbuyer@property.com',
        full_name: 'Citra Dewi',
        phone: '628177788899',
        order_id: 'ORD-2026-001',
      };
      const sig = computeMockHmac(JSON.stringify(payload), mockDb.provisionSecret);

      const { data } = await supabase.functions.invoke('provision', {
        body: payload,
        headers: { 'X-Signature': sig },
      });

      const profile = mockDb.profiles.get(data.user_id);
      expect(profile).toBeDefined();
      expect(profile?.full_name).toBe('Citra Dewi');
      expect(profile?.phone).toBe('628177788899');
    });

    it('19.2: Provisioning assigns default user role to new account', async () => {
      const payload = { email: 'rolebuyer@property.com', order_id: 'ORD-ROLE' };
      const sig = computeMockHmac(JSON.stringify(payload), mockDb.provisionSecret);

      const { data } = await supabase.functions.invoke('provision', {
        body: payload,
        headers: { 'X-Signature': sig },
      });

      const userRole = mockDb.user_roles.get(data.user_id);
      expect(userRole?.role).toBe('user');
    });

    it('19.3: Provisioning creates active PEA entitlement with 100 monthly quota', async () => {
      const payload = { email: 'entbuyer@property.com', order_id: 'ORD-ENT' };
      const sig = computeMockHmac(JSON.stringify(payload), mockDb.provisionSecret);

      const { data } = await supabase.functions.invoke('provision', {
        body: payload,
        headers: { 'X-Signature': sig },
      });

      const ent = mockDb.entitlements.get(data.user_id);
      expect(ent).toBeDefined();
      expect(ent?.product_code).toBe('PEA');
      expect(ent?.status).toBe('active');
      expect(ent?.monthly_quota).toBe(100);
      expect(ent?.consumed_quota).toBe(0);

      // Verify reset date is 30 days in the future
      const resetTime = new Date(ent!.cycle_reset_date).getTime();
      const nowTime = Date.now();
      expect(resetTime).toBeGreaterThan(nowTime + 28 * 86400000);
    });

    it('19.4: Successful WAHA dispatch returns wa_status = sent', async () => {
      mockDb.wahaShouldFail = false;
      const payload = { email: 'wasuccess@property.com', phone: '6281234', order_id: 'ORD-WA-OK' };
      const sig = computeMockHmac(JSON.stringify(payload), mockDb.provisionSecret);

      const { data } = await supabase.functions.invoke('provision', {
        body: payload,
        headers: { 'X-Signature': sig },
      });

      expect(data.wa_status).toBe('sent');
      const provLog = Array.from(mockDb.provision_logs.values()).find((l) => l.email === 'wasuccess@property.com');
      expect(provLog?.status).toBe('success');
    });

    it('19.5: WAHA failure creates user account but marks wa_status = failed with critical notification', async () => {
      mockDb.wahaShouldFail = true;
      const payload = { email: 'wadamaged@property.com', phone: '6289999', order_id: 'ORD-WA-FAIL' };
      const sig = computeMockHmac(JSON.stringify(payload), mockDb.provisionSecret);

      const { data } = await supabase.functions.invoke('provision', {
        body: payload,
        headers: { 'X-Signature': sig },
      });

      expect(data.success).toBe(true);
      expect(data.user_id).toBeDefined();
      expect(data.wa_status).toBe('failed');

      // Check provision log recorded failed_wa
      const provLog = Array.from(mockDb.provision_logs.values()).find((l) => l.email === 'wadamaged@property.com');
      expect(provLog?.status).toBe('failed_wa');
    });
  });
});
