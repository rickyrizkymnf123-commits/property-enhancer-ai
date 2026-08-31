import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  verifyHmacSignature,
  generateSecurePassword,
  sendWhatsAppCredentials,
  handleProvision,
} from '../../supabase/functions/provision/index';
import { handleEnhanceImage } from '../../supabase/functions/enhance-image/index';
import { handleAdminUsers } from '../../supabase/functions/admin-users/index';

// Helper to create HMAC signature in Node test environment
async function createTestHmacSignature(rawBody: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signatureBytes = await crypto.subtle.sign('HMAC', key, encoder.encode(rawBody));
  return Array.from(new Uint8Array(signatureBytes))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

describe('Edge Function Helpers & Utilities', () => {
  const testSecret = 'property_enhancer_secret_key_2026';

  it('1. should generate a 12-char secure random password with alphanumeric and symbol characters', () => {
    const password = generateSecurePassword(12);
    expect(password).toBeTypeOf('string');
    expect(password.length).toBe(12);
    expect(password).toMatch(/[a-zA-Z0-9!@#$%*]/);
  });

  it('2. should accurately verify valid HMAC-SHA256 signatures', async () => {
    const body = JSON.stringify({ email: 'test@example.com', product_code: 'PEA' });
    const validSignature = await createTestHmacSignature(body, testSecret);

    const isValid = await verifyHmacSignature(body, validSignature, testSecret);
    expect(isValid).toBe(true);
  });

  it('3. should reject invalid or tampered HMAC-SHA256 signatures', async () => {
    const body = JSON.stringify({ email: 'test@example.com', product_code: 'PEA' });
    const tamperedBody = JSON.stringify({ email: 'hacker@example.com', product_code: 'PEA' });
    const validSignature = await createTestHmacSignature(body, testSecret);

    const isValid = await verifyHmacSignature(tamperedBody, validSignature, testSecret);
    expect(isValid).toBe(false);
  });

  it('4. should format Indonesian phone numbers and dispatch WhatsApp message via WAHA API', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'msg_123', status: 'sent' }),
    });
    globalThis.fetch = mockFetch;

    const result = await sendWhatsAppCredentials(
      '081234567890',
      'user@example.com',
      'TempPass123!',
      'Budi Santoso',
      'http://localhost:3000',
      'test-waha-key',
      'https://propertyenhancer.ai/login'
    );

    expect(result.success).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [callUrl, callOptions] = mockFetch.mock.calls[0];
    expect(callUrl).toBe('http://localhost:3000/api/sendText');
    const sentBody = JSON.parse(callOptions.body);
    expect(sentBody.chatId).toBe('6281234567890@c.us');
    expect(sentBody.text).toContain('Budi Santoso');
    expect(sentBody.text).toContain('user@example.com');
    expect(sentBody.text).toContain('TempPass123!');
  });
});

describe('Edge Function: provision Endpoint', () => {
  const secret = 'property_enhancer_secret_key_2026';
  process.env.PROVISION_SECRET = secret;
  process.env.SUPABASE_URL = 'https://mock.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock-key';

  it('1. should return 401 when signature header is missing or invalid', async () => {
    const payload = { email: 'buyer@example.com', full_name: 'Budi' };
    const req = new Request('http://localhost:54321/functions/v1/provision', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-signature': 'invalid_hex_signature',
      },
      body: JSON.stringify(payload),
    });

    const response = await handleProvision(req);
    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('INVALID_SIGNATURE');
  });

  it('2. should return 400 when email is missing in payload with valid signature', async () => {
    const payload = { full_name: 'Missing Email' };
    const bodyStr = JSON.stringify(payload);
    const sig = await createTestHmacSignature(bodyStr, secret);

    const req = new Request('http://localhost:54321/functions/v1/provision', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-signature': sig,
      },
      body: bodyStr,
    });

    const response = await handleProvision(req);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Email is required');
  });
});

