# E2E Test Infra: Property Enhancer AI

## Test Philosophy
- **Opaque-Box & Requirement-Driven**: Tests are derived strictly from user requirements (R1–R5, Acceptance Criteria 1–14 in `ORIGINAL_REQUEST.md`) and operate purely through public UI and API boundaries.
- **Methodology**: Category-Partition + Boundary Value Analysis (BVA) + Pairwise Combinatorial Testing + Real-World Workload Testing.

---

## Feature Inventory
| # | Feature | Source | Tier 1 (Coverage) | Tier 2 (Boundary) | Tier 3 (Pairwise) | Tier 4 (Scenario) |
|---|---------|--------|:-----------------:|:-----------------:|:-----------------:|:-----------------:|
| 1 | No Public Self-Registration on /login | R1, AC-1 | 5 | 5 | ✓ | ✓ |
| 2 | Role & Entitlement Redirect Gate | R1, AC-2, AC-3 | 5 | 5 | ✓ | ✓ |
| 3 | Unentitled Toast & SignOut | R1, AC-2 | 5 | 5 | ✓ | ✓ |
| 4 | Password Recovery Flow | R1 | 5 | 5 | ✓ | ✓ |
| 5 | Public Landing Page & Glassmorphism Theme | R2 | 5 | 5 | ✓ | ✓ |
| 6 | Landing Hero Before/After Slider | R2, AC-7 | 5 | 5 | ✓ | ✓ |
| 7 | Features Showcase (Batch marked Segera Hadir) | R2 | 5 | 5 | ✓ | ✓ |
| 8 | Pricing & Testimonials/FAQ (is_active filter) | R2 | 5 | 5 | ✓ | ✓ |
| 9 | Single Photo Upload Validation (JPG/PNG/WEBP) | R3, AC-4 | 5 | 5 | ✓ | ✓ |
| 10 | Realtime Status Transitions (queued->proc->done) | R3, AC-6 | 5 | 5 | ✓ | ✓ |
| 11 | Monthly Quota Tracking & Exhaustion Guard | R3, AC-5 | 5 | 5 | ✓ | ✓ |
| 12 | Editor Slider, Zoom Viewer & Download | R3, AC-7 | 5 | 5 | ✓ | ✓ |
| 13 | Client-Side API Key Masking ("sk-...ab12") | R3, AC-8 | 5 | 5 | ✓ | ✓ |
| 14 | Admin Panel Role Enforcement & Dashboard Embed | R4, AC-9 | 5 | 5 | ✓ | ✓ |
| 15 | Admin User Actions & Mandatory Audit Logging | R4, AC-10 | 5 | 5 | ✓ | ✓ |
| 16 | Admin Notifications (info/warning/critical) | R4, AC-11 | 5 | 5 | ✓ | ✓ |
| 17 | Provision Webhook HMAC Verification | R5, AC-12 | 5 | 5 | ✓ | ✓ |
| 18 | Provision Duplicate Email Rejection | R5, AC-13 | 5 | 5 | ✓ | ✓ |
| 19 | Provision User Account, Quota & WAHA Dispatch | R5, AC-14 | 5 | 5 | ✓ | ✓ |

---

## Test Architecture
- **Test Runner**: Vitest with `@testing-library/react`, `jsdom`, and standalone node test execution.
- **Commands**:
  - Run full test suite: `npm test` or `npx vitest run`
  - Run specific tier: `npx vitest run tests/e2e/tier1_features.test.ts`
- **Pass/Fail Semantics**: All test suites must pass with exit code 0.

---

## Coverage Thresholds
- **Tier 1 (Feature Coverage)**: ≥95 test cases (5 per feature across 19 features)
- **Tier 2 (Boundary & Corner Cases)**: ≥95 test cases (invalid MIME types, oversize images, 0 quota, expired cycle, duplicate emails, invalid HMAC signatures, empty password resets)
- **Tier 3 (Cross-Feature Combinations)**: ≥20 test cases (pairwise interactions: auth + quota, upload + realtime, admin user status change + audit log, provision + instant login)
- **Tier 4 (Real-World Application Scenarios)**: ≥10 full user and administrator end-to-end scenarios.
- **Total Minimum Test Cases**: ≥220 test cases.
