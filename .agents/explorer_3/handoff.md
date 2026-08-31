# Handoff Report: Vitest Test Suite & Coverage for Error Guarding & Token Resolution

**Agent**: Explorer 3  
**Target Recipient**: Parent (Orchestrator / Implementation Agent)  
**Date**: 2026-08-31T19:01:00+07:00  
**Handoff Type**: Hard (Investigation Complete)  

---

## 1. Observation

1. **Existing Test Suite Execution**:
   - Command: `npm test` (`vitest run`).
   - Result: 11 test files passed, 340 tests passed in 4.14s.
   - Test files located at:
     - `tests/unit/auth.test.tsx` (11 tests)
     - `tests/unit/slider.test.tsx` (20 tests)
     - `tests/unit/studio.test.tsx` (23 tests)
     - `tests/unit/edge_functions.test.ts` (7 tests)
     - `tests/unit/admin_audit.test.tsx` (16 tests)
     - `tests/unit/quota.test.ts` (10 tests)
     - `tests/e2e/tier1_features.test.ts` (95 tests)
     - `tests/e2e/tier2_boundaries.test.ts` (95 tests)
     - `tests/e2e/tier3_combinations.test.ts` (20 tests)
     - `tests/e2e/tier4_real_world.test.ts` (10 tests)
     - `tests/e2e/tier5_adversarial.test.ts` (30 tests)

2. **Frontend Error Guard & Slider Rendering Logic**:
   - In `src/pages/app/EditorPage.tsx`:
     - Line 85: `const isDone = status === 'done' && !!enhancedUrl && !errorMessage;`
     - Lines 131–139: Error banner `<div data-testid="editor-error-banner">...<p>{errorMessage}</p></div>` renders when `errorMessage` is truthy.
     - Line 144: `{isDone ? ( <div data-testid="editor-result-view"> ... <BeforeAfterSlider ... /> ... ) : ( ... )}` suppresses the result view and BeforeAfterSlider when `isDone` is false.
   - In `src/hooks/useRealtimeEnhancement.ts`:
     - Lines 135–140:
       ```ts
       if (error || data?.error || data?.success === false) {
         setStatus('failed');
         const errMsg = data?.error || error?.message || 'Terjadi kesalahan pada AI processing';
         setErrorMessage(errMsg);
         return { success: false, error: errMsg };
       }
       ```

3. **Kobil LLM Proxy Auth & Header Resolution**:
   - In `supabase/functions/enhance-image/index.ts`:
     - Lines 85–91:
       ```ts
       const response = await fetch(endpoint, {
         method: "POST",
         headers: {
           "Content-Type": "application/json",
           "Authorization": `Bearer ${apiKey}`,
         },
         body: JSON.stringify({ ... }),
       });
       ```
     - Lines 112–115:
       ```ts
       if (!response.ok) {
         const errText = await response.text();
         throw new Error(`Kobil LLM HTTP ${response.status}: ${errText.substring(0, 500)}`);
       }
       ```

4. **Identified Test Coverage Gaps**:
   - `tests/unit/studio.test.tsx` lacks tests asserting that upon receiving HTTP 401 (`Invalid proxy server token` / `token_not_found_in_db`), HTTP 400, or HTTP 500, `queryByTestId('editor-result-view')` and `queryByTestId('before-after-slider')` are strictly `null` and `getByTestId('editor-error-banner')` displays the verbatim raw error.
   - `tests/unit/edge_functions.test.ts` lacks mock fetch tests verifying that `handleEnhanceImage` correctly passes `Authorization: Bearer <key>` to `https://api.koboillm.com/v1/chat/completions` and propagates raw non-200 HTTP error bodies as `Kobil LLM HTTP <status>: <rawText>`.
   - `tests/unit/admin_audit.test.tsx` / `KobilLlmConfigView` lacks tests verifying that admin interactive image generation tests properly suppress the slider on error and render the slider on HTTP 200 success.

---

## 2. Logic Chain

