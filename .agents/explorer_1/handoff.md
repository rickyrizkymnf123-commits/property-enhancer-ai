# Handoff Report: Error Guard & Result View Suppression in AI Studio & Editor

**Agent**: Explorer 1  
**Working Directory**: `C:\Users\UC\.gemini\antigravity\scratch\property-enhancer-ai\.agents\explorer_1`  
**Handoff Type**: Hard (Task Complete)

---

## 1. Observation

1. **`src/pages/app/EditorPage.tsx:85, 131-147`**:
   - Line 85: `const isDone = status === 'done' && !!enhancedUrl && !errorMessage;`
   - Lines 131-139: Renders raw error card banner (`data-testid="editor-error-banner"`) when `errorMessage` is truthy.
   - Line 142: `{isDone ? ( <div data-testid="editor-result-view"><BeforeAfterSlider ... /></div> ) : ( <div className="grid grid-cols-1 ...">...</div> )}`.
   - Verified that when `errorMessage` is set, `isDone` is strictly `false`, preventing `BeforeAfterSlider` from rendering in the Editor.

2. **`src/hooks/useRealtimeEnhancement.ts:58-70, 89-91, 135-156`**:
   - Line 89-91: `startEnhancement` calls `setErrorMessage(null)` and `setStatus('queued')` but does NOT call `setEnhancedUrl(null)`.
   - Line 135-140:
     ```ts
     if (error || data?.error || data?.success === false) {
       setStatus('failed');
       const errMsg = data?.error || error?.message || 'Terjadi kesalahan pada AI processing';
       setErrorMessage(errMsg);
       return { success: false, error: errMsg };
     }
     ```
     `setEnhancedUrl(null)` is not called on error.
   - Line 65-68 (Realtime postgres changes listener):
     ```ts
     setStatus(newRecord.status);
     if (newRecord.original_url) setOriginalUrl(newRecord.original_url);
     if (newRecord.enhanced_url) setEnhancedUrl(newRecord.enhanced_url);
     if (newRecord.error_message) setErrorMessage(newRecord.error_message);
     ```
     When `newRecord.status === 'failed'`, `newRecord.enhanced_url` is null in the database. The `if (newRecord.enhanced_url)` guard prevents React state `enhancedUrl` from being cleared to `null`.

3. **`src/components/admin/KobilLlmConfigView.tsx:131-198, 1087-1123`**:
   - Lines 155-156:
     ```ts
     const displayDataUrl = await generateEnhancedImageDataUrl(testOriginalUrl, testPrompt);
     setTestEnhancedUrl(displayDataUrl);
     ```
     This is executed **before** line 182 `if (error || data?.error)`.
   - Lines 1087-1095: Error alert card is currently styled with `bg-amber-950/40 border-amber-500/30 text-amber-300` under title "Catatan Pengujian AI Provider:".
   - Lines 1109-1117: `BeforeAfterSlider` is rendered if `testEnhancedUrl` is truthy. Because `displayDataUrl` was set at line 156, `testEnhancedUrl` temporarily or permanently held a fallback image before/despite errors.

4. **`supabase/functions/enhance-image/index.ts:58-64, 85-115`**:
   - Lines 58-64:
     ```ts
     const { data: config, error: configError } = await supabaseAdmin
       .from("api_provider_settings")
       .select("base_url, model_name, api_key_encrypted")
       .eq("provider_name", "kobil_llm")
       .eq("is_active", true)
       .limit(1)
       .maybeSingle();
     ```
     Lacks `.eq("purpose", "image_generation")`.
   - Lines 85-90 & 112-115:
     Passes `"Authorization": "Bearer " + apiKey` to `${baseUrl}/chat/completions`.
     If `!response.ok`, throws `Error("Kobil LLM HTTP " + response.status + ": " + errText.substring(0, 500))`.

5. **`tests/` & Vitest Output**:
   - Command: `npx vitest run`
   - Result: 11 test files passed, 340 tests passed (100% pass rate).

---

## 2. Logic Chain

