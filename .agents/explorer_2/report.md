# Technical Investigation Report: Kobil LLM Proxy Auth & Bearer Token Resolution

**Investigator**: Explorer 2  
**Date**: 2026-08-31T18:59:50+07:00  
**Target Files Analyzed**:
- `src/components/admin/KobilLlmConfigView.tsx`
- `src/hooks/useRealtimeEnhancement.ts`
- `src/lib/mockSupabase.ts`
- `supabase/functions/enhance-image/index.ts`
- `supabase/functions/ai-chat/index.ts`
- `supabase/functions/list-ai-models/index.ts`
- `src/pages/app/EditorPage.tsx`

---

## Executive Summary

This investigation analyzed the complete lifecycle of API keys and Bearer tokens for Kobil LLM Proxy (`https://api.koboillm.com/v1`) and OpenAI-compatible endpoints across frontend components, custom hooks, mock databases, and Supabase Edge Functions.

### Key Discoveries & Identified Bugs:
1. **Critical Masked Key Overwrite in `KobilLlmConfigView.tsx` (`handleSaveConfig`)**:
   - In `KobilLlmConfigView.tsx` line 418, `imageKeyToSave` is assigned via `imageApiKeyInput.trim() || rawImageApiKey;` without testing `isMaskedKeyString(imageApiKeyInput)`.
   - When an admin saves configuration without manually retyping the image API key, `imageApiKeyInput` holds the masked string (e.g. `sk-k...1100` or `••••••••••••`). Because this string is non-empty, `imageKeyToSave` is overwritten with the masked string and persisted to `localStorage` and `api_provider_settings`, corrupting the real API key and causing HTTP 401 (`Invalid proxy server token` / `token_not_found_in_db`).
2. **Ambiguous Provider Query in Edge Function (`supabase/functions/enhance-image/index.ts`)**:
   - Line 61 queries `api_provider_settings` using `.eq("provider_name", "kobil_llm").eq("is_active", true).limit(1).maybeSingle();`.
   - Since both `chat` and `image_generation` rows share `provider_name: "kobil_llm"` and `is_active: true`, PostgreSQL row ordering can return the `chat` record instead of `image_generation`. This causes `enhance-image` to send the text model ID (`gemini-2.5-flash`) instead of the image model ID (`gemini-2.5-flash-image`), or use the wrong API key/Base URL.
3. **Typo and Missing Domain Normalizer in `list-ai-models/index.ts`**:
   - Line 22 contains default fallback `https://api.koboiillm.com/v1` (with double 'i') and lacks domain normalization (`.replace("koboiillm.com", "koboillm.com")`), risking network resolution failures if `base_url` is unpopulated or contains the legacy spelling.
4. **Missing Bearer Prefix Sanitization Across Endpoints**:
   - If an admin/user pastes an API key containing `Bearer sk-...`, string interpolation `Authorization: Bearer ${apiKey}` results in `Authorization: Bearer Bearer sk-...` (prefix duplication), which LiteLLM proxy rejects with HTTP 401.
5. **Premature Canvas Generator Call in Admin AI Studio Test Panel**:
   - In `KobilLlmConfigView.tsx` line 155, `generateEnhancedImageDataUrl` is invoked before verifying `error || data?.error`, momentarily setting `testEnhancedUrl` before clearing it on error.

---

## 1. Full Lifecycle Analysis of API Key / Bearer Token

### 1.1 Input & In-Memory State (`KobilLlmConfigView.tsx`)
```
[User Input] ──> [chatApiKeyInput / imageApiKeyInput]
                         │
        isMaskedKeyString() === false ?
                         ├──> [rawChatApiKey / rawImageApiKey]
```
- **Initial State**:
  - `rawChatApiKey` & `rawImageApiKey`: Initialized with `DEFAULT_AI_CONFIG` (`sk-koboi-live-99887766554433221100`).
  - `chatApiKeyInput` & `imageApiKeyInput`: Initialized with `maskApiKey(...)` (`sk-k...1100`).
- **Typing Behavior**:
  - Typing triggers `onChange`: `setChatApiKeyInput(newVal); if (!isMaskedKeyString(newVal)) setRawChatApiKey(newVal);`.
  - Password visibility toggle (`showChatKey` / `showImageKey`) switches input value between `rawChatApiKey` and `chatApiKeyInput`.

### 1.2 Persistence Layer (`localStorage` & `api_provider_settings`)
When user clicks "Simpan Semua Konfigurasi" (`handleSaveConfig`):
1. **Chat Key Resolution**:
   ```typescript
   let chatKeyToSave = rawChatApiKey;
   if (!isMaskedKeyString(chatApiKeyInput) && chatApiKeyInput.trim() !== '') {
     chatKeyToSave = chatApiKeyInput.trim();
   }
   ```
