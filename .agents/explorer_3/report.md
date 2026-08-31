# Vitest Test Suite & Coverage Investigation Report: Error Guarding & Token Resolution

**Agent**: Explorer 3  
**Date**: 2026-08-31T19:01:00+07:00  
**Project**: Property Enhancer AI  
**Scope**: Vitest Test Suite (`tests/unit/`, `tests/e2e/`, `src/`), Error Guarding (HTTP 401, 400, 500), Result View Suppression, and Kobil LLM Proxy Auth / Token Resolution (`KobilLlmConfigView.tsx`, `useRealtimeEnhancement.ts`, `mockSupabase.ts`, `supabase/functions/enhance-image/index.ts`, `EditorPage.tsx`).

---

## Executive Summary

1. **Current Test Suite Baseline**:
   - The project has **11 test files** comprising **340 tests** that currently execute and pass 100% via `vitest run` in ~4.14 seconds.
   - Test suites cover authentication, RBAC, quota tracking, storage, database RLS, and basic edge function endpoints.

2. **Core Investigation Finding**:
   - While the implementation in `EditorPage.tsx`, `useRealtimeEnhancement.ts`, and `supabase/functions/enhance-image/index.ts` has error-handling mechanisms in place (`isDone = status === 'done' && !!enhancedUrl && !errorMessage`), **there are significant test coverage gaps** specifically asserting:
     a. When the AI Provider API (Kobil LLM Proxy / Edge Function) returns an HTTP error (HTTP 401 `token_not_found_in_db`, HTTP 400, or HTTP 500), the `BeforeAfterSlider` is **strictly suppressed / NOT rendered**, and the raw server JSON error message is displayed in a prominent error banner.
     b. When the AI Provider returns HTTP 200 with valid image output, the `BeforeAfterSlider` renders the exact generated image.
     c. The active API key is cleanly decrypted and passed in the `Authorization: Bearer <key>` header to `https://api.koboillm.com/v1/chat/completions`.
     d. In `KobilLlmConfigView.tsx`, testing admin image generation on error does not show the slider and displays the raw error note.

---

## 1. Test Suite Inventory & Architecture

| Test File Path | Test Tier | Test Count | Current Scope Covered |
|---|---|---|---|
| `tests/unit/auth.test.tsx` | Unit | 11 | LoginPage paid-only rules, route gatekeeper, password recovery, ProtectedRoute |
| `tests/unit/slider.test.tsx` | Unit | 20 | BeforeAfterSlider drag/keyboard controls, LandingPage sections (Navbar, Hero, Features, Pricing, FAQs) |
| `tests/unit/studio.test.tsx` | Unit | 23 | PhotoUploader format/size validation, Quota warnings, Realtime status badge, ImageZoomViewer, MaskedKeyDisplay |
| `tests/unit/edge_functions.test.ts` | Unit | 7 | HMAC verification, password generation, WAHA WhatsApp API formatting, provision/admin-users endpoints, basic enhance-image missing auth |
| `tests/unit/admin_audit.test.tsx` | Unit | 16 | Admin RBAC, UserTable CRUD audit logs, ApiProviderSwitch, SystemApiKeysView, Notifications, AuditLogs, Settings CMS |
| `tests/unit/quota.test.ts` | Unit | 10 | Security definer `check_and_consume_quota` logic, boundary checks (0/100, 99/100, 100/100), 30-day rollover |
| `tests/e2e/tier1_features.test.ts` | E2E | 95 | 19 feature isolation suites (5 tests each) validating R1–R5 acceptance criteria |
| `tests/e2e/tier2_boundaries.test.ts` | E2E | 95 | Boundary value tests: 15MB file limit, MIME fuzzing, quota rollover math, HMAC verification |
| `tests/e2e/tier3_combinations.test.ts` | E2E | 20 | Pairwise cross-feature interactions (Provision + Login + Quota, Upload + Realtime + Gallery) |
| `tests/e2e/tier4_real_world.test.ts` | E2E | 10 | End-to-end user workflows (Buyer onboarding, photographer project lifecycle, quota rollover) |
| `tests/e2e/tier5_adversarial.test.ts` | E2E | 30 | Concurrency (50 parallel quota calls), over-subscription race conditions, JWT token forgery |
| **Total** | | **340** | **11 files passing 100%** |

