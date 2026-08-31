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