describe('Edge Function: enhance-image Endpoint', () => {
  it('1. should return 401 when Authorization header is missing', async () => {
    const req = new Request('http://localhost:54321/functions/v1/enhance-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ original_url: 'https://example.com/raw.jpg', preset: 'HDR_BALANCED' }),
    });

    const res = await handleEnhanceImage(req);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe('Missing Authorization header');
  });

  it('2. should return 200 for OPTIONS preflight CORS request', async () => {
    const req = new Request('http://localhost:54321/functions/v1/enhance-image', {
      method: 'OPTIONS',
    });

    const res = await handleEnhanceImage(req);
    expect(res.status).toBe(200);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
  });

  it('3. should pass clean Bearer token to Kobil LLM Proxy and return enhanced_url on HTTP 200', async () => {
    const mockFetch = vi.fn().mockImplementation(async (url: string | URL | Request, init?: RequestInit) => {
      const urlStr = typeof url === 'string' ? url : (url as any).url || url.toString();
      if (urlStr.includes('/rest/v1/api_provider_settings')) {
        return new Response(
          JSON.stringify([
            {
              base_url: 'https://api.koboillm.com/v1',
              model_name: 'gemini-2.5-flash-image',
              api_key_encrypted: 'sk-koboi-live-99887766554433221100',
              purpose: 'image_generation',
              is_active: true,
            },
          ]),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      if (urlStr.includes('/chat/completions')) {
        return new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  images: [{ image_url: { url: 'https://koboillm.storage/result_hd_99.png' } }],
                },
              },
            ],
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
        Authorization: 'Bearer test-user-jwt-123',
      },
      body: JSON.stringify({
        original_url: 'https://mock.storage/raw_house.jpg',
        preset: 'HDR_BALANCED',
      }),
    });

    const res = await handleEnhanceImage(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.status).toBe('done');
    expect(data.enhanced_url).toBe('https://koboillm.storage/result_hd_99.png');

    // Verify proxy call headers
    const proxyCalls = mockFetch.mock.calls.filter(([callUrl]) =>
      (typeof callUrl === 'string' ? callUrl : callUrl.toString()).includes('/chat/completions')
    );
    expect(proxyCalls.length).toBe(1);
    const [proxyUrl, proxyOptions] = proxyCalls[0];
    expect(proxyUrl).toBe('https://api.koboillm.com/v1/chat/completions');
    expect(proxyOptions.headers['Authorization']).toBe('Bearer sk-koboi-live-99887766554433221100');
  });

  it('4. should propagate raw server response on Kobil LLM Proxy HTTP 401 token_not_found_in_db error', async () => {
    const errorBody = JSON.stringify({ error: 'Invalid proxy server token', code: 'token_not_found_in_db' });
    const mockFetch = vi.fn().mockImplementation(async (url: string | URL | Request) => {
      const urlStr = typeof url === 'string' ? url : (url as any).url || url.toString();
      if (urlStr.includes('/rest/v1/api_provider_settings')) {
        return new Response(
          JSON.stringify([
            {
              base_url: 'https://api.koboillm.com/v1',
              model_name: 'gemini-2.5-flash-image',
              api_key_encrypted: 'sk-invalid-token-1100',
              purpose: 'image_generation',
              is_active: true,
            },
          ]),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      if (urlStr.includes('/chat/completions')) {
        return new Response(errorBody, {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({}), { status: 200, headers: { 'Content-Type': 'application/json' } });
    });
    globalThis.fetch = mockFetch;

    const req = new Request('http://localhost:54321/functions/v1/enhance-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-user-jwt-123',
      },
      body: JSON.stringify({
        original_url: 'https://mock.storage/raw_house.jpg',
        preset: 'HDR_BALANCED',
      }),
    });

    const res = await handleEnhanceImage(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.status).toBe('failed');
    expect(data.error).toContain('Kobil LLM HTTP 401');
    expect(data.error).toContain('token_not_found_in_db');
  });

  it('5. should propagate raw error on Kobil LLM Proxy HTTP 400 bad request and HTTP 500 server error', async () => {
    const error400Body = JSON.stringify({ error: { message: 'Image resolution too large' } });
    const mockFetch = vi.fn().mockImplementation(async (url: string | URL | Request) => {
      const urlStr = typeof url === 'string' ? url : (url as any).url || url.toString();
      if (urlStr.includes('/rest/v1/api_provider_settings')) {
        return new Response(
          JSON.stringify([
            {
              base_url: 'https://api.koboillm.com/v1',
              model_name: 'gemini-2.5-flash-image',
              api_key_encrypted: 'sk-koboi-live-99887766554433221100',
              purpose: 'image_generation',
              is_active: true,
            },
          ]),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      if (urlStr.includes('/chat/completions')) {
        return new Response(error400Body, {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({}), { status: 200, headers: { 'Content-Type': 'application/json' } });
    });
    globalThis.fetch = mockFetch;

    const req = new Request('http://localhost:54321/functions/v1/enhance-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-user-jwt-123',
      },
      body: JSON.stringify({
        original_url: 'https://mock.storage/raw_house.jpg',
        preset: 'HDR_BALANCED',
      }),
    });

    const res = await handleEnhanceImage(req);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.status).toBe('failed');
    expect(data.error).toContain('Kobil LLM HTTP 400');
    expect(data.error).toContain('Image resolution too large');
  });

  it('6. should strip leading Bearer prefix from API key when building Authorization header', async () => {
    let capturedAuthHeader = '';
    const mockFetch = vi.fn().mockImplementation(async (url: string | URL | Request, init?: RequestInit) => {
      const urlStr = typeof url === 'string' ? url : (url as any).url || url.toString();
      if (urlStr.includes('/rest/v1/api_provider_settings')) {
        return new Response(
          JSON.stringify([
            {
              base_url: 'https://api.koboillm.com/v1',
              model_name: 'gemini-2.5-flash-image',
              api_key_encrypted: 'Bearer sk-prefixed-key-554433',
              purpose: 'image_generation',
              is_active: true,
            },
          ]),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      if (urlStr.includes('/chat/completions')) {
        capturedAuthHeader = (init?.headers as any)?.['Authorization'] || '';
        return new Response(
          JSON.stringify({
            choices: [
              { message: { images: [{ image_url: { url: 'https://koboillm.storage/result_stripped.png' } }] } },
            ],
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
        Authorization: 'Bearer test-user-jwt-123',
      },
      body: JSON.stringify({
        original_url: 'https://mock.storage/raw_house.jpg',
        preset: 'HDR_BALANCED',
      }),
    });

    const res = await handleEnhanceImage(req);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(capturedAuthHeader).toBe('Bearer sk-prefixed-key-554433');
    expect(capturedAuthHeader).not.toContain('Bearer Bearer');
  });
});

describe('Edge Function: admin-users Endpoint', () => {
  const setupSecret = 'pea_admin_setup_secret_2026';
  process.env.ADMIN_SETUP_SECRET = setupSecret;

  it('1. should return 401 when neither JWT nor setup secret is provided', async () => {
    const req = new Request('http://localhost:54321/functions/v1/admin-users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action: 'list' }),
    });

    const res = await handleAdminUsers(req);
    expect(res.status).toBe(401);
  });

  it('2. should reject unknown actions with 400', async () => {
    const req = new Request('http://localhost:54321/functions/v1/admin-users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-setup-secret': setupSecret,
      },
      body: JSON.stringify({ action: 'non_existent_action' }),
    });

    const res = await handleAdminUsers(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('Unknown action');
  });
});
