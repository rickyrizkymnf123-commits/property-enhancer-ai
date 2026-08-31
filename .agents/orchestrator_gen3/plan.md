# Plan — AI Studio Error Handling & Kobil LLM Proxy Auth Integration

## Objectives
1. Fix AI Studio Image Enhancement Error Handling (R1):
   - When AI Provider API (Kobil LLM Proxy / Edge Function) returns HTTP error (401, 400, 500, etc.), suppress "SESUDAH (AI)" slider and any fallback image.
   - Render a prominent error alert card/toast detailing HTTP status and raw server JSON response.
2. Fix Kobil LLM Proxy Auth Integration (R2):
   - Ensure KobilLlmConfigView.tsx, useRealtimeEnhancement.ts, mockSupabase.ts, and supabase/functions/enhance-image/index.ts correctly pass the active API Key in `Authorization: Bearer <key>` header to `https://api.koboillm.com/v1/chat/completions`.
3. Test Verification:
   - Ensure all Vitest tests pass 100%, covering error guarding and valid AI generation workflow.
4. Independent Reviews & Forensic Integrity Audit:
   - 2 Reviewers, 2 Challengers, 1 Forensic Auditor.
   - Pass Gate criteria.

## Steps
1. Phase 1: Survey & Codebase Investigation (Spawn 3 Explorers in parallel)
2. Phase 2: Worker Dispatch to implement R1 & R2 fixes and update test suites
3. Phase 3: Reviewers (2), Challengers (2), and Auditor (1) Dispatch
4. Phase 4: Gate Evaluation & Verification of Vitest suite (100% pass)
5. Phase 5: Handoff & Completion Report to Parent
