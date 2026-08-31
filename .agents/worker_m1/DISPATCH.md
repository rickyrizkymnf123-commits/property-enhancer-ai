# Milestone 1 Worker Workspace

## 2026-08-31T05:29:23Z
You are Worker 1 for Milestone 1 of Property Enhancer AI.

Working Directory: C:\Users\UC\.gemini\antigravity\scratch\property-enhancer-ai\.agents\worker_m1
Original Request File: C:\Users\UC\.gemini\antigravity\scratch\property-enhancer-ai\ORIGINAL_REQUEST.md
Project Plan & Architecture: C:\Users\UC\.gemini\antigravity\scratch\property-enhancer-ai\PROJECT.md
Backend Explorer Findings: C:\Users\UC\.gemini\antigravity\scratch\property-enhancer-ai\.agents\explorer_survey_backend_3\backend_arch.md
Spec Miner Findings: C:\Users\UC\.gemini\antigravity\scratch\property-enhancer-ai\.agents\spec_miner_survey_1\spec_analysis.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your task:
1. Scaffold project root files if needed (`package.json`, `tsconfig.json`, `vite.config.ts`, `tailwind.config.js`, `postcss.config.js`, etc.) with all required dependencies (@supabase/supabase-js, lucide-react, @radix-ui/react-*, clsx, tailwind-merge, vitest, jsdom, @testing-library/react, @testing-library/jest-dom).
2. Implement all Supabase database migrations under `supabase/migrations/`:
   - `00001_initial_schema.sql`: 6 Enums (`app_role`, `admin_action_type`, `notification_severity`, `image_status`, `entitlement_status`, `provision_status`), 15 tables with full constraints (`profiles`, `user_roles`, `entitlements` with monthly_quota=100 & cycle calculation, `projects`, `images` with realtime enabled & batch_id nullable, `user_api_keys` encrypted, `api_provider_settings`, `api_usage_logs`, `admin_settings`, `admin_notifications`, `pricing_settings`, `testimonials`, `faqs`, `provision_logs`, `admin_audit_logs`).
   - `00002_rls_policies.sql`: Zero-trust RLS policies for every table (public CMS read, user data isolation, admin full access via `has_role`).
   - `00003_functions_triggers.sql`: `has_role` (SECURITY DEFINER), `update_updated_at_column`, `handle_new_user`, `check_and_consume_quota` (SECURITY DEFINER with row locking & 30-day auto cycle rollover), `log_admin_action` (SECURITY DEFINER).
   - `00004_storage_buckets.sql`: Storage bucket `images` (private) + storage RLS policies.
   - `00005_seed_data.sql`: Seed data for pricing, testimonials, FAQs, default system settings.
3. Implement all 3 Supabase Edge Functions under `supabase/functions/`:
   - `enhance-image/index.ts`: Calls `check_and_consume_quota`, inserts `images` record (`queued`), transitions to `processing`, calls AI provider (Lovable AI Gateway google/gemini-2.5-flash-image / OpenAI / Gemini / Replicate), uploads enhanced image to storage, transitions status to `done` or `failed`, logs usage to `api_usage_logs`, dispatches critical alert to `admin_notifications` on failure.
   - `provision/index.ts`: Webhook with HMAC-SHA256 signature verification using `PROVISION_SECRET`. Checks duplicate email returning `rejected_duplicate`. Generates secure random password, creates auth user, creates profile & entitlement (100 quota, 1-month reset date), sends WhatsApp message via WAHA API, logs to `provision_logs`, logs critical alert to `admin_notifications` if WA fails.
   - `admin-users/index.ts`: Handles administrative actions (`list`, `approve`, `reject`, `reset_password`, `delete`, `resend_credential`) with mandatory audit logging via `log_admin_action` / `admin_audit_logs`. Supports `ADMIN_SETUP_SECRET`.
4. Generate TypeScript type definitions in `src/types/database.types.ts`.
5. Create edge function and database unit tests in `tests/unit/edge_functions.test.ts` and `tests/unit/quota.test.ts`.
6. Run `npm install` and run tests. Ensure all code compiles and tests pass.
7. Write your handoff report to `C:\Users\UC\.gemini\antigravity\scratch\property-enhancer-ai\.agents\worker_m1\handoff.md`.
8. Send completion message to parent.