2. **Image Key Resolution (Buggy implementation)**:
   ```typescript
   // CURRENT BUG (Line 418):
   let imageKeyToSave = imageApiKeyInput.trim() || rawImageApiKey;
   // When imageApiKeyInput = "sk-k...1100", imageKeyToSave = "sk-k...1100" (MASKED CORRUPTED!)
   ```
3. **Database & Local Storage Storage**:
   - `localStorage.setItem('pea_ai_provider_config_v4', JSON.stringify({ chatConfig, imageConfig }))`
   - `supabase.from('api_provider_settings').upsert([...])` with `id: 'prov-setting-chat'` and `id: 'prov-setting-image'`.
   - In-memory `mockDb.api_provider_settings` updated.

### 1.3 Retrieval on Startup / Hydration
1. `KobilLlmConfigView.tsx` `loadConfig`:
   - Reads `localStorage.getItem('pea_ai_provider_config_v4')`.
   - Queries `supabase.from('api_provider_settings').select('*').eq('is_active', true)`.
   - Populates `rawChatApiKey`, `rawImageApiKey`, `chatApiKeyInput`, `imageApiKeyInput`.
2. `mockDb.seedDefaults()` (`src/lib/mockSupabase.ts`):
   - Auto-hydrates `prov-setting-chat` and `prov-setting-image` with `rawApiKey` from `localStorage` (`pea_ai_provider_config_v4`) to prevent hardcoded defaults from overriding user settings on page refresh.

### 1.4 Invocation Flow & Bearer Token Propagation

#### Flow A: Realtime User Enhancement (`/app/editor`)
```
[EditorPage.tsx]
   │
   ▼
[useRealtimeEnhancement.startEnhancement]
   │  Calls: supabase.functions.invoke('enhance-image', {
   │           headers: { Authorization: `Bearer ${user.id}` }
   │         })
   ▼
[supabase.functions.enhance-image / mockSupabase.handleEnhanceImage]
   │
   ├─► 1. Verify User Auth Token (`Bearer ${user.id}`)
   ├─► 2. Check & Consume User Monthly Quota (`executeCheckAndConsumeQuota`)
   ├─► 3. Insert `images` row (status: 'queued') -> Update (status: 'processing')
   ├─► 4. Retrieve Active Provider Config for purpose='image_generation'
   │      - baseUrl: "https://api.koboillm.com/v1"
   │      - model: "gemini-2.5-flash-image"
   │      - apiKey: raw unmasked API key
   ├─► 5. Dispatch Server-to-Server Fetch:
   │      POST https://api.koboillm.com/v1/chat/completions
   │      Headers: {
   │        "Content-Type": "application/json",
   │        "Authorization": "Bearer <rawApiKey>"
   │      }
   │      Body: {
   │        "model": "gemini-2.5-flash-image",
   │        "messages": [{
   │          "role": "user",
   │          "content": [
   │            { "type": "text", "text": "..." },
   │            { "type": "image_url", "image_url": { "url": "<base64>" } }
   │          ]
   │        }]
   │      }
   │
   ├─► 6A. On HTTP Error (401, 400, 500):
   │       - Extract raw server response text (e.g. `Kobil LLM HTTP 401: {"error":{"message":"Invalid proxy server token"}}`)
   │       - Update `images` row: status='failed', error_message=rawApiError
   │       - Return { success: false, status: 'failed', error: rawApiError }
   │       - Frontend sets `status='failed'`, `errorMessage=rawApiError`, suppresses Before/After slider.
   │
   └─► 6B. On HTTP 200 Success:
           - Parse `json?.choices?.[0]?.message?.images?.[0]?.image_url?.url`
           - Update `images` row: status='done', enhanced_url=enhancedUrl
           - Return { success: true, status: 'done', enhanced_url: enhancedUrl }
           - Frontend sets `status='done'`, renders Before/After slider.
```

---

## 2. Detailed Findings & Root Cause Analysis

### Finding 1: Masked String Overwrite on Image Key in `handleSaveConfig`
- **Location**: `src/components/admin/KobilLlmConfigView.tsx:418`
- **Code**:
  ```typescript
  // Line 412: Chat key handles masking correctly
  let chatKeyToSave = rawChatApiKey;
  if (!isMaskedKeyString(chatApiKeyInput) && chatApiKeyInput.trim() !== '') {
    chatKeyToSave = chatApiKeyInput.trim();
  }

  // Line 418: Image key FAILS to check isMaskedKeyString
  let imageKeyToSave = imageApiKeyInput.trim() || rawImageApiKey;
  ```