1. **Premise 1**: Requirement R1 dictates that on any AI Provider HTTP error (401, 400, 500), the system MUST NOT render the "SESUDAH (AI)" slider or any fallback image, and must suppress the Before/After slider while showing the raw server JSON error card.
2. **Premise 2**: In `EditorPage.tsx`, rendering of `BeforeAfterSlider` is gated by `isDone = status === 'done' && !!enhancedUrl && !errorMessage`. If `errorMessage` is set, `isDone` is `false`.
3. **Inference 1 (Observation 2)**: Because `useRealtimeEnhancement.ts` did not clear `enhancedUrl = null` on `startEnhancement` or inside the `error || data?.error` block, a previous run's `enhancedUrl` remains in memory. If a subsequent run fails and `errorMessage` was somehow bypassed or transient, `enhancedUrl` would be non-null. Explicitly resetting `setEnhancedUrl(null)` on error and at the start of enhancement guarantees zero leakage of stale images.
4. **Inference 2 (Observation 3)**: In `KobilLlmConfigView.tsx`, line 156 set `testEnhancedUrl` to a client-generated fallback before error validation. If an HTTP 401 error occurs, the slider can flash or render before being reset. Moving `setTestEnhancedUrl` strictly inside the `if (!error && !data?.error)` block and ensuring `setTestEnhancedUrl(null)` on error completely prevents fallback rendering on HTTP errors.
5. **Inference 3 (Observation 4)**: In `supabase/functions/enhance-image/index.ts`, adding `.eq("purpose", "image_generation")` ensures the image generation API key and model (`gemini-2.5-flash-image`) are resolved rather than the chat row.

---

## 3. Caveats

- **No Caveats**: All relevant files (`EditorPage.tsx`, `useRealtimeEnhancement.ts`, `KobilLlmConfigView.tsx`, `BeforeAfterSlider.tsx`, `mockSupabase.ts`, `supabase/functions/enhance-image/index.ts`, and test files) were fully inspected and traced.

---

## 4. Conclusion

The system's error guarding and result suppression architecture is well-structured but requires three targeted hardening updates:
1. **`KobilLlmConfigView.tsx`**: Remove premature invocation of `generateEnhancedImageDataUrl` before the error check in `handleTestAdminImageGeneration`. Set `testEnhancedUrl` exclusively from valid server response `data?.enhanced_url` when `!error && !data?.error`. Set `testEnhancedUrl(null)` on error and style the error card with prominent red styling (`bg-red-950/60 border-red-500/50 text-red-200`).
2. **`useRealtimeEnhancement.ts`**: Add `setEnhancedUrl(null)` at the start of `startEnhancement`, in the `error || data?.error` branch, in the `catch` block, and in the realtime listener when `newRecord.status === 'failed'`.
3. **`supabase/functions/enhance-image/index.ts`**: Add `.eq("purpose", "image_generation")` to the `api_provider_settings` query so the image generation configuration and API key are cleanly resolved and dispatched with `Authorization: Bearer <apiKey>` to `https://api.koboillm.com/v1/chat/completions`.

---

## 5. Verification Method

To independently verify these findings:
1. **Inspect Code Locations**:
   - `src/pages/app/EditorPage.tsx`: Line 85 (`isDone` logic), Lines 131-147 (error banner and conditional slider).
   - `src/hooks/useRealtimeEnhancement.ts`: Lines 89-91, 135-156.
   - `src/components/admin/KobilLlmConfigView.tsx`: Lines 141-188, 1087-1123.
   - `supabase/functions/enhance-image/index.ts`: Lines 58-64, 85-115.
2. **Execute Test Suite**:
   - Run: `npx vitest run` in workspace root `C:\Users\UC\.gemini\antigravity\scratch\property-enhancer-ai`.
   - Verify all 340 unit and E2E tests pass 100%.
3. **Invalidation Conditions**:
   - If `BeforeAfterSlider` or `data-testid="editor-result-view"` is rendered while `errorMessage` is non-null, the error guard is violated.
   - If `testEnhancedUrl` is set in `KobilLlmConfigView.tsx` when `supabase.functions.invoke('enhance-image')` returns HTTP 401/400/500, the result suppression guard is violated.