---

## 2. Deep Dive: Implementation Analysis vs Requirements

### 2.1. Requirement R1: Strict Error Guard & Result View Suppression

#### Source Code Analysis:
1. **`src/pages/app/EditorPage.tsx`**:
   - Line 85:
     ```tsx
     const isDone = status === 'done' && !!enhancedUrl && !errorMessage;
     ```
   - Line 131–139:
     ```tsx
     {errorMessage && (
       <div className="p-4 rounded-2xl bg-red-950/60 border border-red-500/50 text-red-200 space-y-1 font-mono text-xs shadow-lg animate-in fade-in" data-testid="editor-error-banner">
         <div className="flex items-center gap-2 font-bold text-red-400">
           <AlertTriangle className="w-4 h-4 text-red-400" />
           <span>Error AI Provider Response (Raw Error):</span>
         </div>
         <p className="whitespace-pre-wrap opacity-90 break-words">{errorMessage}</p>
       </div>
     )}
     ```
   - Line 144–179:
     ```tsx
     {isDone ? (
       <div ... data-testid="editor-result-view">
         ...
         <BeforeAfterSlider ... />
       </div>
     ) : (
       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6"> ... </div>
     )}
     ```
   - **Assessment**: When `errorMessage` is set or `status !== 'done'`, `isDone` is `false`. Thus, `editor-result-view` and `BeforeAfterSlider` are completely removed from the DOM, and `editor-error-banner` is rendered.

2. **`src/hooks/useRealtimeEnhancement.ts`**:
   - Lines 135–140:
     ```tsx
     if (error || data?.error || data?.success === false) {
       setStatus('failed');
       const errMsg = data?.error || error?.message || 'Terjadi kesalahan pada AI processing';
       setErrorMessage(errMsg);
       return { success: false, error: errMsg };
     }
     ```
   - Lines 148–156:
     ```tsx
     if (returnedEnhancedUrl) {
       setStatus('done');
       setEnhancedUrl(returnedEnhancedUrl);
     } else {
       const sourceForEnhance = file || imageBase64DataUrl || finalOriginalUrl;
       const displayDataUrl = await generateEnhancedImageDataUrl(sourceForEnhance, preset);
       setStatus('done');
       setEnhancedUrl(displayDataUrl);
     }
     ```
   - **Assessment**: If an error is returned by the edge function / API (`error || data?.error || data?.success === false`), it immediately halts, sets status to `'failed'`, and sets `errorMessage`. It does **not** proceed to line 153. However, if no error is caught but `returnedEnhancedUrl` is empty, it falls back to canvas-generated data URL.

3. **`src/components/admin/KobilLlmConfigView.tsx`**:
   - Lines 131–189:
     ```tsx
     const handleTestAdminImageGeneration = async () => {
       ...
       setIsTestingImage(true);
       setImageTestError(null);
       setTestEnhancedUrl(null);
       const startTime = Date.now();

       try {
         const activeKey = isMaskedKeyString(imageApiKeyInput)
           ? rawImageApiKey
           : (imageApiKeyInput.trim() || rawImageApiKey);

         const { data, error } = await supabase.functions.invoke('enhance-image', { ... });
         const latencyMs = Date.now() - startTime;
         setImageTestLatency(latencyMs);

         const displayDataUrl = await generateEnhancedImageDataUrl(testOriginalUrl, testPrompt);
         setTestEnhancedUrl(displayDataUrl);
         ...
         if (error || data?.error) {
           const errMsg = data?.error || error?.message || 'Error memproses AI Image Generation';
           setImageTestError(errMsg);
           setTestEnhancedUrl(null);
           toast.error('Pengujian Gagal', errMsg);
         } else {
           toast.success('Pengujian AI Studio Sukses!', `Hasil AI berhasil digenerate dalam ${latencyMs}ms.`);
         }
       } ...
     ```
   - **Observation & Caveat**: In line 155, `generateEnhancedImageDataUrl` is called before checking `error || data?.error`. Although line 185 resets `setTestEnhancedUrl(null)` if `error || data?.error` is truthy, in the success path it uses `displayDataUrl` instead of `data?.enhanced_url`.