1. **Premise 1 (Observations 1 & 4)**: The current test suite of 340 tests passes, but does not contain unit tests specifically exercising the failure modes of AI enhancement (HTTP 401 token errors, 400 bad request, 500 server error).
2. **Premise 2 (Observation 2)**: In `EditorPage.tsx`, rendering of `BeforeAfterSlider` is gated by `isDone`, which requires `status === 'done'`, `!!enhancedUrl`, and `!errorMessage`. When an error is returned, `errorMessage` is set and `status` is `'failed'`, meaning `isDone` evaluates to `false` and the slider is hidden while `editor-error-banner` is shown.
3. **Premise 3 (Observation 3)**: In `supabase/functions/enhance-image/index.ts`, when upstream Kobil Proxy returns non-200, it reads `errText` and throws `Kobil LLM HTTP ${response.status}: ${errText}`, which is returned in the response body as `{ success: false, status: 'failed', error: error.message }`.
4. **Conclusion from Steps 1–3**: The application code has the structural foundation for strict error guarding and token passing, but automated tests must be added to `tests/unit/studio.test.tsx` and `tests/unit/edge_functions.test.ts` to guarantee regression resistance and full acceptance criteria compliance.

---

## 3. Caveats

- In `KobilLlmConfigView.tsx` (line 155), `generateEnhancedImageDataUrl` was being invoked client-side before checking `error || data?.error`. While line 185 resets `testEnhancedUrl` to `null` if an error exists, implementers should ensure `testEnhancedUrl` is only populated from `data?.enhanced_url` on confirmed HTTP 200 response to prevent any temporary flash of mock image.
- Storage upload mocking in edge function unit tests requires polyfilled `fetch` and global `Response` / `Request` mocks, which are already standard in `tests/setup.ts`.

---

## 4. Conclusion

1. **Codebase Preparedness**:
   - `EditorPage.tsx`, `useRealtimeEnhancement.ts`, and `supabase/functions/enhance-image/index.ts` already implement the required error suppression logic and `Authorization: Bearer <key>` header construction.
2. **Actionable Recommendations for Implementation Phase**:
   - Add targeted test cases to `tests/unit/studio.test.tsx` verifying:
     - HTTP 401 `token_not_found_in_db` suppresses `BeforeAfterSlider` and displays `editor-error-banner` with raw response.
     - HTTP 400 & HTTP 500 error guarding.
     - HTTP 200 success path rendering exact generated output in `BeforeAfterSlider`.
   - Add targeted test cases to `tests/unit/edge_functions.test.ts` verifying:
     - `handleEnhanceImage` passes `Authorization: Bearer <key>` to `https://api.koboillm.com/v1/chat/completions`.
     - Non-200 upstream fetch returns raw error text formatted as `Kobil LLM HTTP <status>: <bodyText>`.
     - Output extraction across multiple JSON response structures.

---

## 5. Verification Method

1. **Run Full Test Suite**:
   ```bash
   npm test
   ```
2. **Run Studio Component Tests Specifically**:
   ```bash
   npx vitest run tests/unit/studio.test.tsx
   ```
3. **Run Edge Function Tests Specifically**:
   ```bash
   npx vitest run tests/unit/edge_functions.test.ts
   ```
4. **Files to Inspect for Verification**:
   - `src/pages/app/EditorPage.tsx` (lines 85, 131–179)
   - `src/hooks/useRealtimeEnhancement.ts` (lines 121–156)
   - `supabase/functions/enhance-image/index.ts` (lines 85–125)
   - `src/components/admin/KobilLlmConfigView.tsx` (lines 131–189)
   - `tests/unit/studio.test.tsx`
   - `tests/unit/edge_functions.test.ts`
5. **Invalidation Conditions**:
   - Any test failure in `npm test`.
   - Any instance where `BeforeAfterSlider` renders when the AI API returns HTTP 401/400/500.
   - Any instance where the active API key is omitted or corrupted in the `Authorization` header.
