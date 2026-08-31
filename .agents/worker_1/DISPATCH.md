## 2026-08-31T19:01:05+07:00

You are Worker 1 for Property Enhancer AI.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Task Scope & Requirements:
1. Fix AI Studio Image Enhancement Error Handling (R1):
   - In `src/components/admin/KobilLlmConfigView.tsx`:
     - Remove premature invocation of `generateEnhancedImageDataUrl` before `error || data?.error` check in `handleTestAdminImageGeneration`.
     - Only set `testEnhancedUrl` when `!error && !data?.error` using `data?.enhanced_url`.
     - On error, explicitly set `setTestEnhancedUrl(null)`.
     - Render error card with prominent red styling (`bg-red-950/60 border-red-500/50 text-red-200`) detailing raw server HTTP status and JSON response.
   - In `src/hooks/useRealtimeEnhancement.ts`:
     - Call `setEnhancedUrl(null)` on `startEnhancement`, in `error || data?.error` branch, in `catch` block, and in realtime listener when `newRecord.status === 'failed'`.
   - In `src/pages/app/EditorPage.tsx`:
     - Verify strict guard `isDone = status === 'done' && !!enhancedUrl && !errorMessage`.
     - Result view & BeforeAfterSlider strictly suppressed on error.

2. Fix Kobil LLM Proxy Auth & Bearer Token Resolution (R2):
   - In `src/components/admin/KobilLlmConfigView.tsx`:
     - Fix line 418 in `handleSaveConfig`:
       `let imageKeyToSave = rawImageApiKey; if (!isMaskedKeyString(imageApiKeyInput) && imageApiKeyInput.trim() !== '') { imageKeyToSave = imageApiKeyInput.trim(); }`
       Prevent masked placeholder string (`sk-k...1100`) from overwriting real raw API keys.
     - Clean/sanitize API keys: strip any leading `Bearer ` and trim whitespace (`apiKey.replace(/^Bearer\s+/i, '').trim()`).
   - In `supabase/functions/enhance-image/index.ts`:
     - Add `.eq("purpose", "image_generation").eq("is_active", true)` to `api_provider_settings` query.
     - Pass `"Authorization": `Bearer ${cleanApiKey}`` to `${baseUrl}/chat/completions`.
     - Format non-200 responses as `Kobil LLM HTTP ${response.status}: ${errText}` and return in error payload.
   - In `supabase/functions/list-ai-models/index.ts`:
     - Fix domain typo to `https://api.koboillm.com/v1` (with one 'i') and apply `.replace("koboiillm.com", "koboillm.com")`.
   - In `src/lib/mockSupabase.ts`:
     - Match clean Bearer header semantics, error responses, and storage hydration.

3. Tests & Verification:
   - Add unit tests in `tests/unit/studio.test.tsx` and `tests/unit/edge_functions.test.ts` covering:
     - HTTP 401 `token_not_found_in_db` error -> BeforeAfterSlider NOT rendered, raw error banner shown.
     - HTTP 400 & 500 error guarding.
     - HTTP 200 success -> BeforeAfterSlider renders exact generated image.
     - Bearer token header verification in edge functions & proxy calls.
     - Masked key save protection in `KobilLlmConfigView`.
   - Execute `npm run build` and `npm test` (`npx vitest run`) and ensure 100% of tests pass.
   - Write your implementation report to `.agents/worker_1/report.md` and handoff to `.agents/worker_1/handoff.md`.