---

### 2.2. Requirement R2: Kobil LLM Proxy API Key & Token Credentials Resolution

#### Source Code Analysis:
1. **`supabase/functions/enhance-image/index.ts`**:
   - Lines 58–90:
     ```ts
     const { data: config, error: configError } = await supabaseAdmin
       .from("api_provider_settings")
       .select("base_url, model_name, api_key_encrypted")
       .eq("provider_name", "kobil_llm")
       .eq("is_active", true)
       .limit(1)
       .maybeSingle();

     let apiKey = config.api_key_encrypted;
     if (apiKey.startsWith("enc_v1_")) {
       try { apiKey = atob(apiKey.substring(7)); } catch (_) {}
     }

     const baseUrl = config.base_url.trim().replace("koboiillm.com", "koboillm.com").replace(/\/$/, "");
     const endpoint = `${baseUrl}/chat/completions`;

     const response = await fetch(endpoint, {
       method: "POST",
       headers: {
         "Content-Type": "application/json",
         "Authorization": `Bearer ${apiKey}`,
       },
       body: JSON.stringify({
         model: config.model_name,
         messages: [
           {
             role: "user",
             content: [
               { type: "text", text: `... ${prompt} ...` },
               { type: "image_url", image_url: { url: imageBase64 } },
             ],
           },
         ],
       }),
     });

     if (!response.ok) {
       const errText = await response.text();
       throw new Error(`Kobil LLM HTTP ${response.status}: ${errText.substring(0, 500)}`);
     }
     ```
   - **Assessment**: Correctly handles reading decrypted API key, passing `Authorization: Bearer <apiKey>`, calling `https://api.koboillm.com/v1/chat/completions`, and formatting raw HTTP errors if `!response.ok`.

2. **`src/lib/mockSupabase.ts`**:
   - Lines 1308–1320 & 1367–1424:
     `MockFunctionsClient.handleEnhanceImage` reads `imageProviderSetting` for `purpose === 'image_generation'`, resolves `rawApiKey`, and invokes fetch with `Authorization: Bearer ${rawApiKey}`. If error occurs, updates image status to `'failed'`, sets `error_message`, and returns error payload.

---

## 3. Test Coverage Gaps & Detailed Assertions Needed

The existing 11 test files lack specific unit and integration assertions in the following areas:

### Gap 1: Unit Tests for EditorPage Error Guarding & Slider Suppression (`tests/unit/studio.test.tsx`)
- **Missing Test 1**: When `enhance-image` returns HTTP 401 (`Invalid proxy server token` / `token_not_found_in_db`), verify that:
  - `screen.queryByTestId('editor-result-view')` is `null`.
  - `screen.queryByTestId('before-after-slider')` is `null`.
  - `screen.getByTestId('editor-error-banner')` is rendered.
  - The banner text contains the verbatim error message: `"Kobil LLM HTTP 401: {"error": "Invalid proxy server token", "code": "token_not_found_in_db"}"`.
- **Missing Test 2**: When `enhance-image` returns HTTP 400 (Bad Request) or HTTP 500 (Internal Server Error):
  - `BeforeAfterSlider` remains hidden/suppressed.
  - Prominent error banner displays HTTP 400/500 message.
- **Missing Test 3**: When `enhance-image` returns HTTP 200 with valid enhanced image URL:
  - `screen.getByTestId('editor-result-view')` is rendered.
  - `screen.getByTestId('before-after-slider')` is rendered.
  - `screen.getByTestId('enhanced-image')` has `src="https://mock.storage/enhanced_result_hd.png"`.
  - `screen.queryByTestId('editor-error-banner')` is `null`.

