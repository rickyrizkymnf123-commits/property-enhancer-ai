# Investigation Report: Error Guard & Result View Suppression in AI Studio & Editor

**Author**: Explorer 1  
**Date**: 2026-08-31  
**Scope**: `KobilLlmConfigView.tsx`, `EditorPage.tsx`, `useRealtimeEnhancement.ts`, `BeforeAfterSlider.tsx`, `mockSupabase.ts`, `supabase/functions/enhance-image/index.ts`

---

## 1. Executive Summary

We investigated the error handling and result view suppression mechanisms across the AI Studio (`EditorPage`), Admin Test View (`KobilLlmConfigView`), realtime hooks (`useRealtimeEnhancement`), mock backend (`mockSupabase`), and backend edge function (`supabase/functions/enhance-image/index.ts`).

### Key Findings:
1. **Result View Suppression in `EditorPage.tsx`**:
   - `EditorPage` already implements a strict boolean guard: `const isDone = status === 'done' && !!enhancedUrl && !errorMessage;`.
   - When `errorMessage` is set, `isDone` evaluates to `false`, completely suppressing the `BeforeAfterSlider` result view and rendering the raw error banner (`editor-error-banner`).
   - However, in `useRealtimeEnhancement.ts`, `enhancedUrl` was not explicitly cleared (`setEnhancedUrl(null)`) at the start of `startEnhancement` or inside the error catch blocks / realtime `failed` event handlers. This created a vulnerability where a previous enhancement's image could persist in state during subsequent failed runs.

2. **Unconditional Fallback Generation in `KobilLlmConfigView.tsx`**:
   - In `KobilLlmConfigView.tsx` (`handleTestAdminImageGeneration`), `generateEnhancedImageDataUrl(testOriginalUrl, testPrompt)` was executed and set to `setTestEnhancedUrl(displayDataUrl)` **before** verifying whether `supabase.functions.invoke('enhance-image')` returned an error.
   - Although later error checks reset `testEnhancedUrl(null)`, calling fallback generation ahead of error verification can cause race condition image flashes or display fallback sliders when API calls return HTTP 401/400/500 errors.
   - On success, `KobilLlmConfigView.tsx` also ignored the actual server `data?.enhanced_url` in favor of client-side canvas fallback.

3. **Provider Purpose Query in `enhance-image/index.ts`**:
   - `supabase/functions/enhance-image/index.ts` queried `api_provider_settings` with `.eq("provider_name", "kobil_llm").eq("is_active", true)` without filtering `.eq("purpose", "image_generation")`. Because the database stores separate rows for `purpose='chat'` and `purpose='image_generation'`, this could resolve the text model (`gemini-2.5-flash`) instead of the image model (`gemini-2.5-flash-image`).

4. **Kobil LLM Proxy Auth Resolution**:
   - Both `supabase/functions/enhance-image/index.ts` and `mockSupabase.ts` successfully construct the `Authorization: Bearer <apiKey>` header when dispatching `POST` requests to `https://api.koboillm.com/v1/chat/completions`.
   - Error responses from Kobil LLM Proxy (`!response.ok`) are parsed and propagated with raw HTTP status and server error payload (e.g. `Kobil LLM HTTP 401: {"error":{"code":"token_not_found_in_db","message":"Invalid proxy server token"}}`).

---

## 2. Detailed Component Breakdown & Evidence Chain

### 2.1 `src/pages/app/EditorPage.tsx`
- **Location**: `src/pages/app/EditorPage.tsx:85, 131-147`
- **Observation**:
  ```tsx
  85: const isDone = status === 'done' && !!enhancedUrl && !errorMessage;
  ...
  131: {errorMessage && (
  132:   <div className="p-4 rounded-2xl bg-red-950/60 border border-red-500/50 text-red-200 space-y-1 font-mono text-xs shadow-lg animate-in fade-in" data-testid="editor-error-banner">
  133:     <div className="flex items-center gap-2 font-bold text-red-400">
  134:       <AlertTriangle className="w-4 h-4 text-red-400" />
  135:       <span>Error AI Provider Response (Raw Error):</span>
  136:     </div>
  137:     <p className="whitespace-pre-wrap opacity-90 break-words">{errorMessage}</p>
  138:   </div>
  139: )}
  ...
  142: {isDone ? (
  143:   /* Enhancement Done Result Comparison View */
  144:   <div className="..." data-testid="editor-result-view">
  145:     ...
  146:     <BeforeAfterSlider ... />
  147:   </div>
  148: ) : ( ... )}
  ```
