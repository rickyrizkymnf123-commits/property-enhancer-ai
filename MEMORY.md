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
   - Full Vitest suite covers 340 tests across 11 files (`npm run test` passes 100%).