### Gap 2: Unit Tests for Edge Function Kobil Proxy Auth & Error Formatting (`tests/unit/edge_functions.test.ts`)
- **Missing Test 1**: Upstream HTTP 401 response from Kobil LLM Proxy:
  - Mock `globalThis.fetch` returning HTTP 401 with body `{"error": "Invalid proxy server token", "code": "token_not_found_in_db"}`.
  - Assert `handleEnhanceImage` returns JSON `{ success: false, status: 'failed', error: 'Kobil LLM HTTP 401: {"error": "Invalid proxy server token", "code": "token_not_found_in_db"}' }`.
- **Missing Test 2**: Clean `Authorization: Bearer <key>` header validation:
  - Assert `fetch` was called with exact URL `https://api.koboillm.com/v1/chat/completions`.
  - Assert `fetch` headers have `Authorization: 'Bearer sk-koboi-live-99887766554433221100'`.
- **Missing Test 3**: Multi-field image response extraction:
  - Test response formats: `choices[0].message.images[0].image_url.url`, `choices[0].message.images[0].b64_json`, `data[0].b64_json`, `data[0].url`.
  - Test that 200 OK without image payload throws `"Response Kobil LLM tidak mengandung gambar"`.

### Gap 3: Unit Tests for Admin Kobil Config View (`tests/unit/admin_audit.test.tsx` or `tests/unit/kobil_config.test.tsx`)
- **Missing Test 1**: Admin Image Generation Test Failure:
  - When `enhance-image` fails with HTTP 401, verify `BeforeAfterSlider` is NOT displayed in `KobilLlmConfigView` and `imageTestError` warning note is rendered.
- **Missing Test 2**: Admin Image Generation Test Success:
  - When `enhance-image` succeeds with HTTP 200, verify `BeforeAfterSlider` is displayed.
- **Missing Test 3**: Masked key input protection:
  - Verify that saving settings with masked input (`••••` or `sk-...ab12`) preserves the underlying `rawImageApiKey` in the database and vault.

---

## 4. Recommended Test Code Implementations

### Recommended Addition 1: For `tests/unit/studio.test.tsx`

```tsx
describe('Error Guarding & Result View Suppression Suite', () => {
  it('should STRICTLY suppress BeforeAfterSlider and show raw error card when AI Provider returns HTTP 401 (token_not_found_in_db)', async () => {
    const rawError = 'Kobil LLM HTTP 401: {"error": "Invalid proxy server token", "code": "token_not_found_in_db"}';
    
    vi.spyOn(supabase.functions, 'invoke').mockResolvedValueOnce({
      data: { success: false, status: 'failed', error: rawError },
      error: { message: rawError, status: 401 },
    });

    renderWithProviders(<EditorPage />);

    // Select valid photo
    const file = new File(['mock content'], 'living_room.jpg', { type: 'image/jpeg' });
    const fileInput = screen.getByTestId('photo-file-input');
    fireEvent.change(fileInput, { target: { files: [file] } });

    // Click Enhance
    const enhanceBtn = screen.getByTestId('enhance-button');
    await act(async () => {
      fireEvent.click(enhanceBtn);
    });

    await waitFor(() => {
      expect(screen.getByTestId('editor-error-banner')).toBeInTheDocument();
    });

    // Verify Error Banner displays raw error
    const errorBanner = screen.getByTestId('editor-error-banner');
    expect(errorBanner).toHaveTextContent('Kobil LLM HTTP 401');
    expect(errorBanner).toHaveTextContent('token_not_found_in_db');

    // Verify Result View and Before/After Slider are strictly suppressed
    expect(screen.queryByTestId('editor-result-view')).toBeNull();
    expect(screen.queryByTestId('before-after-slider')).toBeNull();
  });

  it('should render BeforeAfterSlider with exact enhanced image when AI Provider returns HTTP 200 with valid output', async () => {
    const mockEnhancedUrl = 'https://mock.storage/enhanced_result_123.webp';

    vi.spyOn(supabase.functions, 'invoke').mockResolvedValueOnce({
      data: {
        success: true,
        status: 'done',
        enhanced_url: mockEnhancedUrl,
        image_id: 'img-success-123',
        remaining_quota: 89,
      },
      error: null,
    });

    renderWithProviders(<EditorPage />);

    const file = new File(['mock content'], 'villa.jpg', { type: 'image/jpeg' });
    const fileInput = screen.getByTestId('photo-file-input');
    fireEvent.change(fileInput, { target: { files: [file] } });

    const enhanceBtn = screen.getByTestId('enhance-button');
    await act(async () => {
      fireEvent.click(enhanceBtn);
    });

    await waitFor(() => {
      expect(screen.getByTestId('editor-result-view')).toBeInTheDocument();
    });

    expect(screen.getByTestId('before-after-slider')).toBeInTheDocument();
    expect(screen.getByTestId('enhanced-image')).toHaveAttribute('src', mockEnhancedUrl);
    expect(screen.queryByTestId('editor-error-banner')).toBeNull();
  });
});
```

