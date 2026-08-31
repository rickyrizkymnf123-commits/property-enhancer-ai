# Plan — Property Enhancer AI

## Project Overview
Property Enhancer AI is a paid-only, production-grade real estate photo enhancement web platform built with React, Vite, TypeScript, TailwindCSS, Supabase, and AI Gateway integrations.

## Phase Breakdown
### Phase 0: Survey & Specification Mining
- Spawn 3 parallel explorers / spec miners:
  - Spec Miner: Enumerate exact requirements, parameters, tables, columns, RLS rules, edge functions contracts, routes, and error states.
  - Explorer 1 (Frontend & Architecture): Component hierarchy, state management, routing, UI library, Realtime hooks, before/after slider, zoom viewer, theme (dark glassmorphism neon purple/blue).
  - Explorer 2 (Backend, Edge Functions, Security & Testing): Supabase migrations, RLS, Edge Functions (enhance-image, provision, admin-users), HMAC auth, WAHA integration, mock test harness.
- Synthesize into `PROJECT.md` and `TEST_INFRA.md`.

### Phase 1: Dual Track Execution
#### Track A: Implementation Track
- Milestone 1: Database Schema, RLS Policies, Storage Buckets & Supabase Edge Functions (`enhance-image`, `provision`, `admin-users`).
- Milestone 2: Auth & Entitlement Access Control (`/login`, `/forgot-password`, `/reset-password`, `ProtectedRoute`, `useAuth`, toasts).
- Milestone 3: Landing Page & Marketing Navigation (`/`, HeroSection, Before/After Slider, Pricing, Testimonials, FAQs, Footer).
- Milestone 4: User Dashboard & AI Enhancement Studio (`/app`, `/app/editor`, `/app/gallery`, `/app/projects`, `/app/settings`, Supabase Realtime).
- Milestone 5: Admin Management Panel & Audit Logging (`/admin`, User Management, API Provider Switch, System API Keys, API Usage Logs, Notifications, Audit Logs, Settings CMS).
- Milestone 6: Final Integration, 100% E2E Pass & Adversarial Hardening.

#### Track B: E2E Testing Track
- Test infrastructure design and execution runner.
- Tier 1: Feature Coverage (≥5 per feature).
- Tier 2: Boundary & Corner Cases (≥5 per feature).
- Tier 3: Cross-Feature Combinations (Pairwise).
- Tier 4: Real-World Application Scenarios.
- Publish `TEST_READY.md`.

### Phase 2: Final Verification & Sentinel Handoff
- 100% E2E tests pass.
- Tier 5 Adversarial Coverage Hardening with Challenger.
- Final Forensic Integrity Audit.
- Soft/Hard handoff report to Sentinel for Victory Audit.
