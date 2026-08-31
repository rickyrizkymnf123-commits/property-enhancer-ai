/**
 * Adversarial Stress Testing & Edge-Case Verification Suite for Milestone 7
 * (AI Studio Error Handling & Kobil LLM Proxy Auth Integration)
 *
 * Authored by: Challenger 2 (Empirical Adversarial Verification)
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act, renderHook } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ToastProvider } from '../../src/contexts/ToastContext';
import { AuthProvider } from '../../src/contexts/AuthContext';
import { EditorPage } from '../../src/pages/app/EditorPage';
import { KobilLlmConfigView } from '../../src/components/admin/KobilLlmConfigView';
import { BeforeAfterSlider } from '../../src/components/studio/BeforeAfterSlider';
import { useRealtimeEnhancement } from '../../src/hooks/useRealtimeEnhancement';
import { mockDb, supabase } from '../../src/lib/mockSupabase';
import { isMaskedKeyString } from '../../src/lib/maskUtils';
import { handleEnhanceImage } from '../../supabase/functions/enhance-image/index';
import { handleListModels } from '../../supabase/functions/list-ai-models/index';
import { handleAiChat } from '../../supabase/functions/ai-chat/index';

const testUserId = 'test-adv-user-uuid-101';

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <MemoryRouter initialEntries={['/app/editor']}>
      <ToastProvider>
        <AuthProvider>{ui}</AuthProvider>
      </ToastProvider>
    </MemoryRouter>
  );
};

describe('Adversarial Stress Testing & Edge-Case Verification (Milestone 7)', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    mockDb.reset();
    localStorage.clear();
    originalFetch = globalThis.fetch;
    vi.restoreAllMocks();

    // Polyfill URL methods for jsdom
    if (typeof window !== 'undefined') {
      window.URL.createObjectURL = vi.fn().mockReturnValue('blob:mock-image-url');
      window.URL.revokeObjectURL = vi.fn();
    }

    // Seed test user with profile & active PEA entitlement
    mockDb.users.set(testUserId, {
      id: testUserId,
      email: 'tester@propertyenhancer.ai',
      created_at: new Date().toISOString(),
    });

    mockDb.profiles.set(testUserId, {
      id: testUserId,
      email: 'tester@propertyenhancer.ai',
      full_name: 'Adversarial Tester',
      phone: '628123456789',
      avatar_url: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    mockDb.user_roles.set(testUserId, {
      id: `role-${testUserId}`,
      user_id: testUserId,
      role: 'user',
      created_at: new Date().toISOString(),
    });

    mockDb.entitlements.set(testUserId, {
      id: `ent-${testUserId}`,
      user_id: testUserId,
      product_code: 'PEA',
      status: 'active',
      monthly_quota: 100,
      consumed_quota: 5,
      cycle_start_date: new Date().toISOString(),
      cycle_reset_date: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // Set active mock auth session
    supabase.setMockSession({
      access_token: `mock_jwt_${testUserId}`,
      token_type: 'bearer',
      expires_in: 3600,
      refresh_token: `mock_ref_${testUserId}`,
      user: {
        id: testUserId,
        email: 'tester@propertyenhancer.ai',
        created_at: new Date().toISOString(),
      },
    });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  // =========================================================================
  // Vector 1: Rapid State Transitions & Race Conditions
  // =========================================================================
  describe('Vector 1: Rapid State Transitions & Race Conditions', () => {
    it('1.1 should withstand rapid multi-cycle state oscillations (Success -> 401 Fail -> 200 Success -> 500 Fail) without stale artifact leaks', async () => {
      const { result } = renderHook(() => useRealtimeEnhancement(), {
        wrapper: ({ children }) => (
          <ToastProvider>
            <AuthProvider>{children}</AuthProvider>
          </ToastProvider>
        ),
      });

      // Cycle 1: Success (200)
      vi.spyOn(supabase.functions, 'invoke').mockResolvedValueOnce({
        data: {
          success: true,
          status: 'done',
          enhanced_url: 'https://mock.storage/cycle1_success.webp',
          image_id: 'img-c1',
        },
        error: null,
      });

      await act(async () => {
        await result.current.startEnhancement({
          originalUrl: 'https://mock.storage/input1.jpg',
          preset: 'TWILIGHT',
        });
      });

      expect(result.current.status).toBe('done');
      expect(result.current.enhancedUrl).toBe('https://mock.storage/cycle1_success.webp');
      expect(result.current.errorMessage).toBeNull();

      // Cycle 2: Immediate Error (HTTP 401 Invalid Token)
      vi.spyOn(supabase.functions, 'invoke').mockResolvedValueOnce({
        data: {
          success: false,
          status: 'failed',
          error: 'Kobil LLM HTTP 401: {"error": "token_not_found_in_db"}',
        },
        error: { message: 'Kobil LLM HTTP 401: {"error": "token_not_found_in_db"}', status: 401 },
      });

      await act(async () => {
        await result.current.startEnhancement({
          originalUrl: 'https://mock.storage/input2.jpg',
          preset: 'HDR_BALANCED',
        });
      });

      expect(result.current.status).toBe('failed');
      expect(result.current.enhancedUrl).toBeNull(); // MUST be null, previous URL cleared!
      expect(result.current.errorMessage).toContain('token_not_found_in_db');

      // Cycle 3: Immediate Retry Success (HTTP 200 with new image)
      vi.spyOn(supabase.functions, 'invoke').mockResolvedValueOnce({
        data: {
          success: true,
          status: 'done',
          enhanced_url: 'https://mock.storage/cycle3_success.webp',
          image_id: 'img-c3',
        },
        error: null,
      });

      await act(async () => {
        await result.current.startEnhancement({
          originalUrl: 'https://mock.storage/input3.jpg',
          preset: 'DECLUTTER',
        });
      });

      expect(result.current.status).toBe('done');
      expect(result.current.enhancedUrl).toBe('https://mock.storage/cycle3_success.webp');
      expect(result.current.errorMessage).toBeNull();

      // Cycle 4: Immediate Server Error (HTTP 500 Gateway Timeout)
      vi.spyOn(supabase.functions, 'invoke').mockResolvedValueOnce({
        data: {
          success: false,
          status: 'failed',
          error: 'Kobil LLM HTTP 500: Server gateway timeout',
        },
        error: { message: 'Kobil LLM HTTP 500: Server gateway timeout', status: 500 },
      });

      await act(async () => {
        await result.current.startEnhancement({
          originalUrl: 'https://mock.storage/input4.jpg',
          preset: 'BRIGHTENING',
        });
      });

      expect(result.current.status).toBe('failed');
      expect(result.current.enhancedUrl).toBeNull(); // Strictly suppressed!
      expect(result.current.errorMessage).toContain('Kobil LLM HTTP 500');
    });

    it('1.2 UI in EditorPage should dynamically unmount BeforeAfterSlider on error and remount on successful retry', async () => {
      const invokeSpy = vi.spyOn(supabase.functions, 'invoke');
      
      // 1. First run returns HTTP 401 error
      invokeSpy.mockResolvedValueOnce({
        data: {
          success: false,
          status: 'failed',
          error: 'Kobil LLM HTTP 401: {"error": "token_not_found_in_db"}',
        },
        error: { message: 'Kobil LLM HTTP 401: {"error": "token_not_found_in_db"}', status: 401 },
      });

      renderWithProviders(<EditorPage />);

      const file = new File(['image-bytes-adv'], 'villa.jpg', { type: 'image/jpeg' });
      const fileInput = screen.getByTestId('photo-file-input');
      fireEvent.change(fileInput, { target: { files: [file] } });

      const enhanceBtn = screen.getByTestId('enhance-button');
      await act(async () => {
        fireEvent.click(enhanceBtn);
      });

      await waitFor(() => {
        expect(screen.getByTestId('editor-error-banner')).toBeInTheDocument();
      });

      expect(screen.getByTestId('editor-error-banner')).toHaveTextContent('Kobil LLM HTTP 401');
      expect(screen.queryByTestId('editor-result-view')).toBeNull();
      expect(screen.queryByTestId('before-after-slider')).toBeNull();

      // 2. Retry with Success 200
      invokeSpy.mockResolvedValueOnce({
        data: {
          success: true,
          status: 'done',
          enhanced_url: 'https://mock.storage/retry_success_villa.webp',
          image_id: 'img-retry-villa-101',
        },
        error: null,
      });

      await act(async () => {
        fireEvent.click(enhanceBtn);
      });

      await waitFor(() => {
        expect(screen.getByTestId('editor-result-view')).toBeInTheDocument();
      });

      expect(screen.queryByTestId('editor-error-banner')).toBeNull();
      expect(screen.getByTestId('before-after-slider')).toBeInTheDocument();
      expect(screen.getByTestId('enhanced-image')).toHaveAttribute(
        'src',
        'https://mock.storage/retry_success_villa.webp'
      );
    });

    it('1.3 should handle reset invocation cleanly restoring initial idle state', () => {
      const { result } = renderHook(() => useRealtimeEnhancement(), {
        wrapper: ({ children }) => (
          <ToastProvider>
            <AuthProvider>{children}</AuthProvider>
          </ToastProvider>
        ),
      });

      act(() => {
        result.current.reset();
      });

      expect(result.current.status).toBe('idle');
      expect(result.current.activeImage).toBeNull();
      expect(result.current.enhancedUrl).toBeNull();
      expect(result.current.originalUrl).toBeNull();
      expect(result.current.errorMessage).toBeNull();
      expect(result.current.isProcessing).toBe(false);
    });
  });

  // =========================================================================
  // Vector 2: Masked Key Retention Across Partial Configuration Edits
  // =========================================================================
  describe('Vector 2: Masked Key Retention Across Partial Configuration Edits', () => {
    const RAW_SECRET_CHAT_KEY = 'sk-chat-secret-live-1122334455';
    const RAW_SECRET_IMAGE_KEY = 'sk-image-secret-live-9988776655';

    beforeEach(() => {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(
          'pea_ai_provider_config_v4',
          JSON.stringify({
            chatConfig: {
              purpose: 'chat',
              providerName: 'kobil_llm',
              baseUrl: 'https://api.koboillm.com/v1',
              modelName: 'gemini-2.5-flash',
              rawApiKey: RAW_SECRET_CHAT_KEY,
            },
            imageConfig: {
              purpose: 'image_generation',
              providerName: 'kobil_llm',
              baseUrl: 'https://api.koboillm.com/v1',
              modelName: 'gemini-2.5-flash-image',
              rawApiKey: RAW_SECRET_IMAGE_KEY,
            },
            updatedAt: new Date().toISOString(),
          })
        );
      }

      // Sync mock database settings with seeded raw keys
      const chatRow = mockDb.api_provider_settings.get('prov-setting-chat');
      if (chatRow) {
        (chatRow as any).api_key_encrypted = RAW_SECRET_CHAT_KEY;
      }
      const imgRow = mockDb.api_provider_settings.get('prov-setting-image');
      if (imgRow) {
        (imgRow as any).api_key_encrypted = RAW_SECRET_IMAGE_KEY;
      }
    });

    it('2.1 should preserve Image raw key when only Chat key is modified', async () => {
      renderWithProviders(<KobilLlmConfigView />);

      await waitFor(() => {
        expect(screen.getByText(/Konfigurasi AI System/i)).toBeInTheDocument();
      });

      const chatInput = document.querySelector('input[name="chat_api_key_vault_field"]') as HTMLInputElement;
      expect(chatInput).toBeInTheDocument();
      fireEvent.change(chatInput, { target: { value: 'sk-new-chat-modified-key' } });

      const saveBtn = screen.getByRole('button', { name: /Simpan Semua Konfigurasi/i });
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(screen.getByText(/Pengaturan AI Berhasil Disimpan/i)).toBeInTheDocument();
      });

      const savedConfig = JSON.parse(localStorage.getItem('pea_ai_provider_config_v4') || '{}');
      expect(savedConfig.chatConfig.rawApiKey).toBe('sk-new-chat-modified-key');
      expect(savedConfig.imageConfig.rawApiKey).toBe(RAW_SECRET_IMAGE_KEY); // Image key preserved!
      expect(savedConfig.imageConfig.rawApiKey).not.toContain('••••');
    });

    it('2.2 should preserve Chat raw key when only Image key is modified', async () => {
      renderWithProviders(<KobilLlmConfigView />);

      await waitFor(() => {
        expect(screen.getByText(/Konfigurasi AI System/i)).toBeInTheDocument();
      });

      const imageInput = document.querySelector('input[name="image_api_key_vault_field"]') as HTMLInputElement;
      expect(imageInput).toBeInTheDocument();
      fireEvent.change(imageInput, { target: { value: 'sk-new-image-modified-key' } });

      const saveBtn = screen.getByRole('button', { name: /Simpan Semua Konfigurasi/i });
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(screen.getByText(/Pengaturan AI Berhasil Disimpan/i)).toBeInTheDocument();
      });

      const savedConfig = JSON.parse(localStorage.getItem('pea_ai_provider_config_v4') || '{}');
      expect(savedConfig.chatConfig.rawApiKey).toBe(RAW_SECRET_CHAT_KEY); // Chat key preserved!
      expect(savedConfig.imageConfig.rawApiKey).toBe('sk-new-image-modified-key');
    });

    it('2.3 should preserve BOTH raw keys when only Model name or Base URL is modified', async () => {
      renderWithProviders(<KobilLlmConfigView />);

      await waitFor(() => {
        expect(screen.getByText(/Konfigurasi AI System/i)).toBeInTheDocument();
      });

      // Save without modifying any API key inputs
      const saveBtn = screen.getByRole('button', { name: /Simpan Semua Konfigurasi/i });
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(screen.getByText(/Pengaturan AI Berhasil Disimpan/i)).toBeInTheDocument();
      });

      const savedConfig = JSON.parse(localStorage.getItem('pea_ai_provider_config_v4') || '{}');
      expect(savedConfig.chatConfig.rawApiKey).toBe(RAW_SECRET_CHAT_KEY);
      expect(savedConfig.imageConfig.rawApiKey).toBe(RAW_SECRET_IMAGE_KEY);
    });

    it('2.4 should strip leading "Bearer " prefix and excess whitespace when user pastes formatted key', async () => {
      renderWithProviders(<KobilLlmConfigView />);

      await waitFor(() => {
        expect(screen.getByText(/Konfigurasi AI System/i)).toBeInTheDocument();
      });

      const chatInput = document.querySelector('input[name="chat_api_key_vault_field"]') as HTMLInputElement;
      const imageInput = document.querySelector('input[name="image_api_key_vault_field"]') as HTMLInputElement;

      fireEvent.change(chatInput, { target: { value: '  Bearer sk-pasted-bearer-chat-key  ' } });
      fireEvent.change(imageInput, { target: { value: 'Bearer sk-pasted-bearer-image-key' } });

      const saveBtn = screen.getByRole('button', { name: /Simpan Semua Konfigurasi/i });
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(screen.getByText(/Pengaturan AI Berhasil Disimpan/i)).toBeInTheDocument();
      });

      const savedConfig = JSON.parse(localStorage.getItem('pea_ai_provider_config_v4') || '{}');
      expect(savedConfig.chatConfig.rawApiKey).toBe('sk-pasted-bearer-chat-key');
      expect(savedConfig.imageConfig.rawApiKey).toBe('sk-pasted-bearer-image-key');
      expect(savedConfig.chatConfig.rawApiKey).not.toMatch(/^Bearer/i);
      expect(savedConfig.imageConfig.rawApiKey).not.toMatch(/^Bearer/i);
    });

    it('2.5 isMaskedKeyString should identify multiple masked key representations reliably', () => {
      expect(isMaskedKeyString('••••••••••••••••')).toBe(true);
      expect(isMaskedKeyString('••••••••••••')).toBe(true);
      expect(isMaskedKeyString('sk-...1100')).toBe(true);
      expect(isMaskedKeyString('sk-k...9988')).toBe(true);
      expect(isMaskedKeyString('sk-koboi-live-99887766554433221100')).toBe(false);
      expect(isMaskedKeyString('sk-h7LuYKHnA0cvX3BvjoHQEQ')).toBe(false);
      expect(isMaskedKeyString('AIzaSyD-1234567890abcdef')).toBe(false);
    });
  });

  // =========================================================================
  // Vector 3: Edge Function Proxy Auth & Error Handling Under Adversarial Payloads
  // =========================================================================
  describe('Vector 3: Edge Function Proxy Auth & Error Handling', () => {
    it('3.1 enhance-image should reject missing authorization header with HTTP 401', async () => {
      const req = new Request('http://localhost:54321/functions/v1/enhance-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ original_url: 'https://mock.storage/raw.jpg', preset: 'HDR_BALANCED' }),
      });

      const res = await handleEnhanceImage(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toBe('Missing Authorization header');
    });

    it('3.2 enhance-image should return failed status when payload is missing image data', async () => {
      const req = new Request('http://localhost:54321/functions/v1/enhance-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-user-jwt',
        },
        body: JSON.stringify({ prompt: 'Enhance this' }),
      });

      const res = await handleEnhanceImage(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.status).toBe('failed');
      expect(json.error).toContain('image_base64 kosong');
    });

    it('3.3 enhance-image should propagate upstream HTTP 403 Forbidden with exact raw error', async () => {
      const mockFetch = vi.fn().mockImplementation(async (url: string | URL | Request) => {
        const urlStr = typeof url === 'string' ? url : (url as any).url || url.toString();
        if (urlStr.includes('/rest/v1/api_provider_settings')) {
          return new Response(
            JSON.stringify([
              {
                base_url: 'https://api.koboillm.com/v1',
                model_name: 'gemini-2.5-flash-image',
                api_key_encrypted: 'sk-forbidden-key',
                purpose: 'image_generation',
                is_active: true,
              },
            ]),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        }
        if (urlStr.includes('/images/edits') || urlStr.includes('/chat/completions')) {
          return new Response(
            JSON.stringify({ error: { message: 'Quota limit exceeded for organization', code: 'forbidden' } }),
            { status: 403, headers: { 'Content-Type': 'application/json' } }
          );
        }
        return new Response(JSON.stringify({}), { status: 200, headers: { 'Content-Type': 'application/json' } });
      });
      globalThis.fetch = mockFetch;

      const req = new Request('http://localhost:54321/functions/v1/enhance-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-user-jwt',
        },
        body: JSON.stringify({
          original_url: 'https://mock.storage/test_img.jpg',
          preset: 'TWILIGHT',
        }),
      });

      const res = await handleEnhanceImage(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.status).toBe('failed');
      expect(json.error).toContain('Kobil LLM HTTP 403');
      expect(json.error).toContain('Quota limit exceeded');
    });

    it('3.4 list-ai-models should reject request with missing API key and empty DB with HTTP 400', async () => {
      const mockFetch = vi.fn().mockImplementation(async (url: string | URL | Request) => {
        const urlStr = typeof url === 'string' ? url : (url as any).url || url.toString();
        if (urlStr.includes('/rest/v1/api_provider_settings')) {
          return new Response(JSON.stringify([]), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        return new Response(JSON.stringify({}), { status: 200, headers: { 'Content-Type': 'application/json' } });
      });
      globalThis.fetch = mockFetch;

      const req = new Request('http://localhost:54321/functions/v1/list-ai-models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base_url: 'https://api.koboillm.com/v1', api_key: '' }),
      });

      const res = await handleListModels(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain('API Key wajib diisi');
    });

    it('3.5 ai-chat should return clean error payload when upstream chat endpoint fails', async () => {
      const mockFetch = vi.fn().mockImplementation(async (url: string | URL | Request) => {
        const urlStr = typeof url === 'string' ? url : (url as any).url || url.toString();
        if (urlStr.includes('/chat/completions')) {
          return new Response(
            JSON.stringify({ error: { message: 'Invalid model requested: gpt-non-existent' } }),
            { status: 404, headers: { 'Content-Type': 'application/json' } }
          );
        }
        return new Response(JSON.stringify({}), { status: 200, headers: { 'Content-Type': 'application/json' } });
      });
      globalThis.fetch = mockFetch;

      const req = new Request('http://localhost:54321/functions/v1/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          base_url: 'https://api.koboillm.com/v1',
          api_key: 'sk-test-live-key',
          model: 'gpt-non-existent',
          messages: [{ role: 'user', content: 'test' }],
        }),
      });

      const res = await handleAiChat(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toContain('HTTP 404');
      expect(json.error).toContain('Invalid model requested');
    });

    it('3.6 enhance-image should handle upstream raw base64 response without data: prefix by auto-formatting', async () => {
      const rawBase64 = '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP...';
      const mockFetch = vi.fn().mockImplementation(async (url: string | URL | Request) => {
        const urlStr = typeof url === 'string' ? url : (url as any).url || url.toString();
        if (urlStr.includes('/rest/v1/api_provider_settings')) {
          return new Response(
            JSON.stringify([
              {
                base_url: 'https://api.koboillm.com/v1',
                model_name: 'gemini-2.5-flash-image',
                api_key_encrypted: 'sk-live-key-valid',
                purpose: 'image_generation',
                is_active: true,
              },
            ]),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        }
        if (urlStr.includes('/images/edits') || urlStr.includes('/chat/completions')) {
          return new Response(
            JSON.stringify({
              data: [{ url: rawBase64 }],
              choices: [{ message: { images: [{ image_url: { url: rawBase64 } }] } }],
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        }
        return new Response(JSON.stringify({}), { status: 200, headers: { 'Content-Type': 'application/json' } });
      });
      globalThis.fetch = mockFetch;

      const req = new Request('http://localhost:54321/functions/v1/enhance-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-user-jwt',
        },
        body: JSON.stringify({
          original_url: 'https://mock.storage/test_img.jpg',
          preset: 'TWILIGHT',
        }),
      });

      const res = await handleEnhanceImage(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.status).toBe('done');
      expect(json.enhanced_url).toBe(`data:image/jpeg;base64,${rawBase64}`);
    });
  });

  // =========================================================================
  // Vector 4: Visual Fidelity & BeforeAfterSlider Boundary Stress Testing
  // =========================================================================
  describe('Vector 4: Visual Fidelity & BeforeAfterSlider Boundary Stress Testing', () => {
    it('4.1 should clamp initialPosition outside [0, 100] bounds', () => {
      const { container: c1 } = render(
        <BeforeAfterSlider
          originalUrl="https://mock.storage/orig.jpg"
          enhancedUrl="https://mock.storage/enh.jpg"
          initialPosition={-50}
        />
      );
      const slider1 = c1.querySelector('[role="slider"]');
      expect(slider1).toHaveAttribute('aria-valuenow', '0');

      const { container: c2 } = render(
        <BeforeAfterSlider
          originalUrl="https://mock.storage/orig.jpg"
          enhancedUrl="https://mock.storage/enh.jpg"
          initialPosition={150}
        />
      );
      const slider2 = c2.querySelector('[role="slider"]');
      expect(slider2).toHaveAttribute('aria-valuenow', '100');
    });

    it('4.2 should respond accurately to keyboard navigation (ArrowLeft, ArrowRight, Home, End)', () => {
      const onPositionChange = vi.fn();
      render(
        <BeforeAfterSlider
          originalUrl="https://mock.storage/orig.jpg"
          enhancedUrl="https://mock.storage/enh.jpg"
          initialPosition={50}
          onPositionChange={onPositionChange}
        />
      );

      const slider = screen.getByRole('slider');

      fireEvent.keyDown(slider, { key: 'ArrowLeft' });
      expect(slider).toHaveAttribute('aria-valuenow', '45');
      expect(onPositionChange).toHaveBeenCalledWith(45);

      fireEvent.keyDown(slider, { key: 'ArrowRight' });
      expect(slider).toHaveAttribute('aria-valuenow', '50');

      fireEvent.keyDown(slider, { key: 'Home' });
      expect(slider).toHaveAttribute('aria-valuenow', '0');

      fireEvent.keyDown(slider, { key: 'End' });
      expect(slider).toHaveAttribute('aria-valuenow', '100');
    });

    it('4.3 should render image elements with exact original and enhanced src URLs', () => {
      const original = 'https://mock.storage/real_property_before.png';
      const enhanced = 'https://mock.storage/real_property_after.png';

      render(
        <BeforeAfterSlider
          originalUrl={original}
          enhancedUrl={enhanced}
          beforeLabel="Foto Asli"
          afterLabel="Hasil AI"
        />
      );

      const originalImg = screen.getByTestId('original-image');
      const enhancedImg = screen.getByTestId('enhanced-image');

      expect(originalImg).toHaveAttribute('src', original);
      expect(enhancedImg).toHaveAttribute('src', enhanced);

      expect(screen.getByTestId('badge-before')).toHaveTextContent('Foto Asli');
      expect(screen.getByTestId('badge-after')).toHaveTextContent('Hasil AI');
    });
  });
});