- **Consequence**: If an admin changes the chat provider or model and hits Save without touching the image API key field, `imageApiKeyInput` (e.g., `'sk-k...1100'`) is treated as truthy and saved to database/vault. Subsequent calls fail with HTTP 401 invalid token.
- **Remediation**:
  ```typescript
  let imageKeyToSave = rawImageApiKey;
  if (!isMaskedKeyString(imageApiKeyInput) && imageApiKeyInput.trim() !== '') {
    imageKeyToSave = imageApiKeyInput.trim();
  }
  ```

---

### Finding 2: Provider Selection Conflict in `supabase/functions/enhance-image/index.ts`
- **Location**: `supabase/functions/enhance-image/index.ts:58-65`
- **Code**:
  ```typescript
  const { data: config, error: configError } = await supabaseAdmin
    .from("api_provider_settings")
    .select("base_url, model_name, api_key_encrypted")
    .eq("provider_name", "kobil_llm")
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();
  ```
- **Consequence**: `api_provider_settings` contains two active records with `provider_name: 'kobil_llm'`: one for `purpose = 'chat'` and one for `purpose = 'image_generation'`. Querying without filtering by `purpose = 'image_generation'` is non-deterministic and can pull chat config (`gemini-2.5-flash`) instead of image model (`gemini-2.5-flash-image`).
- **Remediation**:
  ```typescript
  const { data: config, error: configError } = await supabaseAdmin
    .from("api_provider_settings")
    .select("base_url, model_name, api_key_encrypted")
    .eq("purpose", "image_generation")
    .eq("is_active", true)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  ```

---

### Finding 3: Token Sanitization (Prefix Duplication & Whitespace)
- **Locations**:
  - `src/components/admin/KobilLlmConfigView.tsx`
  - `src/lib/mockSupabase.ts`
  - `supabase/functions/enhance-image/index.ts`
  - `supabase/functions/ai-chat/index.ts`
  - `supabase/functions/list-ai-models/index.ts`
- **Analysis**:
  When users paste keys directly from web consoles, they often include leading `"Bearer "` or surrounding whitespace.
  Calling `Authorization: Bearer ${apiKey}` when `apiKey = "Bearer sk-..."` produces `Authorization: Bearer Bearer sk-...`, which fails on LiteLLM Proxy.
- **Remediation Helper**:
  ```typescript
  export const sanitizeApiKey = (key?: string | null): string => {
    if (!key) return '';
    return key.replace(/^Bearer\s+/i, '').trim();
  };
  ```

---

### Finding 4: Typo in `list-ai-models/index.ts` Fallback URL
- **Location**: `supabase/functions/list-ai-models/index.ts:22`
- **Code**:
  ```typescript
  const baseUrl = payload.base_url || "https://api.koboiillm.com/v1";
  ```
- **Analysis**: Contains double 'i' (`koboiillm.com`), which causes DNS lookup failure. Must be normalized with `.replace("koboiillm.com", "koboillm.com")`.

---

### Finding 5: Error Guarding & Slider Suppression in `EditorPage.tsx`
- **Location**: `src/pages/app/EditorPage.tsx:85, 131-139, 142`
- **Code Verification**:
  - Line 85: `const isDone = status === 'done' && !!enhancedUrl && !errorMessage;`
  - Line 142: `{isDone ? ( <BeforeAfterSlider ... /> ) : ( <ActiveStudioWorkspace /> )}`
  - Line 131: Renders `<div data-testid="editor-error-banner">` displaying verbatim `errorMessage`.
- **Verdict**: Fully compliant with R1. Whenever `enhance-image` returns an HTTP error (401, 400, 500), `isDone` is `false`, suppressing the slider and showing only the error alert banner.

---

## 3. Proposed Code Modifications Matrix

| Target File | Line(s) | Issue Description | Proposed Solution |
|---|---|---|---|
| `src/components/admin/KobilLlmConfigView.tsx` | 418 | `imageKeyToSave` overwrites raw key with masked string | Guard with `!isMaskedKeyString(imageApiKeyInput)` |
| `src/components/admin/KobilLlmConfigView.tsx` | 155-156 | Premature Canvas generator call before checking API error | Only invoke `generateEnhancedImageDataUrl` if no error |
| `src/lib/mockSupabase.ts` | 1379 | No `Bearer ` prefix sanitization on `rawApiKey` | Strip leading `Bearer ` and trim before interpolation |
| `supabase/functions/enhance-image/index.ts` | 61 | Ambiguous query without `purpose = 'image_generation'` | Filter by `.eq("purpose", "image_generation")` and sanitize key |
| `supabase/functions/list-ai-models/index.ts` | 22 | Fallback URL contains `koboiillm.com` typo | Fix spelling and add `.replace("koboiillm.com", "koboillm.com")` |
| `supabase/functions/ai-chat/index.ts` | 32, 77 | No `Bearer ` prefix sanitization | Apply `apiKey.replace(/^Bearer\s+/i, '').trim()` |

---