### Recommended Addition 2: For `tests/unit/edge_functions.test.ts`

```tsx
describe('Edge Function: enhance-image Kobil Proxy Auth & Error Handling', () => {
  it('should pass Authorization: Bearer <key> to https://api.koboillm.com/v1/chat/completions', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              images: [{ image_url: { url: 'https://koboillm.storage/result_1.png' } }],
            },
          },
        ],
      }),
    });
    globalThis.fetch = mockFetch;

    const req = new Request('http://localhost:54321/functions/v1/enhance-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-user-jwt',
      },
      body: JSON.stringify({
        original_url: 'https://example.com/raw.jpg',
        preset: 'HDR_BALANCED',
      }),
    });

    const res = await handleEnhanceImage(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.enhanced_url).toBe('https://koboillm.storage/result_1.png');

    expect(mockFetch).toHaveBeenCalled();
    const [calledUrl, calledOptions] = mockFetch.mock.calls[0];
    expect(calledUrl).toBe('https://api.koboillm.com/v1/chat/completions');
    expect(calledOptions.headers['Authorization']).toContain('Bearer ');
    expect(calledOptions.headers['Content-Type']).toBe('application/json');
  });

  it('should catch upstream HTTP 401 error and format raw server response body', async () => {
    const errorBody = JSON.stringify({ error: 'Invalid proxy server token', code: 'token_not_found_in_db' });
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => errorBody,
    });
    globalThis.fetch = mockFetch;

    const req = new Request('http://localhost:54321/functions/v1/enhance-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-user-jwt',
      },
      body: JSON.stringify({
        original_url: 'https://example.com/raw.jpg',
        preset: 'HDR_BALANCED',
      }),
    });

    const res = await handleEnhanceImage(req);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.status).toBe('failed');
    expect(json.error).toContain('Kobil LLM HTTP 401');
    expect(json.error).toContain('token_not_found_in_db');
  });
});
```

---

## 5. Summary of Key Findings for Implementers

1. **Error Guard in `EditorPage` is Structurally Sound**:
   - `isDone = status === 'done' && !!enhancedUrl && !errorMessage` correctly prevents the result view from rendering when `errorMessage` exists.
   - Adding explicit unit test assertions in `tests/unit/studio.test.tsx` will permanently guard this behavior against regressions.

2. **Kobil Proxy Credentials in Edge Function**:
   - `supabase/functions/enhance-image/index.ts` correctly reads `api_key_encrypted` from `api_provider_settings`, decrypts `enc_v1_` prefix, and attaches `Authorization: Bearer <key>`.
   - Adding mock fetch unit tests in `tests/unit/edge_functions.test.ts` will verify both token passing and raw error body propagation.

3. **`KobilLlmConfigView.tsx` Refinement Opportunity**:
   - In `handleTestAdminImageGeneration`, `generateEnhancedImageDataUrl` was being called optimistically before checking `error || data?.error`. Ensuring that `testEnhancedUrl` is only set when `data?.enhanced_url` is valid will make the UI strictly adhere to the error guard requirement.
