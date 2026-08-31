# Milestone 7 Review & Adversarial Stress-Test Report

**Project**: Property Enhancer AI  
**Scope**: Milestone 7 — AI Studio Error Handling & Kobil LLM Proxy Auth Integration (R1 & R2)  
**Reviewer**: Reviewer 2 (Roles: Reviewer, Adversarial Critic)  
**Date**: 2026-08-31T19:12:00+07:00  
**Verdict**: **`APPROVE`**

---

## 1. Executive Summary

Milestone 7 addresses two critical functional and reliability requirements:
1. **R1: Strict Error Guard & Result View Suppression**: When the AI Provider API (Kobil LLM Proxy / Edge Function) returns an HTTP error (such as HTTP 401 Invalid proxy server token, HTTP 400 Bad Request, or HTTP 500 Server Error), the application must strictly suppress and conceal the Before/After slider and result view, displaying only the prominent error card showing the raw server HTTP response.
2. **R2: Kobil LLM Proxy API Key & Token Credentials Resolution**: Clean and robust handling of API Key resolution, stripping leading `Bearer` prefixes to prevent token duplication, and preventing masked placeholders (`••••`, `...`) from overwriting valid stored vault keys.

All 352 unit, E2E, and edge function tests passed with 100% success rate across 11 test suites (`npx vitest run`). The production TypeScript build (`npm run build`) completed cleanly with zero type or bundling errors.

No integrity violations, facade shortcuts, or dummy implementations were detected.

---

## 2. Quality & Conformance Review

### 2.1 Requirement R1: Strict Error Guard & Result View Suppression

- **`src/hooks/useRealtimeEnhancement.ts`**:
  - `startEnhancement()` sets `status = 'processing'`, `errorMessage = null`, and `enhancedUrl = null` on initiation.
  - If the Edge Function response indicates an error or HTTP non-200, state transitions to `status = 'failed'`, `setEnhancedUrl(null)`, and `setErrorMessage(errMsg)`.
  - Supabase Realtime event listeners for `images` table changes similarly enforce `if (newRecord.status === 'failed') setEnhancedUrl(null)`.
  - Sequential execution safety: verified that when an enhancement fails following a previous successful enhancement, `enhancedUrl` is immediately reset to `null` (verified via Unit Test 8.5).

- **`src/pages/app/EditorPage.tsx`**:
  - Guard logic: `const isDone = status === 'done' && !!enhancedUrl && !errorMessage;`
  - When `isDone` is false during an error condition, the entire `editor-result-view` (and child `BeforeAfterSlider`) is unmounted and excluded from the DOM.
  - The raw error is rendered in a dedicated error card: `data-testid="editor-error-banner"`, preserving monospace formatting and word-wrapping for raw JSON payloads.

- **`src/components/admin/KobilLlmConfigView.tsx`**:
  - Admin AI Studio test panel (`handleTestAdminImageGeneration`) clears previous result URLs on error and renders `data-testid="admin-image-test-error-banner"`.
  - `BeforeAfterSlider` is conditionally rendered only if `testEnhancedUrl` is non-null.

### 2.2 Requirement R2: Kobil LLM Proxy Auth Integration

- **`supabase/functions/enhance-image/index.ts`**:
  - Fetches active provider settings for `purpose = 'image_generation'` (fallback to `provider_name = 'kobil_llm'`).
  - Resolves encrypted or plain keys, strips leading `Bearer` tokens via `apiKey.replace(/^Bearer\s+/i, '').trim()`.
  - Passes clean `Authorization: Bearer <key>` header to `${baseUrl}/chat/completions`.
  - Captures raw HTTP non-200 responses and surfaces them via `Kobil LLM HTTP ${response.status}: ${errText.substring(0, 500)}`.

- **`supabase/functions/list-ai-models/index.ts` & `supabase/functions/ai-chat/index.ts`**:
  - Consistent token resolution, domain normalization (`koboiillm.com` -> `koboillm.com`), and Bearer prefix stripping.

- **`src/lib/mockSupabase.ts`**:
  - High-fidelity mock alignment with production edge functions, supporting live proxy forwarding in browser environments and deterministic simulation in Vitest runner.

