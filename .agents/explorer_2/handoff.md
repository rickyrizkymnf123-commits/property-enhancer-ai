# Handoff Report — Explorer 2: Kobil LLM Proxy Auth & Bearer Token Resolution

**Working Directory**: `C:\Users\UC\.gemini\antigravity\scratch\property-enhancer-ai\.agents\explorer_2`  
**Parent Agent**: `bf1d02db-6ad7-4495-87a6-7cbec3de5d4c`  
**Report Type**: Hard Handoff (Investigation Complete)  
**Date**: 2026-08-31T19:00:20+07:00  

---

## 1. Observation

Direct observations across the codebase and runtime execution:

### Observation 1.1: Masked String Overwriting Real API Key in `KobilLlmConfigView.tsx`
- **File**: `src/components/admin/KobilLlmConfigView.tsx`
- **Line 412–418**:
  ```typescript
  // 1. Determine Chat Key to save
  let chatKeyToSave = rawChatApiKey;
  if (!isMaskedKeyString(chatApiKeyInput) && chatApiKeyInput.trim() !== '') {
    chatKeyToSave = chatApiKeyInput.trim();
  }

  // 2. Determine Image Key to save
  let imageKeyToSave = imageApiKeyInput.trim() || rawImageApiKey;
  ```
- **Line 89**:
  ```typescript
  const [imageApiKeyInput, setImageApiKeyInput] = useState<string>(maskApiKey(DEFAULT_AI_CONFIG.imageConfig.apiKey));
  ```
- **Line 439–441**:
  ```typescript
  setRawImageApiKey(imageKeyToSave);
  setImageApiKeyInput(imageKeyToSave);
  ```
- **Verbatim Result**: `chatKeyToSave` explicitly checks `!isMaskedKeyString(chatApiKeyInput)`. `imageKeyToSave` does NOT check `isMaskedKeyString(imageApiKeyInput)`. When `imageApiKeyInput` holds a masked string (`sk-k...1100`), `imageApiKeyInput.trim()` evaluates to truthy, overwriting `imageKeyToSave` and `rawImageApiKey` with the masked text `sk-k...1100`.

### Observation 1.2: Ambiguous Provider Purpose Query in `supabase/functions/enhance-image/index.ts`
- **File**: `supabase/functions/enhance-image/index.ts`
- **Lines 58–65**:
  ```typescript
  const { data: config, error: configError } = await supabaseAdmin
    .from("api_provider_settings")
    .select("base_url, model_name, api_key_encrypted")
    .eq("provider_name", "kobil_llm")
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();
  ```
- **Database Schema**: `api_provider_settings` contains two rows with `provider_name = 'kobil_llm'` and `is_active = true` (one for `purpose = 'chat'` and one for `purpose = 'image_generation'`).
- **Verbatim Result**: Filtering by `.eq("provider_name", "kobil_llm")` without `.eq("purpose", "image_generation")` allows the database to return the `chat` record (`gemini-2.5-flash`) instead of the image model (`gemini-2.5-flash-image`).

### Observation 1.3: Domain Spelling Typo in `supabase/functions/list-ai-models/index.ts`
- **File**: `supabase/functions/list-ai-models/index.ts`
- **Line 22**:
  ```typescript
  const baseUrl = payload.base_url || "https://api.koboiillm.com/v1";
  ```
- **Verbatim Result**: Fallback string contains `koboiillm.com` with two 'i's and lacks `.replace("koboiillm.com", "koboillm.com")`.