- **Analysis**:
  - `EditorPage` conditionally hides the entire result container (including `BeforeAfterSlider`, zoom trigger, and download button) when `isDone` is `false`.
  - When an error occurs (`errorMessage` is not null), `isDone` evaluates to `false`.
  - To prevent false positives, `useRealtimeEnhancement` must ensure `enhancedUrl` is strictly `null` whenever `errorMessage` is populated.

### 2.2 `src/hooks/useRealtimeEnhancement.ts`
- **Location**: `src/hooks/useRealtimeEnhancement.ts:58-70, 89-91, 135-156`
- **Observation**:
  - In `startEnhancement`:
    ```ts
    89: setErrorMessage(null);
    90: setStatus('queued');
    // Note: setEnhancedUrl(null) is missing here!
    ```
  - In invoke error handling:
    ```ts
    135: if (error || data?.error || data?.success === false) {
    136:   setStatus('failed');
    // Note: setEnhancedUrl(null) is missing here!
    137:   const errMsg = data?.error || error?.message || 'Terjadi kesalahan pada AI processing';
    138:   setErrorMessage(errMsg);
    139:   return { success: false, error: errMsg };
    140: }
    ```
  - In realtime postgres changes listener:
    ```ts
    65: setStatus(newRecord.status);
    66: if (newRecord.original_url) setOriginalUrl(newRecord.original_url);
    67: if (newRecord.enhanced_url) setEnhancedUrl(newRecord.enhanced_url);
    68: if (newRecord.error_message) setErrorMessage(newRecord.error_message);
    // When status === 'failed', newRecord.enhanced_url is null; if check skips resetting enhancedUrl!
    ```
- **Analysis**:
  - If a user performs an enhancement that succeeds, `enhancedUrl` is set. If the user then submits a second photo and the provider returns HTTP 401, `enhancedUrl` remains set to the old URL.
  - Fix: Explicitly reset `setEnhancedUrl(null)` on `startEnhancement`, when `error || data?.error` is caught, and when `newRecord.status === 'failed'`.

### 2.3 `src/components/admin/KobilLlmConfigView.tsx`
- **Location**: `src/components/admin/KobilLlmConfigView.tsx:131-198, 1087-1123`
- **Observation**:
  ```ts
  152: const latencyMs = Date.now() - startTime;
  153: setImageTestLatency(latencyMs);
  154: 
  155: const displayDataUrl = await generateEnhancedImageDataUrl(testOriginalUrl, testPrompt);
  156: setTestEnhancedUrl(displayDataUrl);
  ...
  182: if (error || data?.error) {
  183:   const errMsg = data?.error || error?.message || 'Error memproses AI Image Generation';
  184:   setImageTestError(errMsg);
  185:   setTestEnhancedUrl(null);
  186:   toast.error('Pengujian Gagal', errMsg);
  187: } else {
  188:   toast.success('Pengujian AI Studio Sukses!', `Hasil AI berhasil digenerate dalam ${latencyMs}ms.`);
  189: }
  ```
- **Analysis**:
  - Lines 155-156 generate and assign a canvas fallback image before checking for errors.
  - If the server returned an error (e.g. HTTP 401 `token_not_found_in_db`), `setTestEnhancedUrl(displayDataUrl)` was already executed, temporarily rendering the "SESUDAH (AI)" slider.
  - Fix:
    1. Only set `testEnhancedUrl` when `!error && !data?.error && data?.success !== false`.
    2. Use the real server image `data?.enhanced_url || data?.enhancedUrl`. Only use client canvas in test/mock environment if no error occurred.
    3. Update the error alert card styling in UI to prominent red card (`bg-red-950/60 border-red-500/50 text-red-200`) detailing the HTTP error status and raw server JSON response.

### 2.4 `src/components/studio/BeforeAfterSlider.tsx`
- **Location**: `src/components/studio/BeforeAfterSlider.tsx:163-187`
- **Observation**:
  - `BeforeAfterSlider` is purely presentational: it renders `enhancedUrl` in `img[data-testid="enhanced-image"]` and `originalUrl` in `img[data-testid="original-image"]`.
  - It does not contain error-handling logic; result suppression must be enforced by container components (`EditorPage` and `KobilLlmConfigView`) by conditionally unmounting/hiding the slider when errors occur.