---

## 3. Adversarial Review & Stress-Testing

| # | Challenge Dimension | Attack Scenario / Edge Case | Observed System Behavior | Risk Level | Mitigation Status |
|---|---|---|---|---|---|
| 1 | **State Pollution / Success Leaks** | Photo 1 succeeds (slider active). User immediately uploads Photo 2, which triggers HTTP 401. | State hook immediately clears `enhancedUrl` to `null` and sets `status = 'failed'`. `isDone` evaluates to `false`. Slider unmounts instantly. | High | **RESOLVED** (Unit Test 8.5) |
| 2 | **Token Prefix Duplication** | Admin enters `Bearer sk-...` in the input field or settings DB contains `Bearer ` prefix. | Functions regex-strip `^Bearer\s+` prior to attaching `Bearer ${key}`, preventing `Bearer Bearer` syntax errors. | High | **RESOLVED** (Unit Test 6 in `edge_functions.test.ts`) |
| 3 | **Mask Overwrite Vulnerability** | Admin loads settings with masked key `sk-...cdef`, edits model dropdown, and saves. | `isMaskedKeyString()` detects mask format and retains original `rawApiKey` during storage and DB sync. | Critical | **RESOLVED** (Unit Test 8.3 in `admin_audit.test.tsx`) |
| 4 | **Malformed Server Response Body** | AI Proxy returns unexpected HTML/JSON or huge error trace (e.g. 500 Internal Gateway Error). | Error text is bounded to 500 characters, wrapped in React text nodes with `break-words` and `whitespace-pre-wrap`, preventing XSS and UI layout breakage. | Medium | **RESOLVED** |
| 5 | **Missing Key or Empty Config** | Database row for `api_provider_settings` has empty key or inactive rows. | Fallback query to active `kobil_llm` setting, explicit validation throwing informative error without unhandled promise rejections. | Medium | **RESOLVED** |

---

## 4. Verification Evidence

### 4.1 Vitest Suite Execution
```text
Test Files  11 passed (11)
     Tests  352 passed (352)
  Duration  4.96s
```
Specific Milestone 7 Test Domains verified:
- `tests/unit/studio.test.tsx`:
  - 8.1: HTTP 401 `token_not_found_in_db` strict suppression of BeforeAfterSlider & raw error card verification (PASS)
  - 8.2: HTTP 400 Bad Request strict suppression of BeforeAfterSlider & raw error card verification (PASS)
  - 8.3: HTTP 500 Server Error strict suppression of BeforeAfterSlider & raw error card verification (PASS)
  - 8.4: HTTP 200 valid generation renders exact BeforeAfterSlider image (PASS)
  - 8.5: `useRealtimeEnhancement` clears `enhancedUrl` to `null` on failed run following success (PASS)
- `tests/unit/admin_audit.test.tsx`:
  - 8.1: Admin AI Studio test HTTP 401 error card display and slider suppression (PASS)
  - 8.2: Admin AI Studio test HTTP 200 slider rendering (PASS)
  - 8.3: Masked placeholder key overwrite prevention during config save (PASS)
- `tests/unit/edge_functions.test.ts`:
  - 3: Clean Bearer token propagation and HTTP 200 enhanced_url return (PASS)
  - 4: Raw server response propagation on HTTP 401 `token_not_found_in_db` (PASS)
  - 5: Raw error propagation on HTTP 400 and HTTP 500 (PASS)
  - 6: Leading Bearer prefix stripping (PASS)

### 4.2 Production Build Verification
```text
> tsc && vite build
✓ 1677 modules transformed.
dist/index.html                   0.96 kB │ gzip:   0.54 kB
dist/assets/index-Dr8O0gxp.css   73.82 kB │ gzip:  11.17 kB
dist/assets/index-DpMK1KsN.js   542.93 kB │ gzip: 138.17 kB
✓ built in 2.42s
```

---

## 5. Final Recommendation

**Verdict**: **`APPROVE`**  
Milestone 7 meets all requirements and acceptance criteria in `ORIGINAL_REQUEST.md` and `PROJECT.md` with complete fidelity, robustness against edge cases, and zero integrity violations.
