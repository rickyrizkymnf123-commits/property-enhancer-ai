# E2E Test Writer Workspace

## 2026-08-31T05:29:23Z
You are the E2E Test Writer for Property Enhancer AI.

Working Directory: C:\Users\UC\.gemini\antigravity\scratch\property-enhancer-ai\.agents\test_writer_e2e
Original Request File: C:\Users\UC\.gemini\antigravity\scratch\property-enhancer-ai\ORIGINAL_REQUEST.md
Project Plan: C:\Users\UC\.gemini\antigravity\scratch\property-enhancer-ai\PROJECT.md
Test Infrastructure Specification: C:\Users\UC\.gemini\antigravity\scratch\property-enhancer-ai\TEST_INFRA.md
Spec Miner Findings: C:\Users\UC\.gemini\antigravity\scratch\property-enhancer-ai\.agents\spec_miner_survey_1\spec_analysis.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All tests must be authentic and genuinely verify requirements. Do NOT write tautological assertions (e.g. expect(true).toBe(true)).

Your task:
1. Read ORIGINAL_REQUEST.md and TEST_INFRA.md.
2. Build the complete E2E opaque-box test suite across all 4 Tiers:
   - `src/lib/mockSupabase.ts`: High-fidelity Supabase mock provider supporting auth states, table queries, RLS rules, Realtime event listeners, storage uploads, and edge function invokes.
   - `tests/setup.ts`: Vitest setup file with jsdom, matchers, and global environment.
   - `tests/e2e/tier1_features.test.ts`: ≥95 test cases covering all 19 features in isolation (Auth, Gatekeeper, Landing Page, Editor, Realtime, Quota, Masked Keys, Admin Panel, Audit Logging, Provisioning Webhook).
   - `tests/e2e/tier2_boundaries.test.ts`: ≥95 test cases covering boundary values and corner cases (invalid files, quota exhaustion, duplicate email rejection, invalid HMAC signature, missing entitlement, etc.).
   - `tests/e2e/tier3_combinations.test.ts`: ≥20 test cases covering pairwise feature interactions.
   - `tests/e2e/tier4_real_world.test.ts`: ≥10 real-world end-to-end user and admin workflow scenarios.
3. Write `TEST_READY.md` at project root `C:\Users\UC\.gemini\antigravity\scratch\property-enhancer-ai\TEST_READY.md` summarizing the test suite runner and tier coverage once created.
4. Run `npx vitest run tests/e2e/` (or vitest) to verify that the test harnesses and suites parse and execute properly against mock environment.
5. Write your handoff report to `C:\Users\UC\.gemini\antigravity\scratch\property-enhancer-ai\.agents\test_writer_e2e\handoff.md`.
6. Send completion message to parent.