### 2.5 `supabase/functions/enhance-image/index.ts`
- **Location**: `supabase/functions/enhance-image/index.ts:58-64, 85-115`
- **Observation**:
  - Query:
    ```ts
    58: const { data: config, error: configError } = await supabaseAdmin
    59:   .from("api_provider_settings")
    60:   .select("base_url, model_name, api_key_encrypted")
    61:   .eq("provider_name", "kobil_llm")
    62:   .eq("is_active", true)
    63:   .limit(1)
    64:   .maybeSingle();
    ```
    *Issue*: Needs `.eq("purpose", "image_generation")` to prevent matching the chat provider row.
  - Proxy Dispatch:
    ```ts
    85: const response = await fetch(endpoint, {
    86:   method: "POST",
    87:   headers: {
    88:     "Content-Type": "application/json",
    89:     "Authorization": `Bearer ${apiKey}`,
    90:   },
    91:   body: JSON.stringify({ ... }),
    92: });
    ...
    112: if (!response.ok) {
    113:   const errText = await response.text();
    114:   throw new Error(`Kobil LLM HTTP ${response.status}: ${errText.substring(0, 500)}`);
    115: }
    ```
  - Analysis:
    - Cleanly passes `Authorization: Bearer <apiKey>` to `https://api.koboillm.com/v1/chat/completions`.
    - If Kobil LLM Proxy returns HTTP 401/400/500, it throws an error formatted with HTTP status and raw server response text, returning `{ success: false, status: "failed", error: "Kobil LLM HTTP ..." }`.

---

## 3. Comparison & Verification Matrix

| Area | Current Behavior | Required Behavior | Status / Action Needed |
|---|---|---|---|
| **Editor Result View on Error** | Suppressed if `errorMessage` is set (`isDone = status === 'done' && !!enhancedUrl && !errorMessage`) | Slider MUST NOT render; raw error card shown | Verified in `EditorPage.tsx`; need `useRealtimeEnhancement` state cleanup |
| **Admin Test View on Error** | Fallback generated before error check (`generateEnhancedImageDataUrl` called at line 155) | Slider MUST NOT render; `testEnhancedUrl` must be `null`; prominent red raw error card | **Fix required** in `KobilLlmConfigView.tsx` |
| **useRealtimeEnhancement State Reset** | `enhancedUrl` not reset to `null` on start or error | `enhancedUrl` must be reset to `null` on `startEnhancement`, `catch`, and `failed` status | **Fix required** in `useRealtimeEnhancement.ts` |
| **Kobil LLM Proxy Auth** | Bearer token passed in fetch headers | Active API Key passed in `Authorization: Bearer <key>` to `https://api.koboillm.com/v1/chat/completions` | Correct; ensure `purpose='image_generation'` filter in DB query |
| **Edge Function DB Resolution** | Queries `api_provider_settings` with `.eq("provider_name", "kobil_llm")` | Must query with `.eq("purpose", "image_generation")` | **Fix required** in `supabase/functions/enhance-image/index.ts` |

---

## 4. Proposed Code Adjustments Summary

1. **`src/components/admin/KobilLlmConfigView.tsx`**:
   - In `handleTestAdminImageGeneration`:
     - Move result URL assignment inside `if (!error && !data?.error && data?.success !== false)` block.
     - On error, explicitly set `setTestEnhancedUrl(null)` and `setImageTestError(errMsg)`.
     - Update error alert card container styling to red theme (`bg-red-950/60 border-red-500/50 text-red-200`) and display full HTTP error details.
2. **`src/hooks/useRealtimeEnhancement.ts`**:
   - In `startEnhancement`: add `setEnhancedUrl(null)` at start.
   - In error branches (`if (error || data?.error ...)` and `catch (err)`): add `setEnhancedUrl(null)`.
   - In realtime subscription & `syncImageRecord`: if `record.status === 'failed'`, call `setEnhancedUrl(null)`.
3. **`supabase/functions/enhance-image/index.ts`**:
   - Add `.eq("purpose", "image_generation")` when fetching provider config from `api_provider_settings`.
4. **`src/lib/mockSupabase.ts`**:
   - Verify `handleEnhanceImage` returns `{ data: { success: false, status: 'failed', error: rawApiError }, error: { message: rawApiError, status: 500 } }` on proxy error and sets `status = 'failed'`, `error_message = rawApiError`, `enhanced_url = null`.