### Observation 1.4: Strict Error Guard & Before/After Slider Suppression in `EditorPage.tsx`
- **File**: `src/pages/app/EditorPage.tsx`
- **Lines 84–86 & 131–142**:
  ```typescript
  const isDone = status === 'done' && !!enhancedUrl && !errorMessage;
  ```
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

  {isDone ? (
    <div ... data-testid="editor-result-view">
      <BeforeAfterSlider ... />
    </div>
  ) : ( ... )}
  ```
- **Verbatim Result**: When `status !== 'done'` or `errorMessage` is truthy, `isDone` is `false`, completely suppressing `BeforeAfterSlider` and displaying only `editor-error-banner`.

### Observation 1.5: Test Suite Baseline
- **Command**: `npm run test`
- **Output**:
  ```
  Test Files  11 passed (11)
       Tests  340 passed (340)
    Duration  4.10s
  ```

---

## 2. Logic Chain

1. **Premise 1**: When an admin accesses `/admin/keys`, `imageApiKeyInput` is initialized to the masked key string (`sk-k...1100` via `maskApiKey`).
2. **Premise 2**: If the admin clicks "Simpan Semua Konfigurasi" without modifying the image key input, line 418 evaluates `imageApiKeyInput.trim() || rawImageApiKey`. Since `'sk-k...1100'.trim()` is truthy, `imageKeyToSave` becomes `'sk-k...1100'`.
3. **Inference 1**: The masked key is persisted to `localStorage` (`pea_ai_provider_config_v4`) and Supabase table `api_provider_settings` (row `prov-setting-image`).
4. **Inference 2**: On subsequent enhancement calls, `mockSupabase.ts` and `supabase/functions/enhance-image` load `'sk-k...1100'` as the active API key and send `Authorization: Bearer sk-k...1100` to `https://api.koboillm.com/v1/chat/completions`.
5. **Inference 3**: LiteLLM Proxy attempts database token validation for `sk-k...1100`, fails to locate it, and returns HTTP 401 (`{"error":{"message":"Invalid proxy server token","code":"token_not_found_in_db"}}`).
6. **Inference 4**: In `supabase/functions/enhance-image/index.ts`, line 61 queries `api_provider_settings` with `.eq("provider_name", "kobil_llm").eq("is_active", true)` without filtering by `purpose = "image_generation"`. In databases where multiple purposes share the provider name, this query can unpredictably load the chat configuration (`gemini-2.5-flash`), compounding the failure.
7. **Inference 5**: In `useRealtimeEnhancement.ts` and `EditorPage.tsx`, the resulting HTTP error is captured as `errorMessage`, setting `status = 'failed'` and `isDone = false`. The Before/After slider is hidden, and the error card is displayed.

---

## 3. Caveats

- **No Caveats on Local Reproduction**: The complete call chain was traced across all 7 relevant files.
- **External Network Dependency**: Live HTTP requests to `https://api.koboillm.com/v1` depend on external connectivity and proxy token validity in Kobil LLM's backend database. In CI/test environments, `mockSupabase.ts` provides full fidelity mock responses while Vitest environment is active.

---

## 4. Conclusion

1. **Primary Bug Fix**: In `src/components/admin/KobilLlmConfigView.tsx:418`, replace `let imageKeyToSave = imageApiKeyInput.trim() || rawImageApiKey;` with:
   ```typescript
   let imageKeyToSave = rawImageApiKey;
   if (!isMaskedKeyString(imageApiKeyInput) && imageApiKeyInput.trim() !== '') {
     imageKeyToSave = imageApiKeyInput.trim();
   }
   ```
2. **Edge Function Purpose Filter**: In `supabase/functions/enhance-image/index.ts:61`, query `.eq("purpose", "image_generation").eq("is_active", true)` instead of `.eq("provider_name", "kobil_llm")`.
3. **Prefix & Whitespace Sanitization**: Strip leading `Bearer ` and trim API keys across all callers:
   ```typescript
   const cleanKey = apiKey.replace(/^Bearer\s+/i, '').trim();
   ```
4. **URL Normalization**: Ensure `supabase/functions/list-ai-models/index.ts` defaults to `https://api.koboillm.com/v1` and applies `.replace("koboiillm.com", "koboillm.com")`.
5. **Error Guard Compliance**: `EditorPage.tsx` and `useRealtimeEnhancement.ts` already satisfy Requirement R1 (strict Before/After slider suppression and raw error card display).

---

## 5. Verification Method

To independently verify the observations and conclusions:

1. **Static Inspection**:
   - Inspect `src/components/admin/KobilLlmConfigView.tsx` line 418 vs line 412.
   - Inspect `supabase/functions/enhance-image/index.ts` line 61.
   - Inspect `src/pages/app/EditorPage.tsx` line 85 and line 131–142.
2. **Test Suite Verification**:
   - Run `npm run test` in powershell.
   - Confirm all 340 tests across 11 test suites pass 100%.
3. **Build Compilation**:
   - Run `npm run build` to ensure clean TypeScript compilation without warnings.
