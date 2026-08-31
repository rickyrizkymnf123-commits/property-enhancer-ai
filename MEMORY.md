# Project Memory - Property Enhancer AI

## System Architecture & Security Standards

1. **AI Image Enhancement Workflow**:
   - `supabase/functions/enhance-image/index.ts` is the single source of truth for AI image transformations.
   - All manual canvas shapes/gradients have been removed. AI providers receive image input and prompt edit instructions.
   - Supported Providers:
     - `kobil_llm` & `openai_compatible`: Send original image base64 & edit instruction prompt.
     - `gemini_direct`: Google Gemini REST API (`generateContent` with image inlineData + text prompt).
     - `openai`: OpenAI direct `/v1/images/edits` adapter (`multipart/form-data` with PNG blob, prompt, model).
     - `lovable`: Lovable AI Gateway (`google/gemini-2.5-flash-image`).

2. **API Key Encryption & Vault**:
   - API keys are encrypted at rest using PostgreSQL `pgcrypto` RPCs (`encrypt_api_key`, `decrypt_api_key`).
   - Plaintext keys are never stored in localStorage or sent to the client unmasked. Client UI utilizes `MaskedKeyDisplay` component.

3. **Provider Governance**:
   - Single active provider per purpose enforced by unique partial index `one_active_provider_per_purpose` on `api_provider_settings (purpose) WHERE is_active = true`.
   - Query resolution orders by `updated_at DESC` with `.maybeSingle()`.

4. **Testing Standards**:
   - Full Vitest suite covers 369 tests across 12 test files (`npm run test` passes 100%).

5. **Error Guarding & Kobil LLM Proxy Auth (Completed & Adversarially Verified)**:
   - Strict suppression of Before/After slider & fallback result images on any AI HTTP error (401, 400, 403, 500). Raw JSON error displayed prominently in alert card.
   - Clean Bearer token propagation (`Authorization: Bearer <key>`) across KobilLlmConfigView, useRealtimeEnhancement, mockSupabase, and enhance-image edge function.
   - `useRealtimeEnhancement` and `KobilLlmConfigView` strictly clear `enhancedUrl`/`testEnhancedUrl` to null on any error or failed status.
   - `imageKeyToSave` in `KobilLlmConfigView.tsx` guards against masked placeholder strings (`isMaskedKeyString`) to prevent key corruption on save.
   - `enhance-image` edge function queries `api_provider_settings` with `.eq("purpose", "image_generation")`.
   - Comprehensive unit & adversarial test coverage verified across `studio.test.tsx`, `edge_functions.test.ts`, `admin_audit.test.tsx`, and `adversarial_milestone7.test.tsx`.


